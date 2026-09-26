import uuid
from typing import Optional
from pydantic import BaseModel
from app.schemas.product import ProductOut
from app.schemas.warehouse import LocationOut


class StockOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    location_id: uuid.UUID
    per_unit_cost: float
    on_hand: float
    reserved: float
    free_to_use: float
    product: Optional[ProductOut] = None
    location: Optional[LocationOut] = None

    model_config = {"from_attributes": True}


class StockAdjust(BaseModel):
    counted_quantity: float
    per_unit_cost: Optional[float] = None
