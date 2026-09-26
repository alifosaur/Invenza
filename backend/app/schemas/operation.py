import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.models.operation import OperationType, OperationStatus
from app.schemas.product import ProductOut


class OperationLineCreate(BaseModel):
    product_id: uuid.UUID
    quantity: float

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class OperationLineOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: float
    done_quantity: float
    product: Optional[ProductOut] = None

    model_config = {"from_attributes": True}


class OperationCreate(BaseModel):
    type: OperationType
    warehouse_id: uuid.UUID
    from_location_id: Optional[uuid.UUID] = None
    to_location_id: Optional[uuid.UUID] = None
    contact: Optional[str] = None
    schedule_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[OperationLineCreate]


class OperationUpdate(BaseModel):
    from_location_id: Optional[uuid.UUID] = None
    to_location_id: Optional[uuid.UUID] = None
    contact: Optional[str] = None
    schedule_date: Optional[date] = None
    notes: Optional[str] = None
    lines: Optional[List[OperationLineCreate]] = None


class OperationOut(BaseModel):
    id: uuid.UUID
    reference: str
    type: OperationType
    warehouse_id: Optional[uuid.UUID] = None
    from_location_id: Optional[uuid.UUID] = None
    to_location_id: Optional[uuid.UUID] = None
    contact: Optional[str] = None
    schedule_date: Optional[date] = None
    responsible_user_id: Optional[uuid.UUID] = None
    status: OperationStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[OperationLineOut] = []

    model_config = {"from_attributes": True}


class OperationListItem(BaseModel):
    id: uuid.UUID
    reference: str
    type: OperationType
    contact: Optional[str] = None
    schedule_date: Optional[date] = None
    status: OperationStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedOperations(BaseModel):
    items: List[OperationListItem]
    total: int
    page: int
    page_size: int
