"""
API v1 router aggregation.
"""
from fastapi import APIRouter

from app.api.v1 import auth, admin, health, worlds

# Main v1 router
api_router = APIRouter(prefix="/api/v1")

# Include sub-routers
api_router.include_router(auth.router)
api_router.include_router(worlds.router)
api_router.include_router(admin.router)

# Health endpoints (no prefix)
api_router.include_router(health.router, prefix="")
