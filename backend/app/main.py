"""
FastAPI main application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.base import engine
from app.middleware.logging import ErrorTrackingMiddleware, LoggingMiddleware
from app.telemetry import router as telemetry_router
from app.rate_limiter import router as rate_limiter_router
from app.analytics import router as analytics_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Startup and shutdown events.
    """
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    # Shutdown
    await engine.dispose()
    print("Application shutdown complete")


def create_application() -> FastAPI:
    """
    Create and configure FastAPI application.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="3D OASIS spatial field - World generation and physics API",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Logging middleware
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(ErrorTrackingMiddleware)
    
    # Include API routes
    app.include_router(api_router)

    # Production telemetry, rate limiting, and analytics (P4-S3)
    app.include_router(telemetry_router)
    app.include_router(rate_limiter_router)
    app.include_router(analytics_router)
    
    # Static files for assets
    try:
        app.mount("/assets", StaticFiles(directory=settings.ASSET_STORAGE_PATH), name="assets")
    except RuntimeError:
        # Directory doesn't exist yet
        import os
        os.makedirs(settings.ASSET_STORAGE_PATH, exist_ok=True)
        app.mount("/assets", StaticFiles(directory=settings.ASSET_STORAGE_PATH), name="assets")
    
    # Static files for fallback worlds
    try:
        app.mount("/fallback", StaticFiles(directory=settings.FALLBACK_WORLDS_PATH), name="fallback")
    except RuntimeError:
        os.makedirs(settings.FALLBACK_WORLDS_PATH, exist_ok=True)
        app.mount("/fallback", StaticFiles(directory=settings.FALLBACK_WORLDS_PATH), name="fallback")
    
    return app


# Create application instance
app = create_application()


@app.get("/")
async def root():
    """Root endpoint redirects to docs."""
    return {
        "message": "Spatial Anubis API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
