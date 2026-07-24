"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ==================== Enums ====================

class DashaPlanet(str, Enum):
    """The 9 Planetary Dasha bodies."""
    SUN = "sun"
    MOON = "moon"
    MARS = "mars"
    MERCURY = "mercury"
    JUPITER = "jupiter"
    VENUS = "venus"
    SATURN = "saturn"
    RAHU = "rahu"
    KETU = "ketu"


class GenerationStatus(str, Enum):
    """World generation job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    FALLBACK_USED = "fallback_used"


# ==================== Biome Metadata ====================

class BiomeMetadata(BaseModel):
    """Biome metadata schema."""
    material_keywords: List[str] = Field(default_factory=list)
    lighting_preset: str = "default"
    fog_config: Dict[str, Any] = Field(default_factory=dict)
    fog_density: float = 0.01
    fog_color: str = "#ffffff"
    ambient_color: str = "#404040"
    atmosphere_description: str = ""


# ==================== Auth Schemas ====================

class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class UserIdentity(BaseModel):
    """User identity from token."""
    user_id: str
    session_id: Optional[UUID] = None


# ==================== World Schemas ====================

class WorldGenerateRequest(BaseModel):
    """Request to generate a new world."""
    dasha_planet: DashaPlanet
    archetype: str = Field(..., min_length=1, max_length=100)


class WorldGenerateResponse(BaseModel):
    """Response from world generation request."""
    job_id: str
    status: GenerationStatus
    message: str
    estimated_completion_seconds: int = 30


class WorldStatusResponse(BaseModel):
    """Response for world generation status."""
    model_config = ConfigDict(from_attributes=True)
    
    job_id: str
    status: GenerationStatus
    progress_percent: int
    
    # Assets (populated when completed)
    splat_url: Optional[str] = None
    glb_url: Optional[str] = None
    collision_mesh_url: Optional[str] = None
    
    # Metadata
    biome_metadata: Optional[BiomeMetadata] = None
    dasha_planet: DashaPlanet
    archetype: str
    
    # Timestamps
    created_at: datetime
    generated_at: Optional[datetime] = None
    
    # Error info
    error_message: Optional[str] = None
    retry_count: int = 0


class WorldDetailResponse(BaseModel):
    """Detailed world response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    job_id: str
    dasha_planet: DashaPlanet
    archetype: str
    status: GenerationStatus
    progress_percent: int
    
    splat_url: Optional[str] = None
    glb_url: Optional[str] = None
    collision_mesh_url: Optional[str] = None
    
    biome_metadata: Optional[BiomeMetadata] = None
    
    created_at: datetime
    updated_at: datetime
    generated_at: Optional[datetime] = None


# ==================== Artifact Schemas ====================

class ArtifactCreateRequest(BaseModel):
    """Request to create an artifact."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    artifact_type: str
    element: Optional[str] = None
    position: Dict[str, float] = Field(default_factory=dict)
    properties: Dict[str, Any] = Field(default_factory=dict)


class ArtifactResponse(BaseModel):
    """Artifact response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    world_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    artifact_type: str
    element: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    state: str
    discovered_at: datetime
    properties: Optional[Dict[str, Any]] = None


# ==================== Reading Schemas ====================

class ReadingCreateRequest(BaseModel):
    """Request to create a reading."""
    reading_type: str
    coherence_score: Optional[float] = Field(None, ge=0, le=100)
    lqd_score: Optional[float] = Field(None, ge=0, le=100)
    entropy_score: Optional[float] = Field(None, ge=0, le=100)
    breath_phase: Optional[str] = None
    raw_data: Dict[str, Any] = Field(default_factory=dict)


class ReadingResponse(BaseModel):
    """Reading response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    session_id: UUID
    reading_type: str
    coherence_score: Optional[float] = None
    lqd_score: Optional[float] = None
    entropy_score: Optional[float] = None
    breath_phase: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    created_at: datetime


# ==================== Health Schemas ====================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: datetime


class ReadinessResponse(BaseModel):
    """Readiness check response."""
    status: str
    checks: Dict[str, bool]
    timestamp: datetime


# ==================== Admin Schemas ====================

class UsageStatsResponse(BaseModel):
    """API usage statistics."""
    user_id: str
    total_api_calls: int
    total_estimated_cost_usd: float
    world_generations: int
    period_start: datetime
    period_end: datetime


class RateLimitStatus(BaseModel):
    """Rate limit status for user."""
    resource_type: str
    allowed: bool
    remaining_seconds: int
    limit: int
    window_seconds: int
