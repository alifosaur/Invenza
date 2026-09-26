import uuid
from sqlalchemy import String, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    uom: Mapped[str] = mapped_column(String(50), nullable=False, default="pcs")
    reorder_threshold: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)

    category: Mapped["Category"] = relationship("Category", back_populates="products")
    stock_entries: Mapped[list["Stock"]] = relationship("Stock", back_populates="product")
