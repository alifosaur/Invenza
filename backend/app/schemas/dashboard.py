import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.move_history import MoveDirection


class MoveHistoryOut(BaseModel):
    id: uuid.UUID
    operation_id: Optional[uuid.UUID] = None
    reference: str
    product_id: Optional[uuid.UUID] = None
    from_location_id: Optional[uuid.UUID] = None
    to_location_id: Optional[uuid.UUID] = None
    quantity: float
    direction: MoveDirection
    date: datetime
    contact: Optional[str] = None

    # Nested names for display
    product_name: Optional[str] = None
    from_location_name: Optional[str] = None
    to_location_name: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedMoveHistory(BaseModel):
    items: list[MoveHistoryOut]
    total: int
    page: int
    page_size: int


class DashboardKPIs(BaseModel):
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    pending_receipts: int
    pending_deliveries: int
    scheduled_transfers: int
    late_receipts: int
    late_deliveries: int


class DashboardSummary(BaseModel):
    type: str  # "receipt" | "delivery"
    to_process: int
    late: int
    total: int
