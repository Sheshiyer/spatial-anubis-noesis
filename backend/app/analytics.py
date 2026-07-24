"""
Session analytics pipeline (P4-S3-29).

Anonymous usage pattern tracking with aggregate-only statistics.
No individual session data is exposed through the API.

Endpoints:
- POST /api/analytics/session - submit session summary
- GET /api/analytics/summary - get aggregate statistics (admin)
"""
import logging
import threading
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("spatial_anubis.analytics")

router = APIRouter(tags=["Analytics"])


# ==================== Pydantic Models ====================


class SessionSummary(BaseModel):
    """
    Anonymous session summary submitted by the client.
    session_hash is a random UUID, not user-linked.
    """
    session_hash: str = Field(
        ...,
        min_length=1,
        description="Random UUID identifying session - NOT user-linked",
    )
    duration_seconds: int = Field(
        ...,
        ge=0,
        description="Total session duration in seconds",
    )
    zones_visited: List[str] = Field(
        default_factory=list,
        description="List of zone names visited during session",
    )
    engines_consulted: List[str] = Field(
        default_factory=list,
        description="List of engine names consulted during session",
    )
    rituals_attempted: int = Field(
        default=0,
        ge=0,
        description="Number of rituals attempted",
    )
    rituals_completed: int = Field(
        default=0,
        ge=0,
        description="Number of rituals completed",
    )

    @model_validator(mode="after")
    def rituals_completed_lte_attempted(self) -> "SessionSummary":
        if self.rituals_completed > self.rituals_attempted:
            raise ValueError(
                f"rituals_completed ({self.rituals_completed}) cannot exceed "
                f"rituals_attempted ({self.rituals_attempted})"
            )
        return self


class AggregateStats(BaseModel):
    """
    Aggregate statistics across all recorded sessions.
    No individual session data is exposed.
    """
    total_sessions: int = 0
    avg_duration_seconds: float = 0.0
    zone_visit_counts: Dict[str, int] = Field(default_factory=dict)
    engine_usage_counts: Dict[str, int] = Field(default_factory=dict)
    total_rituals_attempted: int = 0
    total_rituals_completed: int = 0
    last_updated: Optional[datetime] = None


class SessionRecordedResponse(BaseModel):
    """Response for accepted session summary."""
    status: str = "recorded"
    total_sessions: int = 0


# ==================== Analytics Collector ====================


class AnalyticsCollector:
    """
    In-memory analytics aggregator.

    Accumulates aggregate statistics from session summaries.
    No individual session data is stored - only running totals and counts.
    Thread-safe.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._total_sessions: int = 0
        self._total_duration: int = 0
        self._zone_counts: Dict[str, int] = defaultdict(int)
        self._engine_counts: Dict[str, int] = defaultdict(int)
        self._total_rituals_attempted: int = 0
        self._total_rituals_completed: int = 0
        self._last_updated: Optional[datetime] = None

    def record_session(self, summary: SessionSummary) -> None:
        """
        Record a session summary into aggregate statistics.
        Only aggregate counters are updated - no individual data stored.
        """
        with self._lock:
            self._total_sessions += 1
            self._total_duration += summary.duration_seconds

            for zone in summary.zones_visited:
                self._zone_counts[zone] += 1

            for engine in summary.engines_consulted:
                self._engine_counts[engine] += 1

            self._total_rituals_attempted += summary.rituals_attempted
            self._total_rituals_completed += summary.rituals_completed
            self._last_updated = datetime.now(timezone.utc)

        logger.info(
            "Session recorded: duration=%ds zones=%d engines=%d rituals=%d/%d",
            summary.duration_seconds,
            len(summary.zones_visited),
            len(summary.engines_consulted),
            summary.rituals_completed,
            summary.rituals_attempted,
        )

    def get_aggregate_stats(self) -> AggregateStats:
        """
        Return current aggregate statistics.
        No individual session data is included.
        """
        with self._lock:
            avg_duration = 0.0
            if self._total_sessions > 0:
                avg_duration = self._total_duration / self._total_sessions

            return AggregateStats(
                total_sessions=self._total_sessions,
                avg_duration_seconds=round(avg_duration, 2),
                zone_visit_counts=dict(self._zone_counts),
                engine_usage_counts=dict(self._engine_counts),
                total_rituals_attempted=self._total_rituals_attempted,
                total_rituals_completed=self._total_rituals_completed,
                last_updated=self._last_updated,
            )

    def flush(self) -> AggregateStats:
        """
        Return current stats and reset all aggregation state.
        Used for periodic flush to persistent storage.
        """
        with self._lock:
            avg_duration = 0.0
            if self._total_sessions > 0:
                avg_duration = self._total_duration / self._total_sessions

            stats = AggregateStats(
                total_sessions=self._total_sessions,
                avg_duration_seconds=round(avg_duration, 2),
                zone_visit_counts=dict(self._zone_counts),
                engine_usage_counts=dict(self._engine_counts),
                total_rituals_attempted=self._total_rituals_attempted,
                total_rituals_completed=self._total_rituals_completed,
                last_updated=self._last_updated,
            )

            # Reset state
            self._total_sessions = 0
            self._total_duration = 0
            self._zone_counts = defaultdict(int)
            self._engine_counts = defaultdict(int)
            self._total_rituals_attempted = 0
            self._total_rituals_completed = 0
            self._last_updated = None

        logger.info("Analytics flushed: %d sessions", stats.total_sessions)
        return stats


# ==================== Module-Level Singleton ====================

analytics_collector = AnalyticsCollector()


# ==================== Endpoints ====================


@router.post(
    "/api/analytics/session",
    response_model=SessionRecordedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit anonymous session summary",
    description=(
        "Accepts an anonymous session summary for aggregate analytics. "
        "No individual session data is stored - only running totals."
    ),
)
async def post_analytics_session(
    summary: SessionSummary,
) -> SessionRecordedResponse:
    """Record an anonymous session summary."""
    analytics_collector.record_session(summary)

    return SessionRecordedResponse(
        status="recorded",
        total_sessions=analytics_collector.get_aggregate_stats().total_sessions,
    )


@router.get(
    "/api/analytics/summary",
    response_model=AggregateStats,
    status_code=status.HTTP_200_OK,
    summary="Get aggregate analytics summary",
    description=(
        "Returns aggregate usage statistics. "
        "No individual session data is exposed."
    ),
)
async def get_analytics_summary() -> AggregateStats:
    """Return aggregate analytics statistics."""
    return analytics_collector.get_aggregate_stats()
