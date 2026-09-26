from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.operation import Operation, OperationLine, OperationType, OperationStatus
from app.models.stock import Stock
from app.schemas.operation import (
    OperationCreate, OperationUpdate, OperationOut,
    OperationListItem, PaginatedOperations,
)
from app.schemas.dashboard import DashboardKPIs, DashboardSummary
from app.api.deps import get_current_user
from app.models.user import User
from app.services.inventory import (
    validate_receipt, validate_delivery, validate_transfer,
    validate_adjustment, check_delivery_stock,
)
from app.services.websocket import ws_manager

router = APIRouter(tags=["operations"])


def _build_reference(wh_code: str, op_type: OperationType, sequence: int) -> str:
    type_map = {
        OperationType.IN: "IN",
        OperationType.OUT: "OUT",
        OperationType.TRANSFER: "TRF",
        OperationType.ADJUSTMENT: "ADJ",
    }
    return f"{wh_code}/{type_map[op_type]}/{sequence:05d}"


# ── List operations ────────────────────────────────────────────────────────

@router.get("/operations", response_model=PaginatedOperations)
async def list_operations(
    type: Optional[OperationType] = None,
    status: Optional[OperationStatus] = None,
    search: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Operation).options(
        selectinload(Operation.from_location),
        selectinload(Operation.to_location),
        selectinload(Operation.lines).selectinload(OperationLine.product)
    )
    if type:
        query = query.where(Operation.type == type)
    if status:
        query = query.where(Operation.status == status)
    if search:
        query = query.where(
            Operation.reference.ilike(f"%{search}%") | Operation.contact.ilike(f"%{search}%")
        )
    if warehouse_id:
        query = query.where(Operation.warehouse_id == warehouse_id)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.order_by(Operation.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedOperations(
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Create operation ───────────────────────────────────────────────────────

@router.post("/operations", response_model=OperationOut, status_code=201)
async def create_operation(
    payload: OperationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get warehouse short code for reference
    from app.models.warehouse import Warehouse
    wh_result = await db.execute(select(Warehouse).where(Warehouse.id == payload.warehouse_id))
    wh = wh_result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    # Auto-increment sequence per warehouse+type
    seq_result = await db.execute(
        select(func.count(Operation.id)).where(
            Operation.warehouse_id == payload.warehouse_id,
            Operation.type == payload.type,
        )
    )
    sequence = (seq_result.scalar_one() or 0) + 1

    reference = _build_reference(wh.short_code, payload.type, sequence)

    operation = Operation(
        reference=reference,
        type=payload.type,
        warehouse_id=payload.warehouse_id,
        from_location_id=payload.from_location_id,
        to_location_id=payload.to_location_id,
        contact=payload.contact,
        schedule_date=payload.schedule_date,
        responsible_user_id=current_user.id,
        notes=payload.notes,
        sequence_number=sequence,
        status=OperationStatus.draft,
    )
    db.add(operation)
    await db.flush()

    for line_data in payload.lines:
        line = OperationLine(
            operation_id=operation.id,
            product_id=line_data.product_id,
            quantity=line_data.quantity,
        )
        db.add(line)

    await db.flush()

    # Auto-check delivery status
    if payload.type == OperationType.OUT:
        new_status = await check_delivery_stock(db, operation)
        operation.status = new_status
        await db.flush()

    elif payload.type in (OperationType.IN, OperationType.TRANSFER, OperationType.ADJUSTMENT):
        operation.status = OperationStatus.ready

    await db.refresh(operation)
    return operation


# ── Get single operation ───────────────────────────────────────────────────

@router.get("/operations/{operation_id}", response_model=OperationOut)
async def get_operation(
    operation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Operation)
        .options(selectinload(Operation.lines).selectinload(OperationLine.product))
        .where(Operation.id == operation_id)
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    return op


# ── Update operation ───────────────────────────────────────────────────────

@router.put("/operations/{operation_id}", response_model=OperationOut)
async def update_operation(
    operation_id: str,
    payload: OperationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Operation).options(selectinload(Operation.lines)).where(Operation.id == operation_id)
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.done:
        raise HTTPException(status_code=409, detail="Cannot modify a completed operation")

    for field, value in payload.model_dump(exclude_none=True, exclude={"lines"}).items():
        setattr(op, field, value)

    if payload.lines is not None:
        # Replace lines
        for line in op.lines:
            await db.delete(line)
        await db.flush()
        for line_data in payload.lines:
            db.add(OperationLine(
                operation_id=op.id,
                product_id=line_data.product_id,
                quantity=line_data.quantity,
            ))

    await db.flush()

    if op.type == OperationType.OUT:
        op.status = await check_delivery_stock(db, op)

    await db.refresh(op)
    return op


# ── Validate operation ─────────────────────────────────────────────────────

@router.post("/operations/{operation_id}/validate", response_model=OperationOut)
async def validate_operation(
    operation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Operation)
        .options(selectinload(Operation.lines))
        .where(Operation.id == operation_id)
        .with_for_update()
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.done:
        raise HTTPException(status_code=409, detail="Operation already validated")
    if op.status == OperationStatus.canceled:
        raise HTTPException(status_code=409, detail="Cannot validate a canceled operation")

    try:
        if op.type == OperationType.IN:
            await validate_receipt(db, op)
        elif op.type == OperationType.OUT:
            await validate_delivery(db, op)
        elif op.type == OperationType.TRANSFER:
            await validate_transfer(db, op)
        elif op.type == OperationType.ADJUSTMENT:
            await validate_adjustment(db, op)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    op.status = OperationStatus.done
    await db.flush()
    await db.refresh(op)

    # Broadcast KPI update via WebSocket
    await ws_manager.broadcast({"event": "operation_validated", "operation_id": str(op.id)})

    return op


# ── Cancel operation ───────────────────────────────────────────────────────

@router.post("/operations/{operation_id}/cancel", response_model=OperationOut)
async def cancel_operation(
    operation_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Operation).where(Operation.id == operation_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.done:
        raise HTTPException(status_code=409, detail="Cannot cancel a completed operation")

    op.status = OperationStatus.canceled
    await db.flush()
    await db.refresh(op)
    return op


# ── Stock routes ───────────────────────────────────────────────────────────

@router.get("/stock")
async def list_stock(
    location_id: Optional[str] = None,
    product_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.product import Product
    from app.models.warehouse import Location

    query = select(Stock).options(
        selectinload(Stock.product).selectinload(Product.category),
        selectinload(Stock.location).selectinload(Location.warehouse),
    )
    if location_id:
        query = query.where(Stock.location_id == location_id)
    if product_id:
        query = query.where(Stock.product_id == product_id)
    result = await db.execute(query)
    stocks = result.scalars().all()

    # Build response with free_to_use
    return [
        {
            "id": str(s.id),
            "product_id": str(s.product_id),
            "location_id": str(s.location_id),
            "on_hand": float(s.on_hand),
            "reserved": float(s.reserved),
            "free_to_use": s.free_to_use,
            "per_unit_cost": float(s.per_unit_cost),
            "product": {"id": str(s.product.id), "name": s.product.name, "sku": s.product.sku, "uom": s.product.uom} if s.product else None,
            "location": {"id": str(s.location.id), "name": s.location.name} if s.location else None,
        }
        for s in stocks
    ]


@router.put("/stock/{stock_id}")
async def update_stock(
    stock_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Stock).where(Stock.id == stock_id))
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    if "on_hand" in payload:
        stock.on_hand = float(payload["on_hand"])
    if "per_unit_cost" in payload:
        stock.per_unit_cost = float(payload["per_unit_cost"])

    await db.flush()
    return {"status": "success", "on_hand": float(stock.on_hand), "per_unit_cost": float(stock.per_unit_cost)}


# ── Move history ───────────────────────────────────────────────────────────

@router.get("/move-history")
async def get_move_history(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.move_history import MoveHistory
    from app.models.product import Product
    from app.models.warehouse import Location

    query = select(MoveHistory).options(
        selectinload(MoveHistory.product),
        selectinload(MoveHistory.from_location),
        selectinload(MoveHistory.to_location),
    )
    if search:
        query = query.where(MoveHistory.reference.ilike(f"%{search}%"))

    total_q = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_q.scalar_one()

    query = query.order_by(MoveHistory.date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return {
        "items": [
            {
                "id": str(h.id),
                "reference": h.reference,
                "product_name": h.product.name if h.product else None,
                "from_location_name": h.from_location.name if h.from_location else None,
                "to_location_name": h.to_location.name if h.to_location else None,
                "quantity": float(h.quantity),
                "direction": h.direction,
                "date": h.date.isoformat(),
                "contact": h.contact,
            }
            for h in entries
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.product import Product
    from datetime import date

    total_products = (await db.execute(select(func.count(Product.id)))).scalar_one()

    # Low/out of stock: products where sum(on_hand) <= reorder_threshold
    low_stock = await db.execute(
        select(func.count(func.distinct(Stock.product_id))).where(
            Stock.on_hand <= 0
        )
    )
    out_of_stock = low_stock.scalar_one()

    low_stock_q = await db.execute(
        select(func.count(func.distinct(Stock.product_id))).where(
            Stock.on_hand > 0
        ).join(Product, Product.id == Stock.product_id).where(
            Product.reorder_threshold != None,
            Stock.on_hand <= Product.reorder_threshold,
        )
    )
    low_stock_count = low_stock_q.scalar_one()

    pending_receipts = (
        await db.execute(
            select(func.count(Operation.id)).where(
                Operation.type == OperationType.IN,
                Operation.status.in_([OperationStatus.draft, OperationStatus.ready]),
            )
        )
    ).scalar_one()

    pending_deliveries = (
        await db.execute(
            select(func.count(Operation.id)).where(
                Operation.type == OperationType.OUT,
                Operation.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready]),
            )
        )
    ).scalar_one()

    scheduled_transfers = (
        await db.execute(
            select(func.count(Operation.id)).where(
                Operation.type == OperationType.TRANSFER,
                Operation.status != OperationStatus.done,
                Operation.status != OperationStatus.canceled,
            )
        )
    ).scalar_one()

    today = date.today()
    late_receipts = (
        await db.execute(
            select(func.count(Operation.id)).where(
                Operation.type == OperationType.IN,
                Operation.schedule_date < today,
                Operation.status.in_([OperationStatus.draft, OperationStatus.ready]),
            )
        )
    ).scalar_one()

    late_deliveries = (
        await db.execute(
            select(func.count(Operation.id)).where(
                Operation.type == OperationType.OUT,
                Operation.schedule_date < today,
                Operation.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready]),
            )
        )
    ).scalar_one()

    return DashboardKPIs(
        total_products=total_products,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock,
        pending_receipts=pending_receipts,
        pending_deliveries=pending_deliveries,
        scheduled_transfers=scheduled_transfers,
        late_receipts=late_receipts,
        late_deliveries=late_deliveries,
    )
