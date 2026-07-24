"""
Tests for health check endpoints.
"""
import pytest
from httpx import AsyncClient
from fastapi import FastAPI


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Test basic health endpoint."""
    response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "ok"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_readiness_check(client: AsyncClient) -> None:
    """Test readiness endpoint."""
    response = await client.get("/ready")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["ready", "not_ready"]
    assert "checks" in data
    assert "database" in data["checks"]
    assert "world_labs_api" in data["checks"]
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient) -> None:
    """Test root endpoint."""
    response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "message" in data
    assert "version" in data
    assert "docs" in data
    assert "health" in data
