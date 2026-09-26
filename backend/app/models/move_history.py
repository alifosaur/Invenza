import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Enum, ForeignKey, DateTime, Numeric, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class MoveDirection(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"


class MoveHistory(Base):
    __tablename__ = "move_history"
    __table_args__ = (
        Index("ix_move_history_date", "date"),
        Index("ix_move_history_operation_id", "operation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    operation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("operations.id", ondelete="SET NULL"), nullable=True
    )
    reference: Mapped[str] = mapped_column(String(100), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    from_location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    to_location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    direction: Mapped[MoveDirection] = mapped_column(Enum(MoveDirection), nullable=False)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)

    operation: Mapped["Operation"] = relationship("Operation")
    product: Mapped["Product"] = relationship("Product")
    from_location: Mapped["Location"] = relationship("Location", foreign_keys=[from_location_id])
    to_location: Mapped["Location"] = relationship("Location", foreign_keys=[to_location_id])
