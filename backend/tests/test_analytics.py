"""
Tests for analytics module (P4-S3-29).
Session analytics pipeline - anonymous usage patterns.
"""
from datetime import datetime, timezone
from typing import Any, Dict

import pytest
from httpx import AsyncClient

from app.analytics import (
    AnalyticsCollector,
    SessionSummary,
    AggregateStats,
)


# ==================== SessionSummary Model Tests ====================


class TestSessionSummary:
    """Test SessionSummary Pydantic model."""

    def test_valid_session_summary(self) -> None:
        """SessionSummary accepts valid data."""
        summary = SessionSummary(
            session_hash="abc-123",
            duration_seconds=300,
            zones_visited=["liminal", "solar", "lunar"],
            engines_consulted=["i_ching", "tarot"],
            rituals_attempted=2,
            rituals_completed=1,
        )
        assert summary.session_hash == "abc-123"
        assert summary.duration_seconds == 300
        assert len(summary.zones_visited) == 3

    def test_minimal_session_summary(self) -> None:
        """SessionSummary works with minimal required fields."""
        summary = SessionSummary(
            session_hash="min-session",
            duration_seconds=0,
        )
        assert summary.zones_visited == []
        assert summary.engines_consulted == []
        assert summary.rituals_attempted == 0
        assert summary.rituals_completed == 0

    def test_negative_duration_rejected(self) -> None:
        """SessionSummary rejects negative duration."""
        with pytest.raises(ValueError):
            SessionSummary(
                session_hash="neg-dur",
                duration_seconds=-1,
            )

    def test_rituals_completed_cannot_exceed_attempted(self) -> None:
        """Rituals completed must be <= rituals attempted."""
        with pytest.raises(ValueError):
            SessionSummary(
                session_hash="bad-ritual",
                duration_seconds=100,
                rituals_attempted=1,
                rituals_completed=5,
            )


# ==================== AnalyticsCollector Tests ====================


class TestAnalyticsCollector:
    """Test in-memory analytics aggregation."""

    def test_empty_collector(self) -> None:
        """New collector has zero stats."""
        collector = AnalyticsCollector()
        stats = collector.get_aggregate_stats()
        assert stats.total_sessions == 0
        assert stats.avg_duration_seconds == 0.0

    def test_record_session(self) -> None:
        """Recording a session updates aggregates."""
        collector = AnalyticsCollector()
        summary = SessionSummary(
            session_hash="s1",
            duration_seconds=120,
            zones_visited=["liminal", "solar"],
            engines_consulted=["i_ching"],
            rituals_attempted=1,
            rituals_completed=1,
        )
        collector.record_session(summary)
        stats = collector.get_aggregate_stats()
        assert stats.total_sessions == 1
        assert stats.avg_duration_seconds == 120.0

    def test_multiple_sessions_aggregate(self) -> None:
        """Multiple sessions aggregate correctly."""
        collector = AnalyticsCollector()
        sessions = [
            SessionSummary(
                session_hash="s1",
                duration_seconds=100,
                zones_visited=["liminal"],
                engines_consulted=["i_ching"],
                rituals_attempted=1,
                rituals_completed=0,
            ),
            SessionSummary(
                session_hash="s2",
                duration_seconds=200,
                zones_visited=["solar", "lunar"],
                engines_consulted=["tarot", "runes"],
                rituals_attempted=3,
                rituals_completed=2,
            ),
            SessionSummary(
                session_hash="s3",
                duration_seconds=300,
                zones_visited=["liminal", "solar"],
                engines_consulted=["i_ching"],
                rituals_attempted=0,
                rituals_completed=0,
            ),
        ]
        for s in sessions:
            collector.record_session(s)

        stats = collector.get_aggregate_stats()
        assert stats.total_sessions == 3
        assert stats.avg_duration_seconds == pytest.approx(200.0)
        assert stats.total_rituals_attempted == 4
        assert stats.total_rituals_completed == 2

    def test_zone_frequency_tracking(self) -> None:
        """Zones visited are tracked with frequency counts."""
        collector = AnalyticsCollector()
        collector.record_session(
            SessionSummary(
                session_hash="s1",
                duration_seconds=100,
                zones_visited=["liminal", "solar"],
            )
        )
        collector.record_session(
            SessionSummary(
                session_hash="s2",
                duration_seconds=100,
                zones_visited=["liminal"],
            )
        )
        stats = collector.get_aggregate_stats()
        assert stats.zone_visit_counts["liminal"] == 2
        assert stats.zone_visit_counts["solar"] == 1

    def test_engine_usage_tracking(self) -> None:
        """Engine consultation frequency is tracked."""
        collector = AnalyticsCollector()
        collector.record_session(
            SessionSummary(
                session_hash="s1",
                duration_seconds=60,
                engines_consulted=["i_ching", "tarot"],
            )
        )
        collector.record_session(
            SessionSummary(
                session_hash="s2",
                duration_seconds=60,
                engines_consulted=["i_ching"],
            )
        )
        stats = collector.get_aggregate_stats()
        assert stats.engine_usage_counts["i_ching"] == 2
        assert stats.engine_usage_counts["tarot"] == 1

    def test_no_individual_tracking(self) -> None:
        """Aggregate stats do not expose individual session hashes."""
        collector = AnalyticsCollector()
        collector.record_session(
            SessionSummary(
                session_hash="secret-session",
                duration_seconds=60,
            )
        )
        stats = collector.get_aggregate_stats()
        data = stats.model_dump()
        # Should not contain session hashes anywhere in the aggregate
        assert "secret-session" not in str(data)

    def test_flush_resets_aggregates(self) -> None:
        """Flush clears aggregation state."""
        collector = AnalyticsCollector()
        collector.record_session(
            SessionSummary(
                session_hash="s1",
                duration_seconds=60,
            )
        )
        collector.flush()
        stats = collector.get_aggregate_stats()
        assert stats.total_sessions == 0


# ==================== AggregateStats Model Tests ====================


class TestAggregateStats:
    """Test AggregateStats Pydantic model."""

    def test_serializable(self) -> None:
        """AggregateStats serializes to JSON-compatible dict."""
        stats = AggregateStats(
            total_sessions=10,
            avg_duration_seconds=150.5,
            zone_visit_counts={"liminal": 8, "solar": 5},
            engine_usage_counts={"i_ching": 6},
            total_rituals_attempted=12,
            total_rituals_completed=8,
        )
        data = stats.model_dump()
        assert data["total_sessions"] == 10
        assert isinstance(data["zone_visit_counts"], dict)


# ==================== Endpoint Integration Tests ====================


@pytest.mark.asyncio
async def test_post_analytics_session(client: AsyncClient) -> None:
    """POST /api/analytics/session accepts session summary."""
    response = await client.post(
        "/api/analytics/session",
        json={
            "session_hash": "test-session-001",
            "duration_seconds": 180,
            "zones_visited": ["liminal", "solar"],
            "engines_consulted": ["i_ching"],
            "rituals_attempted": 1,
            "rituals_completed": 1,
        },
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "recorded"


@pytest.mark.asyncio
async def test_post_analytics_session_invalid(client: AsyncClient) -> None:
    """POST /api/analytics/session rejects invalid data."""
    response = await client.post(
        "/api/analytics/session",
        json={
            "session_hash": "bad",
            "duration_seconds": -100,
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_analytics_summary(client: AsyncClient) -> None:
    """GET /api/analytics/summary returns aggregate stats."""
    response = await client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_sessions" in data
    assert "avg_duration_seconds" in data
    assert "zone_visit_counts" in data
    assert "engine_usage_counts" in data
    assert "total_rituals_attempted" in data
    assert "total_rituals_completed" in data


@pytest.mark.asyncio
async def test_post_then_get_reflects_data(client: AsyncClient) -> None:
    """Posted session data appears in summary."""
    # Post a session
    await client.post(
        "/api/analytics/session",
        json={
            "session_hash": "reflective-test",
            "duration_seconds": 240,
            "zones_visited": ["lunar"],
            "engines_consulted": ["runes"],
            "rituals_attempted": 2,
            "rituals_completed": 1,
        },
    )

    # Get summary - should include at least this session
    response = await client.get("/api/analytics/summary")
    data = response.json()
    assert data["total_sessions"] >= 1
