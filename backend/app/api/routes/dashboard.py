from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.models.operation import Operation, OperationType, OperationStatus
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class OperationStats(BaseModel):
    to_do: int
    late: int
    waiting: int
    total_operations: int

class DashboardStats(BaseModel):
    receipts: OperationStats
    deliveries: OperationStats
    adjustments: OperationStats

@router.get("/kpis", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_user),
):
    today = date.today()
    
    async def get_stats_for_type(op_type: OperationType) -> OperationStats:
        # Open operations are draft, waiting, ready
        open_statuses = [OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready]
        
        # 1. To do (open)
        stmt_todo = select(func.count()).select_from(Operation).where(
            Operation.type == op_type,
            Operation.status.in_(open_statuses)
        )
        to_do = await db.scalar(stmt_todo) or 0
        
        # 2. Late
        stmt_late = select(func.count()).select_from(Operation).where(
            Operation.type == op_type,
            Operation.status.in_(open_statuses),
            Operation.schedule_date != None,
            Operation.schedule_date < today
        )
        late = await db.scalar(stmt_late) or 0
        
        # 3. Waiting
        stmt_waiting = select(func.count()).select_from(Operation).where(
            Operation.type == op_type,
            Operation.status == OperationStatus.waiting
        )
        waiting = await db.scalar(stmt_waiting) or 0
        
        # 4. Total operations (all statuses, or maybe just for this type? Let's say all for this type)
        stmt_total = select(func.count()).select_from(Operation).where(
            Operation.type == op_type
        )
        total = await db.scalar(stmt_total) or 0
        
        return OperationStats(
            to_do=to_do,
            late=late,
            waiting=waiting,
            total_operations=total
        )
        
    receipt_stats = await get_stats_for_type(OperationType.IN)
    delivery_stats = await get_stats_for_type(OperationType.OUT)
    adjustment_stats = await get_stats_for_type(OperationType.ADJUSTMENT)
    
    return DashboardStats(
        receipts=receipt_stats,
        deliveries=delivery_stats,
        adjustments=adjustment_stats,
    )
