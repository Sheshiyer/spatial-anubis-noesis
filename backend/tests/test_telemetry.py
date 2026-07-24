"""
Tests for telemetry endpoint (P4-S3-20).
Production error reporting - POST /api/telemetry.
"""
import asyncio
import time
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.telemetry import (
    TelemetryBuffer,
    TelemetryEvent,
    TelemetryPayload,
    EventType,
    SessionRateLimiter,
)


# ==================== Pydantic Model Tests ====================


class TestTelemetryModels:
    """Test Pydantic model validation for telemetry events."""

    def test_valid_error_event(self) -> None:
        """TelemetryPayload accepts a valid error event."""
        payload = TelemetryPayload(
            event_type=EventType.ERROR,
            payload={"message": "WebGL context lost", "stack": "..."},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        )
        assert payload.event_type == EventType.ERROR
        assert payload.session_hash is not None

    def test_valid_performance_event(self) -> None:
        """TelemetryPayload accepts a valid performance event."""
        payload = TelemetryPayload(
            event_type=EventType.PERFORMANCE,
            payload={"fps": 58, "frame_time_ms": 16.7},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        )
        assert payload.event_type == EventType.PERFORMANCE

    def test_valid_navigation_event(self) -> None:
        """TelemetryPayload accepts navigation events."""
        payload = TelemetryPayload(
            event_type=EventType.NAVIGATION,
            payload={"from_zone": "liminal", "to_zone": "solar"},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="session-uuid-here",
        )
        assert payload.event_type == EventType.NAVIGATION

    def test_valid_engine_usage_event(self) -> None:
        """TelemetryPayload accepts engine_usage events."""
        payload = TelemetryPayload(
            event_type=EventType.ENGINE_USAGE,
            payload={"engine": "i_ching", "duration_ms": 1200},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="session-uuid-here",
        )
        assert payload.event_type == EventType.ENGINE_USAGE

    def test_invalid_event_type_rejected(self) -> None:
        """TelemetryPayload rejects unknown event types."""
        with pytest.raises(ValueError):
            TelemetryPayload(
                event_type="unknown_event",
                payload={},
                timestamp=datetime.now(timezone.utc).isoformat(),
                session_hash="session-uuid-here",
            )

    def test_empty_payload_accepted(self) -> None:
        """Empty payload dict is valid."""
        payload = TelemetryPayload(
            event_type=EventType.ERROR,
            payload={},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="session-uuid-here",
        )
        assert payload.payload == {}

    def test_session_hash_required(self) -> None:
        """session_hash is mandatory."""
        with pytest.raises(ValueError):
            TelemetryPayload(
                event_type=EventType.ERROR,
                payload={},
                timestamp=datetime.now(timezone.utc).isoformat(),
                session_hash="",  # empty not allowed
            )

    def test_telemetry_event_has_received_at(self) -> None:
        """TelemetryEvent adds server-side received_at timestamp."""
        event = TelemetryEvent(
            event_type=EventType.ERROR,
            payload={"msg": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="abc-123",
        )
        assert event.received_at is not None


# ==================== Rate Limiter Tests ====================


class TestSessionRateLimiter:
    """Test per-session rate limiting (100 events/min)."""

    def test_allows_first_request(self) -> None:
        """First request from a session is always allowed."""
        limiter = SessionRateLimiter(max_events_per_minute=100)
        assert limiter.is_allowed("session-1") is True

    def test_allows_up_to_limit(self) -> None:
        """Allows exactly max_events_per_minute requests."""
        limiter = SessionRateLimiter(max_events_per_minute=5)
        for _ in range(5):
            assert limiter.is_allowed("session-1") is True

    def test_blocks_over_limit(self) -> None:
        """Blocks requests exceeding the limit."""
        limiter = SessionRateLimiter(max_events_per_minute=5)
        for _ in range(5):
            limiter.is_allowed("session-1")
        assert limiter.is_allowed("session-1") is False

    def test_separate_sessions_independent(self) -> None:
        """Different sessions have independent limits."""
        limiter = SessionRateLimiter(max_events_per_minute=2)
        limiter.is_allowed("session-a")
        limiter.is_allowed("session-a")
        assert limiter.is_allowed("session-a") is False
        assert limiter.is_allowed("session-b") is True

    def test_window_resets_after_expiry(self) -> None:
        """Rate limit window resets after 60 seconds."""
        limiter = SessionRateLimiter(max_events_per_minute=1)
        limiter.is_allowed("session-x")
        assert limiter.is_allowed("session-x") is False

        # Simulate time passing by manipulating internal state
        session_data = limiter._sessions["session-x"]
        session_data["window_start"] = time.monotonic() - 61.0
        session_data["count"] = 0

        assert limiter.is_allowed("session-x") is True


# ==================== Buffer Tests ====================


class TestTelemetryBuffer:
    """Test in-memory telemetry buffer."""

    def test_add_event(self) -> None:
        """Buffer stores events."""
        buffer = TelemetryBuffer(max_size=100)
        event = TelemetryEvent(
            event_type=EventType.ERROR,
            payload={"msg": "test"},
            timestamp=datetime.now(timezone.utc).isoformat(),
            session_hash="abc",
        )
        buffer.add(event)
        assert buffer.size == 1

    def test_flush_returns_events(self) -> None:
        """Flush returns all buffered events and clears buffer."""
        buffer = TelemetryBuffer(max_size=100)
        for i in range(3):
            event = TelemetryEvent(
                event_type=EventType.PERFORMANCE,
                payload={"i": i},
                timestamp=datetime.now(timezone.utc).isoformat(),
                session_hash="abc",
            )
            buffer.add(event)

        flushed = buffer.flush()
        assert len(flushed) == 3
        assert buffer.size == 0

    def test_buffer_evicts_oldest_when_full(self) -> None:
        """Buffer drops oldest events when capacity exceeded."""
        buffer = TelemetryBuffer(max_size=2)
        for i in range(3):
            event = TelemetryEvent(
                event_type=EventType.ERROR,
                payload={"i": i},
                timestamp=datetime.now(timezone.utc).isoformat(),
                session_hash="abc",
            )
            buffer.add(event)

        assert buffer.size == 2
        events = buffer.flush()
        # Oldest event (i=0) should have been evicted
        assert events[0].payload["i"] == 1
        assert events[1].payload["i"] == 2

    def test_stats(self) -> None:
        """Buffer reports stats correctly."""
        buffer = TelemetryBuffer(max_size=100)
        for etype in [EventType.ERROR, EventType.ERROR, EventType.PERFORMANCE]:
            event = TelemetryEvent(
                event_type=etype,
                payload={},
                timestamp=datetime.now(timezone.utc).isoformat(),
                session_hash="abc",
            )
            buffer.add(event)

        stats = buffer.stats()
        assert stats["total_buffered"] == 3
        assert stats["by_type"]["error"] == 2
        assert stats["by_type"]["performance"] == 1


# ==================== Endpoint Integration Tests ====================


@pytest.mark.asyncio
async def test_post_telemetry_success(client: AsyncClient) -> None:
    """POST /api/telemetry accepts valid event."""
    response = await client.post(
        "/api/telemetry",
        json={
            "event_type": "error",
            "payload": {"message": "WebGL context lost"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_hash": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "accepted"


@pytest.mark.asyncio
async def test_post_telemetry_invalid_event_type(client: AsyncClient) -> None:
    """POST /api/telemetry rejects invalid event_type."""
    response = await client.post(
        "/api/telemetry",
        json={
            "event_type": "hacking",
            "payload": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_hash": "abc-123",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_post_telemetry_missing_session_hash(client: AsyncClient) -> None:
    """POST /api/telemetry rejects missing session_hash."""
    response = await client.post(
        "/api/telemetry",
        json={
            "event_type": "error",
            "payload": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_post_telemetry_rate_limited(client: AsyncClient) -> None:
    """POST /api/telemetry returns 429 when rate limit exceeded."""
    session_hash = "rate-limit-test-session"

    # Send requests up to the limit (use the telemetry router's limiter)
    # We patch the limiter to use a low limit for testing
    from app.telemetry import telemetry_rate_limiter

    original_limit = telemetry_rate_limiter.max_events_per_minute
    telemetry_rate_limiter.max_events_per_minute = 2
    # Reset the session
    telemetry_rate_limiter._sessions.clear()

    try:
        for _ in range(2):
            resp = await client.post(
                "/api/telemetry",
                json={
                    "event_type": "error",
                    "payload": {},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "session_hash": session_hash,
                },
            )
            assert resp.status_code == 202

        # This should be rate limited
        resp = await client.post(
            "/api/telemetry",
            json={
                "event_type": "error",
                "payload": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_hash": session_hash,
            },
        )
        assert resp.status_code == 429
    finally:
        telemetry_rate_limiter.max_events_per_minute = original_limit
        telemetry_rate_limiter._sessions.clear()


@pytest.mark.asyncio
async def test_no_pii_in_response(client: AsyncClient) -> None:
    """Telemetry response must not leak PII like IP addresses."""
    response = await client.post(
        "/api/telemetry",
        json={
            "event_type": "navigation",
            "payload": {"zone": "solar"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_hash": "anon-session",
        },
    )
    assert response.status_code == 202
    data = response.json()
    # No IP or user-agent in response
    assert "ip" not in data
    assert "user_agent" not in data
    assert "client" not in data
