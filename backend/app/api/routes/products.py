from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.product import Product, Category
from app.models.stock import Stock
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, CategoryCreate, CategoryOut
from app.api.deps import get_current_user, require_manager
from app.models.user import User

router = APIRouter(tags=["products"])


# ── Categories ─────────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Category))
    return result.scalars().all()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    cat = Category(name=payload.name)
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


# ── Products ───────────────────────────────────────────────────────────────

@router.get("/products", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Product).options(selectinload(Product.category), selectinload(Product.stock_entries))
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%")
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    # Check SKU uniqueness
    existing = await db.execute(select(Product).where(Product.sku == payload.sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        category_id=payload.category_id,
        uom=payload.uom,
        reorder_threshold=payload.reorder_threshold,
    )
    db.add(product)
    await db.flush()

    # Seed initial stock if provided
    if payload.initial_stock and payload.initial_location_id:
        stock = Stock(
            product_id=product.id,
            location_id=payload.initial_location_id,
            on_hand=payload.initial_stock,
            per_unit_cost=payload.per_unit_cost or 0,
        )
        db.add(stock)

    await db.flush()
    await db.refresh(product)
    return product


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).options(selectinload(Product.category), selectinload(Product.stock_entries)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
