"""
SQLAlchemy ORM models for all database tables.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class DashaPlanet(str, PyEnum):
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


class GenerationStatus(str, PyEnum):
    """World generation job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    FALLBACK_USED = "fallback_used"


class Session(Base):
    """User session model."""
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Relationships
    worlds: List["World"] = relationship("World", back_populates="session", lazy="selectin")
    readings: List["Reading"] = relationship("Reading", back_populates="session", lazy="selectin")


class World(Base):
    """Generated world model."""
    __tablename__ = "worlds"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    job_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Dasha configuration
    dasha_planet = Column(SQLEnum(DashaPlanet), nullable=False)
    archetype = Column(String(100), nullable=False)
    
    # Generation status
    status = Column(SQLEnum(GenerationStatus), default=GenerationStatus.PENDING, nullable=False)
    progress_percent = Column(Integer, default=0, nullable=False)
    
    # Assets
    splat_url = Column(String(512), nullable=True)
    glb_url = Column(String(512), nullable=True)
    collision_mesh_url = Column(String(512), nullable=True)
    
    # Biome metadata
    biome_metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    generated_at = Column(DateTime, nullable=True)
    
    # Cost tracking
    api_calls_made = Column(Integer, default=0, nullable=False)
    estimated_cost_usd = Column(Float, default=0.0, nullable=False)
    generation_duration_seconds = Column(Float, nullable=True)
    
    # Retry tracking
    retry_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    
    # Relationships
    session: Session = relationship("Session", back_populates="worlds")
    artifacts: List["Artifact"] = relationship("Artifact", back_populates="world", lazy="selectin")


class Reading(Base):
    """Divination reading model."""
    __tablename__ = "readings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    
    # Reading data
    reading_type = Column(String(50), nullable=False)
    coherence_score = Column(Float, nullable=True)
    lqd_score = Column(Float, nullable=True)
    entropy_score = Column(Float, nullable=True)
    breath_phase = Column(String(20), nullable=True)
    
    # Raw data snapshot
    raw_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    session: Session = relationship("Session", back_populates="readings")
    artifacts: List["Artifact"] = relationship("Artifact", back_populates="reading", lazy="selectin")


class Artifact(Base):
    """Discovered artifact model."""
    __tablename__ = "artifacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    world_id = Column(UUID(as_uuid=True), ForeignKey("worlds.id"), nullable=True)
    reading_id = Column(UUID(as_uuid=True), ForeignKey("readings.id"), nullable=True)
    
    # Artifact data
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    artifact_type = Column(String(50), nullable=False)
    element = Column(String(20), nullable=True)
    
    # 3D data
    position_x = Column(Float, nullable=True)
    position_y = Column(Float, nullable=True)
    position_z = Column(Float, nullable=True)
    rotation = Column(JSON, nullable=True)
    scale = Column(Float, default=1.0, nullable=False)
    
    # State
    state = Column(String(20), default="dormant", nullable=False)
    discovered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    integrated_at = Column(DateTime, nullable=True)
    
    # Metadata
    properties = Column(JSON, nullable=True)
    
    # Relationships
    world: Optional[World] = relationship("World", back_populates="artifacts")
    reading: Optional[Reading] = relationship("Reading", back_populates="artifacts")


class APIUsage(Base):
    """API usage tracking for cost estimation."""
    __tablename__ = "api_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    
    # API call details
    endpoint = Column(String(255), nullable=False)
    request_type = Column(String(50), nullable=False)
    status_code = Column(Integer, nullable=True)
    
    # Cost tracking
    estimated_cost_usd = Column(Float, default=0.0, nullable=False)
    tokens_used = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    duration_ms = Column(Integer, nullable=True)


class RateLimit(Base):
    """Rate limiting tracking."""
    __tablename__ = "rate_limits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    last_request_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    request_count = Column(Integer, default=1, nullable=False)
    
    # Composite unique constraint handled in migration
