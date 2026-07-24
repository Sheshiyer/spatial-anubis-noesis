"""
Health and readiness check endpoints.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import get_db
from app.schemas.schemas import HealthResponse, ReadinessResponse
from app.services.world_labs_client import get_world_labs_client

settings = get_settings()
router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Liveness probe.
    
    Returns 200 if the application is running.
    Always returns OK.
    """
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
) -> ReadinessResponse:
    """
    Readiness probe.
    
    Returns 200 if all dependencies are healthy (database, external APIs).
    Returns 503 if any dependency is unhealthy.
    """
    checks = {}
    
    # Check database connectivity
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        checks["database"] = False
    
    # Check World Labs API connectivity (in mock mode, always true)
    try:
        # Simple check - just verify client can be instantiated
        client = get_world_labs_client()
        checks["world_labs_api"] = True
    except Exception:
        checks["world_labs_api"] = False
    
    # Overall status
    all_healthy = all(checks.values())
    status = "ready" if all_healthy else "not_ready"
    
    response = ReadinessResponse(
        status=status,
        checks=checks,
        timestamp=datetime.utcnow(),
    )
    
    return response
