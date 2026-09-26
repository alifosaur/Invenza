import uuid
from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship, column_property
from sqlalchemy import select, case
from app.db.session import Base


class Stock(Base):
    __tablename__ = "stock"
    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    per_unit_cost: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    on_hand: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    reserved: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False, default=0)

    product: Mapped["Product"] = relationship("Product", back_populates="stock_entries")
    location: Mapped["Location"] = relationship("Location")

    @property
    def free_to_use(self) -> float:
        return float(self.on_hand) - float(self.reserved)
