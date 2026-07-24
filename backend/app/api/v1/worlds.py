"""
World generation and management API endpoints.
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import get_current_user, require_auth, optional_auth
from app.db.base import get_db
from app.models.models import GenerationStatus, RateLimit, World
from app.schemas.schemas import (
    RateLimitStatus,
    UserIdentity,
    WorldDetailResponse,
    WorldGenerateRequest,
    WorldGenerateResponse,
    WorldStatusResponse,
    DashaPlanet,
)
from app.services.world_generation import get_generation_service

settings = get_settings()
router = APIRouter(prefix="/worlds", tags=["Worlds"])


def check_rate_limit_status(
    last_request: datetime,
    limit_hours: int = 1,
) -> RateLimitStatus:
    """Check if user is rate limited."""
    next_allowed = last_request + timedelta(hours=limit_hours)
    now = datetime.utcnow()
    
    if now < next_allowed:
        remaining_seconds = int((next_allowed - now).total_seconds())
        return RateLimitStatus(
            resource_type="world_generation",
            allowed=False,
            remaining_seconds=remaining_seconds,
            limit=1,
            window_seconds=limit_hours * 3600,
        )
    
    return RateLimitStatus(
        resource_type="world_generation",
        allowed=True,
        remaining_seconds=0,
        limit=1,
        window_seconds=limit_hours * 3600,
    )


@router.post("/generate", response_model=WorldGenerateResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_world(
    request: WorldGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> WorldGenerateResponse:
    """
    Initiate world generation.
    
    Returns 202 Accepted with job_id. Poll GET /worlds/{job_id} for status.
    Rate limited to 1 per user per hour.
    """
    # Check rate limit
    rate_limit_result = await db.execute(
        select(RateLimit).where(
            and_(
                RateLimit.user_id == current_user.user_id,
                RateLimit.resource_type == "world_generation",
            )
        )
    )
    rate_limit = rate_limit_result.scalar_one_or_none()
    
    if rate_limit:
        status_info = check_rate_limit_status(
            rate_limit.last_request_at,
            settings.RATE_LIMIT_WORLD_GENERATION_PER_HOUR,
        )
        
        if not status_info.allowed:
            # Return cached world if available
            cached_result = await db.execute(
                select(World).where(
                    and_(
                        World.dasha_planet == request.dasha_planet,
                        World.status.in_([GenerationStatus.COMPLETED, GenerationStatus.FALLBACK_USED]),
                    )
                ).order_by(World.created_at.desc()).limit(1)
            )
            cached_world = cached_result.scalar_one_or_none()
            
            if cached_world:
                return WorldGenerateResponse(
                    job_id=cached_world.job_id,
                    status=GenerationStatus.COMPLETED,
                    message=f"Rate limit exceeded. Returning cached world. Retry after {status_info.remaining_seconds}s",
                    estimated_completion_seconds=0,
                )
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "retry_after_seconds": status_info.remaining_seconds,
                },
            )
    
    # Create generation job
    service = get_generation_service()
    world = await service.create_generation_job(
        db=db,
        user_id=current_user.user_id,
        request=request,
    )
    
    # Update rate limit tracking
    if rate_limit:
        rate_limit.last_request_at = datetime.utcnow()
        rate_limit.request_count += 1
    else:
        rate_limit = RateLimit(
            user_id=current_user.user_id,
            resource_type="world_generation",
            last_request_at=datetime.utcnow(),
            request_count=1,
        )
        db.add(rate_limit)
    
    await db.commit()
    
    # Start background generation
    async def generate_in_background():
        async with db.begin():
            await service.process_generation(db, world)
    
    # Note: In production, use a proper task queue like Celery
    # For now, we just start the job (client will poll)
    # background_tasks.add_task(generate_in_background)
    
    return WorldGenerateResponse(
        job_id=world.job_id,
        status=GenerationStatus.PENDING,
        message="World generation started",
        estimated_completion_seconds=30,
    )


@router.get("/{job_id}", response_model=WorldStatusResponse)
async def get_world_status(
    job_id: str,
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> WorldStatusResponse:
    """
    Get world generation status.
    
    Poll this endpoint after initiating generation.
    """
    result = await db.execute(
        select(World).where(World.job_id == job_id)
    )
    world = result.scalar_one_or_none()
    
    if not world:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="World not found",
        )
    
    # If still pending/processing, trigger background processing
    if world.status in [GenerationStatus.PENDING, GenerationStatus.PROCESSING]:
        service = get_generation_service()
        # Start processing (non-blocking for this request)
        import asyncio
        asyncio.create_task(service.process_generation(db, world))
    
    return WorldStatusResponse(
        job_id=world.job_id,
        status=world.status,
        progress_percent=world.progress_percent,
        splat_url=world.splat_url,
        glb_url=world.glb_url,
        collision_mesh_url=world.collision_mesh_url,
        biome_metadata=world.biome_metadata,
        dasha_planet=world.dasha_planet,
        archetype=world.archetype,
        created_at=world.created_at,
        generated_at=world.generated_at,
        error_message=world.last_error,
        retry_count=world.retry_count,
    )


@router.get("/", response_model=List[WorldDetailResponse])
async def list_worlds(
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
    offset: int = 0,
) -> List[WorldDetailResponse]:
    """
    List user's generated worlds.
    """
    result = await db.execute(
        select(World)
        .order_by(World.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    worlds = result.scalars().all()
    
    return [WorldDetailResponse.model_validate(w) for w in worlds]


@router.get("/biome/{dasha_planet}")
async def get_biome_info(
    dasha_planet: DashaPlanet,
) -> dict:
    """
    Get biome information for a Dasha planet.
    """
    from app.services.biome_templates import get_biome_template, get_biome_metadata
    
    template = get_biome_template(dasha_planet)
    metadata = get_biome_metadata(dasha_planet)
    
    return {
        "dasha_planet": dasha_planet.value,
        "name": template["name"],
        "description": template["description"],
        "metadata": metadata.model_dump(),
    }


@router.get("/rate-limit/status")
async def get_rate_limit_status(
    current_user: UserIdentity = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> RateLimitStatus:
    """
    Check current rate limit status for world generation.
    """
    result = await db.execute(
        select(RateLimit).where(
            and_(
                RateLimit.user_id == current_user.user_id,
                RateLimit.resource_type == "world_generation",
            )
        )
    )
    rate_limit = result.scalar_one_or_none()
    
    if not rate_limit:
        return RateLimitStatus(
            resource_type="world_generation",
            allowed=True,
            remaining_seconds=0,
            limit=1,
            window_seconds=3600,
        )
    
    return check_rate_limit_status(
        rate_limit.last_request_at,
        settings.RATE_LIMIT_WORLD_GENERATION_PER_HOUR,
    )
