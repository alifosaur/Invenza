from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.warehouse import Warehouse, Location
from app.schemas.warehouse import (
    WarehouseCreate, WarehouseUpdate, WarehouseOut,
    LocationCreate, LocationUpdate, LocationOut,
)
from app.api.deps import get_current_user, require_manager
from app.models.user import User

router = APIRouter(tags=["warehouses"])


# ── Warehouses ─────────────────────────────────────────────────────────────

@router.get("/warehouses", response_model=List[WarehouseOut])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Warehouse))
    return result.scalars().all()


@router.post("/warehouses", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    payload: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    wh = Warehouse(**payload.model_dump())
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return wh


@router.get("/warehouses/{warehouse_id}", response_model=WarehouseOut)
async def get_warehouse(
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseOut)
async def update_warehouse(
    warehouse_id: str,
    payload: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(wh, field, value)
    await db.flush()
    await db.refresh(wh)
    return wh


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    await db.delete(wh)


# ── Locations ──────────────────────────────────────────────────────────────

@router.get("/locations", response_model=List[LocationOut])
async def list_locations(
    warehouse_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Location)
    if warehouse_id:
        query = query.where(Location.warehouse_id == warehouse_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    loc = Location(**payload.model_dump())
    db.add(loc)
    await db.flush()
    await db.refresh(loc)
    return loc


@router.put("/locations/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: str,
    payload: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(loc, field, value)
    await db.flush()
    await db.refresh(loc)
    return loc


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.delete(loc)
