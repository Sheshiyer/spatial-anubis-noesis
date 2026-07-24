"""
Tests for rate limiter module (P4-S3-28).
World Labs API rate limiting and cost monitoring.
"""
import time
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.rate_limiter import (
    RateLimiter,
    RateLimitExceeded,
    WorldLabsRateLimiter,
    CostTracker,
    LatencyTracker,
    RateLimitDashboard,
)


# ==================== Token Bucket Algorithm Tests ====================


class TestRateLimiter:
    """Test token bucket rate limiter."""

    def test_allows_first_request(self) -> None:
        """First request always succeeds with full bucket."""
        limiter = RateLimiter(requests_per_minute=10, burst_size=10)
        assert limiter.acquire() is True

    def test_allows_burst(self) -> None:
        """Allows burst_size requests immediately."""
        limiter = RateLimiter(requests_per_minute=60, burst_size=5)
        for _ in range(5):
            assert limiter.acquire() is True

    def test_blocks_after_burst_exhausted(self) -> None:
        """Blocks when burst tokens exhausted."""
        limiter = RateLimiter(requests_per_minute=60, burst_size=3)
        for _ in range(3):
            limiter.acquire()
        assert limiter.acquire() is False

    def test_tokens_refill_over_time(self) -> None:
        """Tokens refill at the configured rate."""
        limiter = RateLimiter(requests_per_minute=60, burst_size=1)
        limiter.acquire()
        assert limiter.acquire() is False

        # Simulate 1 second passing (60 rpm = 1 per second)
        limiter._last_refill = time.monotonic() - 1.1
        assert limiter.acquire() is True

    def test_tokens_never_exceed_burst_size(self) -> None:
        """Token count caps at burst_size."""
        limiter = RateLimiter(requests_per_minute=600, burst_size=5)
        # Wait a simulated long time
        limiter._last_refill = time.monotonic() - 100.0
        limiter._refill()
        assert limiter._tokens <= limiter.burst_size

    def test_acquire_raises_option(self) -> None:
        """acquire_or_raise raises RateLimitExceeded when blocked."""
        limiter = RateLimiter(requests_per_minute=60, burst_size=1)
        limiter.acquire()
        with pytest.raises(RateLimitExceeded):
            limiter.acquire_or_raise()

    def test_total_requests_tracked(self) -> None:
        """Tracks total number of requests attempted."""
        limiter = RateLimiter(requests_per_minute=60, burst_size=10)
        limiter.acquire()
        limiter.acquire()
        limiter.acquire()
        assert limiter.total_requests == 3


# ==================== WorldLabs Rate Limiter Tests ====================


class TestWorldLabsRateLimiter:
    """Test World Labs API-specific rate limiter."""

    def test_default_generation_cost(self) -> None:
        """Generation cost uses correct default."""
        wl = WorldLabsRateLimiter()
        assert wl.cost_per_generation > 0

    def test_default_mesh_cost(self) -> None:
        """Mesh cost uses correct default."""
        wl = WorldLabsRateLimiter()
        assert wl.cost_per_mesh > 0

    def test_record_generation(self) -> None:
        """Recording a generation updates cost tracker."""
        wl = WorldLabsRateLimiter(
            requests_per_minute=10,
            burst_size=10,
            cost_per_generation=0.50,
        )
        wl.record_generation(latency_ms=1200.0)
        assert wl.cost_tracker.total_cost == pytest.approx(0.50)
        assert wl.cost_tracker.generation_count == 1

    def test_record_mesh(self) -> None:
        """Recording a mesh extraction updates cost tracker."""
        wl = WorldLabsRateLimiter(
            requests_per_minute=10,
            burst_size=10,
            cost_per_mesh=0.25,
        )
        wl.record_mesh(latency_ms=800.0)
        assert wl.cost_tracker.total_cost == pytest.approx(0.25)
        assert wl.cost_tracker.mesh_count == 1

    def test_dashboard_data(self) -> None:
        """Dashboard returns structured rate limit data."""
        wl = WorldLabsRateLimiter(
            requests_per_minute=10,
            burst_size=5,
            cost_per_generation=0.50,
            cost_per_mesh=0.25,
        )
        wl.record_generation(latency_ms=100.0)
        wl.record_generation(latency_ms=200.0)
        wl.record_mesh(latency_ms=50.0)

        data = wl.dashboard_data()
        assert data["total_requests"] >= 0
        assert data["cost"]["total_estimated_usd"] == pytest.approx(1.25)
        assert data["cost"]["generation_count"] == 2
        assert data["cost"]["mesh_count"] == 1
        assert "latency" in data


# ==================== Cost Tracker Tests ====================


class TestCostTracker:
    """Test cost estimation and tracking."""

    def test_empty_tracker(self) -> None:
        """New tracker has zero costs."""
        tracker = CostTracker()
        assert tracker.total_cost == 0.0
        assert tracker.generation_count == 0
        assert tracker.mesh_count == 0

    def test_add_generation_cost(self) -> None:
        """Adding generation cost increments total."""
        tracker = CostTracker()
        tracker.add_generation(0.50)
        tracker.add_generation(0.50)
        assert tracker.total_cost == pytest.approx(1.00)
        assert tracker.generation_count == 2

    def test_add_mesh_cost(self) -> None:
        """Adding mesh cost increments total."""
        tracker = CostTracker()
        tracker.add_mesh(0.25)
        assert tracker.total_cost == pytest.approx(0.25)
        assert tracker.mesh_count == 1

    def test_mixed_costs(self) -> None:
        """Mixed generation and mesh costs sum correctly."""
        tracker = CostTracker()
        tracker.add_generation(0.50)
        tracker.add_mesh(0.25)
        tracker.add_generation(0.50)
        assert tracker.total_cost == pytest.approx(1.25)


# ==================== Latency Tracker Tests ====================


class TestLatencyTracker:
    """Test latency percentile tracking."""

    def test_empty_tracker(self) -> None:
        """Empty tracker returns zeros for percentiles."""
        tracker = LatencyTracker()
        assert tracker.p50 == 0.0
        assert tracker.p95 == 0.0

    def test_single_sample(self) -> None:
        """Single sample returns that value for all percentiles."""
        tracker = LatencyTracker()
        tracker.record(100.0)
        assert tracker.p50 == 100.0
        assert tracker.p95 == 100.0

    def test_percentile_calculation(self) -> None:
        """Percentiles calculated correctly from sorted data."""
        tracker = LatencyTracker()
        # Add 100 samples: 1, 2, 3, ..., 100
        for i in range(1, 101):
            tracker.record(float(i))
        # p50 should be around 50, p95 around 95
        assert 49 <= tracker.p50 <= 51
        assert 94 <= tracker.p95 <= 96

    def test_max_samples_cap(self) -> None:
        """Tracker caps sample storage to prevent memory leak."""
        tracker = LatencyTracker(max_samples=10)
        for i in range(100):
            tracker.record(float(i))
        assert len(tracker._samples) <= 10


# ==================== Dashboard Data Model Tests ====================


class TestRateLimitDashboard:
    """Test the dashboard data model."""

    def test_dashboard_serializable(self) -> None:
        """Dashboard data can be serialized to dict."""
        dashboard = RateLimitDashboard(
            requests_per_minute=60,
            burst_size=10,
            total_requests=42,
            tokens_remaining=8.0,
            cost={
                "total_estimated_usd": 5.25,
                "generation_count": 10,
                "mesh_count": 1,
                "cost_per_generation": 0.50,
                "cost_per_mesh": 0.25,
            },
            latency={
                "p50_ms": 120.0,
                "p95_ms": 450.0,
                "sample_count": 11,
            },
        )
        data = dashboard.model_dump()
        assert data["total_requests"] == 42
        assert data["cost"]["total_estimated_usd"] == 5.25


# ==================== Endpoint Integration Tests ====================


@pytest.mark.asyncio
async def test_get_rate_limits_dashboard(client: AsyncClient) -> None:
    """GET /api/admin/rate-limits returns dashboard data."""
    response = await client.get("/api/admin/rate-limits")
    assert response.status_code == 200
    data = response.json()
    assert "requests_per_minute" in data
    assert "burst_size" in data
    assert "total_requests" in data
    assert "cost" in data
    assert "latency" in data
