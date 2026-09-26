"""
Core business logic for operation validation.
Handles stock mutations, status transitions, and move_history writes.
All mutations run inside the calling DB transaction.
"""
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.operation import Operation, OperationLine, OperationType, OperationStatus
from app.models.stock import Stock
from app.models.move_history import MoveHistory, MoveDirection


async def _get_or_create_stock(
    db: AsyncSession, product_id: uuid.UUID, location_id: uuid.UUID
) -> Stock:
    """Get or create a stock row, with SELECT FOR UPDATE to prevent race conditions."""
    result = await db.execute(
        select(Stock)
        .where(Stock.product_id == product_id, Stock.location_id == location_id)
        .with_for_update()
    )
    stock = result.scalar_one_or_none()
    if not stock:
        stock = Stock(product_id=product_id, location_id=location_id)
        db.add(stock)
        await db.flush()
    return stock


def _write_history(
    operation: Operation,
    line: OperationLine,
    direction: MoveDirection,
    quantity: float,
) -> MoveHistory:
    return MoveHistory(
        operation_id=operation.id,
        reference=operation.reference,
        product_id=line.product_id,
        from_location_id=operation.from_location_id,
        to_location_id=operation.to_location_id,
        quantity=quantity,
        direction=direction,
        date=datetime.now(timezone.utc),
        contact=operation.contact,
    )


async def validate_receipt(db: AsyncSession, operation: Operation) -> None:
    """IN: increase on_hand at to_location."""
    for line in operation.lines:
        stock = await _get_or_create_stock(db, line.product_id, operation.to_location_id)
        stock.on_hand = float(stock.on_hand) + float(line.quantity)
        line.done_quantity = line.quantity
        db.add(_write_history(operation, line, MoveDirection.IN, float(line.quantity)))
    await db.flush()


async def validate_delivery(db: AsyncSession, operation: Operation) -> None:
    """OUT: decrease on_hand at from_location. Raises if insufficient stock."""
    for line in operation.lines:
        stock = await _get_or_create_stock(db, line.product_id, operation.from_location_id)
        if stock.free_to_use < float(line.quantity):
            raise ValueError(
                f"Insufficient stock for product {line.product_id}. "
                f"Available: {stock.free_to_use}, Requested: {line.quantity}"
            )
        stock.on_hand = float(stock.on_hand) - float(line.quantity)
        line.done_quantity = line.quantity
        db.add(_write_history(operation, line, MoveDirection.OUT, float(line.quantity)))
    await db.flush()


async def validate_transfer(db: AsyncSession, operation: Operation) -> None:
    """TRANSFER: subtract from source, add to destination. Net stock unchanged."""
    for line in operation.lines:
        src = await _get_or_create_stock(db, line.product_id, operation.from_location_id)
        if src.free_to_use < float(line.quantity):
            raise ValueError(
                f"Insufficient stock at source for product {line.product_id}. "
                f"Available: {src.free_to_use}"
            )
        src.on_hand = float(src.on_hand) - float(line.quantity)

        dst = await _get_or_create_stock(db, line.product_id, operation.to_location_id)
        dst.on_hand = float(dst.on_hand) + float(line.quantity)

        line.done_quantity = line.quantity
        # Log OUT from source
        db.add(_write_history(operation, line, MoveDirection.OUT, float(line.quantity)))
    await db.flush()


async def validate_adjustment(db: AsyncSession, operation: Operation) -> None:
    """ADJUSTMENT: set on_hand to counted quantity; log delta."""
    for line in operation.lines:
        stock = await _get_or_create_stock(db, line.product_id, operation.to_location_id or operation.from_location_id)
        old_qty = float(stock.on_hand)
        new_qty = float(line.quantity)
        delta = new_qty - old_qty

        stock.on_hand = new_qty
        line.done_quantity = new_qty

        direction = MoveDirection.IN if delta >= 0 else MoveDirection.OUT
        history = MoveHistory(
            operation_id=operation.id,
            reference=operation.reference,
            product_id=line.product_id,
            from_location_id=operation.from_location_id,
            to_location_id=operation.to_location_id,
            quantity=abs(delta),
            direction=direction,
            date=datetime.now(timezone.utc),
            contact=operation.contact,
        )
        db.add(history)
    await db.flush()


async def check_delivery_stock(db: AsyncSession, operation: Operation) -> OperationStatus:
    """
    Determine if a delivery should be 'ready' or 'waiting'.
    Called after creating/updating a delivery.
    """
    for line in operation.lines:
        result = await db.execute(
            select(Stock).where(
                Stock.product_id == line.product_id,
                Stock.location_id == operation.from_location_id,
            )
        )
        stock = result.scalar_one_or_none()
        if not stock or stock.free_to_use < float(line.quantity):
            return OperationStatus.waiting
    return OperationStatus.ready
