import uuid
from typing import Optional
from pydantic import BaseModel, field_validator


# ── Category ───────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# ── Product ────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    sku: str
    category_id: Optional[uuid.UUID] = None
    uom: str = "pcs"
    reorder_threshold: Optional[float] = None
    initial_stock: Optional[float] = None
    initial_location_id: Optional[uuid.UUID] = None
    per_unit_cost: Optional[float] = 0.0

    @field_validator("sku")
    @classmethod
    def sku_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("SKU cannot be empty")
        return v.strip().upper()


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    uom: Optional[str] = None
    reorder_threshold: Optional[float] = None


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    sku: str
    uom: str
    reorder_threshold: Optional[float] = None
    current_stock: float = 0.0
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}
