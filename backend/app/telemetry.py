"""
Production telemetry endpoint (P4-S3-20).

Anonymous error reporting and performance telemetry.
POST /api/telemetry - accepts telemetry events with NO PII collection.

Rate limited: max 100 events per session per minute.
In-memory buffer with periodic flush capability.
"""
import logging
import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("spatial_anubis.telemetry")

router = APIRouter(tags=["Telemetry"])


# ==================== Enums ====================


class EventType(str, Enum):
    """Allowed telemetry event types."""
    ERROR = "error"
    PERFORMANCE = "performance"
    NAVIGATION = "navigation"
    ENGINE_USAGE = "engine_usage"


# ==================== Pydantic Models ====================


class TelemetryPayload(BaseModel):
    """
    Incoming telemetry event from the client.
    No PII fields - session_hash is a random client-generated UUID.
    """
    event_type: EventType
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(
        ...,
        description="ISO 8601 timestamp from client",
    )
    session_hash: str = Field(
        ...,
        min_length=1,
        description="Random UUID identifying session - NOT user-linked",
    )

    @field_validator("session_hash")
    @classmethod
    def session_hash_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_hash must not be empty")
        return v


class TelemetryEvent(BaseModel):
    """
    Server-side telemetry event with received_at timestamp.
    Extends the client payload with server metadata.
    """
    event_type: EventType
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str
    session_hash: str
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TelemetryResponse(BaseModel):
    """Response for accepted telemetry event."""
    status: str = "accepted"
    buffered_count: int = 0


# ==================== Session Rate Limiter ====================


class SessionRateLimiter:
    """
    Per-session rate limiter.
    Allows max_events_per_minute events per session in a sliding window.
    Thread-safe.
    """

    def __init__(self, max_events_per_minute: int = 100) -> None:
        self.max_events_per_minute = max_events_per_minute
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, session_hash: str) -> bool:
        """
        Check if a session is within rate limits.
        Returns True if allowed, False if rate limited.
        """
        now = time.monotonic()
        window_seconds = 60.0

        with self._lock:
            if session_hash not in self._sessions:
                self._sessions[session_hash] = {
                    "window_start": now,
                    "count": 1,
                }
                return True

            session = self._sessions[session_hash]
            elapsed = now - session["window_start"]

            # Reset window if expired
            if elapsed >= window_seconds:
                session["window_start"] = now
                session["count"] = 1
                return True

            # Check limit
            if session["count"] >= self.max_events_per_minute:
                return False

            session["count"] += 1
            return True

    def cleanup_stale(self, max_age_seconds: float = 300.0) -> int:
        """Remove sessions older than max_age_seconds. Returns count removed."""
        now = time.monotonic()
        removed = 0
        with self._lock:
            stale_keys = [
                k for k, v in self._sessions.items()
                if now - v["window_start"] > max_age_seconds
            ]
            for k in stale_keys:
                del self._sessions[k]
                removed += 1
        return removed


# ==================== Telemetry Buffer ====================


class TelemetryBuffer:
    """
    In-memory event buffer with bounded capacity.
    Evicts oldest events when full. Thread-safe.
    Supports periodic flush to external storage.
    """

    def __init__(self, max_size: int = 10000) -> None:
        self.max_size = max_size
        self._events: deque[TelemetryEvent] = deque(maxlen=max_size)
        self._lock = threading.Lock()
        self._total_received: int = 0
        self._total_flushed: int = 0

    @property
    def size(self) -> int:
        """Current number of buffered events."""
        with self._lock:
            return len(self._events)

    def add(self, event: TelemetryEvent) -> None:
        """Add an event to the buffer. Evicts oldest if full."""
        with self._lock:
            self._events.append(event)
            self._total_received += 1

    def flush(self) -> List[TelemetryEvent]:
        """
        Return all buffered events and clear the buffer.
        Used for periodic flush to storage.
        """
        with self._lock:
            events = list(self._events)
            self._events.clear()
            self._total_flushed += len(events)
            return events

    def stats(self) -> Dict[str, Any]:
        """Return buffer statistics."""
        with self._lock:
            by_type: Dict[str, int] = defaultdict(int)
            for event in self._events:
                by_type[event.event_type.value] += 1

            return {
                "total_buffered": len(self._events),
                "total_received": self._total_received,
                "total_flushed": self._total_flushed,
                "max_size": self.max_size,
                "by_type": dict(by_type),
            }


# ==================== Module-Level Singletons ====================

# These are module-level so they persist across requests within the process.
telemetry_buffer = TelemetryBuffer(max_size=10000)
telemetry_rate_limiter = SessionRateLimiter(max_events_per_minute=100)


# ==================== Endpoints ====================


@router.post(
    "/api/telemetry",
    response_model=TelemetryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit anonymous telemetry event",
    description=(
        "Accepts anonymous telemetry events. No PII is collected. "
        "session_hash is a client-generated random UUID. "
        "Rate limited to 100 events per session per minute."
    ),
)
async def post_telemetry(payload: TelemetryPayload) -> TelemetryResponse:
    """
    Accept a telemetry event and buffer it.
    No IP addresses, user agents, or PII are stored.
    """
    # Rate limit check
    if not telemetry_rate_limiter.is_allowed(payload.session_hash):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Max 100 events per session per minute.",
        )

    # Convert to internal event (adds received_at)
    event = TelemetryEvent(
        event_type=payload.event_type,
        payload=payload.payload,
        timestamp=payload.timestamp,
        session_hash=payload.session_hash,
    )

    # Buffer the event
    telemetry_buffer.add(event)

    logger.info(
        "Telemetry event buffered: type=%s session=%s",
        payload.event_type.value,
        payload.session_hash[:8] + "...",
    )

    return TelemetryResponse(
        status="accepted",
        buffered_count=telemetry_buffer.size,
    )
