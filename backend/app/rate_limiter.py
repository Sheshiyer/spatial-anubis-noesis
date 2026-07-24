"""
World Labs API rate limiting and cost monitoring (P4-S3-28).

Token bucket algorithm for request throttling.
Cost estimation tracking for World Labs API calls.
Latency percentile tracking (p50, p95).
Dashboard endpoint: GET /api/admin/rate-limits.
"""
import logging
import math
import threading
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

logger = logging.getLogger("spatial_anubis.rate_limiter")

router = APIRouter(tags=["Admin"])


# ==================== Exceptions ====================


class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded") -> None:
        self.message = message
        super().__init__(self.message)


# ==================== Token Bucket Rate Limiter ====================


class RateLimiter:
    """
    Token bucket rate limiter.

    Configurable requests_per_minute and burst_size.
    Tokens refill continuously at (requests_per_minute / 60) tokens per second.
    Thread-safe.
    """

    def __init__(
        self,
        requests_per_minute: int = 60,
        burst_size: int = 10,
    ) -> None:
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self._tokens: float = float(burst_size)
        self._last_refill: float = time.monotonic()
        self._lock = threading.Lock()
        self._total_requests: int = 0
        self._total_rejected: int = 0

    @property
    def total_requests(self) -> int:
        """Total number of acquire attempts."""
        return self._total_requests

    @property
    def tokens_remaining(self) -> float:
        """Current token count (may be fractional)."""
        with self._lock:
            self._refill()
            return self._tokens

    def _refill(self) -> None:
        """Refill tokens based on elapsed time. Must be called under lock."""
        now = time.monotonic()
        elapsed = now - self._last_refill
        # Rate: requests_per_minute / 60 tokens per second
        tokens_to_add = elapsed * (self.requests_per_minute / 60.0)
        self._tokens = min(self._tokens + tokens_to_add, float(self.burst_size))
        self._last_refill = now

    def acquire(self) -> bool:
        """
        Try to acquire a token. Returns True if allowed, False if blocked.
        """
        with self._lock:
            self._total_requests += 1
            self._refill()

            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True

            self._total_rejected += 1
            return False

    def acquire_or_raise(self) -> None:
        """Acquire a token or raise RateLimitExceeded."""
        if not self.acquire():
            raise RateLimitExceeded(
                f"Rate limit exceeded: {self.requests_per_minute} requests/min, "
                f"burst size {self.burst_size}"
            )


# ==================== Cost Tracker ====================


class CostTracker:
    """
    Track estimated API costs for World Labs usage.
    Thread-safe accumulator.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._total_cost: float = 0.0
        self._generation_count: int = 0
        self._mesh_count: int = 0

    @property
    def total_cost(self) -> float:
        with self._lock:
            return self._total_cost

    @property
    def generation_count(self) -> int:
        with self._lock:
            return self._generation_count

    @property
    def mesh_count(self) -> int:
        with self._lock:
            return self._mesh_count

    def add_generation(self, cost: float) -> None:
        """Record a world generation cost."""
        with self._lock:
            self._total_cost += cost
            self._generation_count += 1

    def add_mesh(self, cost: float) -> None:
        """Record a mesh extraction cost."""
        with self._lock:
            self._total_cost += cost
            self._mesh_count += 1

    def to_dict(self, cost_per_generation: float, cost_per_mesh: float) -> Dict[str, Any]:
        """Serialize cost data."""
        with self._lock:
            return {
                "total_estimated_usd": self._total_cost,
                "generation_count": self._generation_count,
                "mesh_count": self._mesh_count,
                "cost_per_generation": cost_per_generation,
                "cost_per_mesh": cost_per_mesh,
            }


# ==================== Latency Tracker ====================


class LatencyTracker:
    """
    Track request latency with percentile calculation (p50, p95).
    Maintains a bounded sample set to prevent memory leaks.
    Thread-safe.
    """

    def __init__(self, max_samples: int = 1000) -> None:
        self.max_samples = max_samples
        self._samples: List[float] = []
        self._lock = threading.Lock()

    def record(self, latency_ms: float) -> None:
        """Record a latency sample in milliseconds."""
        with self._lock:
            self._samples.append(latency_ms)
            # Keep only most recent samples
            if len(self._samples) > self.max_samples:
                self._samples = self._samples[-self.max_samples:]

    def _percentile(self, p: float) -> float:
        """Calculate the p-th percentile (0-100) from samples."""
        if not self._samples:
            return 0.0
        sorted_samples = sorted(self._samples)
        n = len(sorted_samples)
        if n == 1:
            return sorted_samples[0]
        # Linear interpolation
        rank = (p / 100.0) * (n - 1)
        lower = int(math.floor(rank))
        upper = int(math.ceil(rank))
        if lower == upper:
            return sorted_samples[lower]
        fraction = rank - lower
        return sorted_samples[lower] + fraction * (sorted_samples[upper] - sorted_samples[lower])

    @property
    def p50(self) -> float:
        """Median latency in ms."""
        with self._lock:
            return self._percentile(50.0)

    @property
    def p95(self) -> float:
        """95th percentile latency in ms."""
        with self._lock:
            return self._percentile(95.0)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize latency data."""
        with self._lock:
            return {
                "p50_ms": round(self._percentile(50.0), 2),
                "p95_ms": round(self._percentile(95.0), 2),
                "sample_count": len(self._samples),
            }


# ==================== Pydantic Models ====================


class RateLimitDashboard(BaseModel):
    """Dashboard data model for rate limit monitoring."""
    requests_per_minute: int
    burst_size: int
    total_requests: int
    tokens_remaining: float
    cost: Dict[str, Any]
    latency: Dict[str, Any]


# ==================== World Labs Rate Limiter ====================


class WorldLabsRateLimiter:
    """
    Specialized rate limiter for World Labs API.

    Combines:
    - Token bucket throttling
    - Cost estimation and tracking
    - Latency percentile monitoring

    Default costs based on World Labs pricing:
    - $0.50 per world generation
    - $0.25 per mesh extraction
    """

    def __init__(
        self,
        requests_per_minute: int = 10,
        burst_size: int = 5,
        cost_per_generation: float = 0.50,
        cost_per_mesh: float = 0.25,
    ) -> None:
        self.cost_per_generation = cost_per_generation
        self.cost_per_mesh = cost_per_mesh

        self.limiter = RateLimiter(
            requests_per_minute=requests_per_minute,
            burst_size=burst_size,
        )
        self.cost_tracker = CostTracker()
        self.latency_tracker = LatencyTracker()

    def acquire(self) -> bool:
        """Try to acquire a request slot."""
        return self.limiter.acquire()

    def acquire_or_raise(self) -> None:
        """Acquire or raise RateLimitExceeded."""
        self.limiter.acquire_or_raise()

    def record_generation(self, latency_ms: float) -> None:
        """Record a completed world generation."""
        self.cost_tracker.add_generation(self.cost_per_generation)
        self.latency_tracker.record(latency_ms)
        logger.info(
            "World Labs generation recorded: latency=%.1fms cost=$%.2f",
            latency_ms,
            self.cost_per_generation,
        )

    def record_mesh(self, latency_ms: float) -> None:
        """Record a completed mesh extraction."""
        self.cost_tracker.add_mesh(self.cost_per_mesh)
        self.latency_tracker.record(latency_ms)
        logger.info(
            "World Labs mesh recorded: latency=%.1fms cost=$%.2f",
            latency_ms,
            self.cost_per_mesh,
        )

    def dashboard_data(self) -> Dict[str, Any]:
        """Get structured dashboard data."""
        return {
            "requests_per_minute": self.limiter.requests_per_minute,
            "burst_size": self.limiter.burst_size,
            "total_requests": self.limiter.total_requests,
            "tokens_remaining": round(self.limiter.tokens_remaining, 2),
            "cost": self.cost_tracker.to_dict(
                self.cost_per_generation,
                self.cost_per_mesh,
            ),
            "latency": self.latency_tracker.to_dict(),
        }


# ==================== Module-Level Singleton ====================

world_labs_limiter = WorldLabsRateLimiter(
    requests_per_minute=10,
    burst_size=5,
    cost_per_generation=0.50,
    cost_per_mesh=0.25,
)


# ==================== Endpoints ====================


@router.get(
    "/api/admin/rate-limits",
    response_model=RateLimitDashboard,
    status_code=status.HTTP_200_OK,
    summary="Get World Labs API rate limit dashboard",
    description=(
        "Returns current rate limit status, cost tracking, "
        "and latency percentiles for the World Labs API."
    ),
)
async def get_rate_limits_dashboard() -> Dict[str, Any]:
    """
    Dashboard endpoint for World Labs API rate limiting and cost monitoring.
    """
    return world_labs_limiter.dashboard_data()
