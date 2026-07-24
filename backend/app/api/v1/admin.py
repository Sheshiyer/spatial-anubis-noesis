"""
Admin API endpoints for usage tracking and management.
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_auth
from app.db.base import get_db
from app.models.models import APIUsage, World
from app.schemas.schemas import UsageStatsResponse, UserIdentity

router = APIRouter(prefix="/admin", tags=["Admin"])


async def verify_admin(user: UserIdentity) -> None:
    """Verify user has admin privileges."""
    # Simple check - in production, use proper admin roles
    if not user.user_id.startswith("admin_"):
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )


@router.get("/usage", response_model=UsageStatsResponse)
async def get_usage_stats(
    user_id: str = Query(..., description="User ID to query"),
    days: int = Query(30, ge=1, le=365),
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> UsageStatsResponse:
    """
    Get API usage statistics for a user.
    Admin only.
    """
    await verify_admin(current_user)
    
    period_start = datetime.utcnow() - timedelta(days=days)
    period_end = datetime.utcnow()
    
    # Get API call count
    api_calls_result = await db.execute(
        select(func.count(APIUsage.id)).where(
            APIUsage.user_id == user_id,
            APIUsage.created_at >= period_start,
        )
    )
    total_api_calls = api_calls_result.scalar() or 0
    
    # Get estimated cost
    cost_result = await db.execute(
        select(func.sum(APIUsage.estimated_cost_usd)).where(
            APIUsage.user_id == user_id,
            APIUsage.created_at >= period_start,
        )
    )
    total_cost = cost_result.scalar() or 0.0
    
    # Get world generation count
    worlds_result = await db.execute(
        select(func.count(World.id)).where(
            World.created_at >= period_start,
        )
    )
    world_generations = worlds_result.scalar() or 0
    
    return UsageStatsResponse(
        user_id=user_id,
        total_api_calls=total_api_calls,
        total_estimated_cost_usd=total_cost,
        world_generations=world_generations,
        period_start=period_start,
        period_end=period_end,
    )


@router.get("/usage/all")
async def get_all_usage(
    days: int = Query(30, ge=1, le=365),
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    """
    Get usage statistics for all users.
    Admin only.
    """
    await verify_admin(current_user)
    
    period_start = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate by user
    result = await db.execute(
        select(
            APIUsage.user_id,
            func.count(APIUsage.id).label("api_calls"),
            func.sum(APIUsage.estimated_cost_usd).label("total_cost"),
        )
        .where(APIUsage.created_at >= period_start)
        .group_by(APIUsage.user_id)
        .order_by(func.count(APIUsage.id).desc())
    )
    
    rows = result.all()
    
    return [
        {
            "user_id": row.user_id,
            "api_calls": row.api_calls,
            "total_cost_usd": row.total_cost or 0.0,
        }
        for row in rows
    ]


@router.get("/health/detailed")
async def get_detailed_health(
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get detailed health information.
    Admin only.
    """
    await verify_admin(current_user)
    
    # Database connectivity check
    try:
        await db.execute(select(func.count(World.id)).limit(1))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "version": "2.0.0",
    }
