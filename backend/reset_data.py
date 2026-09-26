import asyncio
from app.db.session import AsyncSessionLocal
from app.models.product import Product, Category
from app.models.warehouse import Warehouse, Location

from sqlalchemy import text
import uuid

async def reset_data():
    async with AsyncSessionLocal() as db:
        # 1. Delete existing data
        await db.execute(text("TRUNCATE TABLE move_history CASCADE"))
        await db.execute(text("TRUNCATE TABLE stock CASCADE"))
        await db.execute(text("TRUNCATE TABLE operation_lines CASCADE"))
        await db.execute(text("TRUNCATE TABLE operations CASCADE"))
        await db.execute(text("TRUNCATE TABLE products CASCADE"))
        await db.execute(text("TRUNCATE TABLE categories CASCADE"))
        await db.execute(text("TRUNCATE TABLE locations CASCADE"))
        await db.execute(text("TRUNCATE TABLE warehouses CASCADE"))
        
        await db.commit()

        # 2. Create standard Categories
        cat_electronics = Category(name="Electronics")
        cat_furniture = Category(name="Furniture")
        cat_supplies = Category(name="Supplies")
        db.add_all([cat_electronics, cat_furniture, cat_supplies])
        await db.flush()

        # 3. Create Demo Warehouses and Locations
        wh_main = Warehouse(name="Main Warehouse", short_code="MAIN", address="123 Industrial Ave")
        wh_secondary = Warehouse(name="Secondary Warehouse", short_code="SEC", address="456 Logistics Blvd")
        db.add_all([wh_main, wh_secondary])
        await db.flush()

        # Main Warehouse Locations
        loc_main_stock = Location(name="Stock", short_code="MAIN-STK", warehouse_id=wh_main.id)
        loc_main_in = Location(name="Receiving", short_code="MAIN-REC", warehouse_id=wh_main.id)
        loc_main_out = Location(name="Shipping", short_code="MAIN-SHP", warehouse_id=wh_main.id)

        # Secondary Warehouse Locations
        loc_sec_stock = Location(name="Stock", short_code="SEC-STK", warehouse_id=wh_secondary.id)
        
        db.add_all([loc_main_stock, loc_main_in, loc_main_out, loc_sec_stock])
        
        await db.commit()
        print("Data reset successfully! Created demo warehouses and locations.")

if __name__ == "__main__":
    asyncio.run(reset_data())
