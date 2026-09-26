import uuid
from typing import Optional
from pydantic import BaseModel


# ── Warehouse ──────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    name: str
    short_code: str
    address: Optional[str] = None


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
    address: Optional[str] = None


class WarehouseOut(BaseModel):
    id: uuid.UUID
    name: str
    short_code: str
    address: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Location ───────────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    short_code: str
    warehouse_id: uuid.UUID


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
    warehouse_id: Optional[uuid.UUID] = None


class LocationOut(BaseModel):
    id: uuid.UUID
    name: str
    short_code: str
    warehouse_id: uuid.UUID
    warehouse: Optional[WarehouseOut] = None

    model_config = {"from_attributes": True}
