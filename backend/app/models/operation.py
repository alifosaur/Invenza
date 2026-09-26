import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, Enum, ForeignKey, DateTime, Date, Integer, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class OperationType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


class OperationStatus(str, enum.Enum):
    draft = "draft"
    waiting = "waiting"
    ready = "ready"
    done = "done"
    canceled = "canceled"


class Operation(Base):
    __tablename__ = "operations"
    __table_args__ = (
        Index("ix_operations_reference", "reference"),
        Index("ix_operations_status", "status"),
        Index("ix_operations_type", "type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    type: Mapped[OperationType] = mapped_column(Enum(OperationType), nullable=False)
    from_location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    to_location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True
    )
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    schedule_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    responsible_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[OperationStatus] = mapped_column(
        Enum(OperationStatus), nullable=False, default=OperationStatus.draft
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    lines: Mapped[list["OperationLine"]] = relationship(
        "OperationLine", back_populates="operation", cascade="all, delete-orphan"
    )
    from_location: Mapped["Location"] = relationship("Location", foreign_keys=[from_location_id])
    to_location: Mapped["Location"] = relationship("Location", foreign_keys=[to_location_id])
    responsible_user: Mapped["User"] = relationship("User")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")


class OperationLine(Base):
    __tablename__ = "operation_lines"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    operation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[float] = mapped_column(nullable=False)
    done_quantity: Mapped[float] = mapped_column(nullable=False, default=0)

    operation: Mapped["Operation"] = relationship("Operation", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
