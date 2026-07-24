"""
Tests for world generation endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_world(client: AsyncClient, auth_headers: dict) -> None:
    """Test world generation endpoint."""
    response = await client.post(
        "/api/v1/worlds/generate",
        json={
            "dasha_planet": "saturn",
            "archetype": "seeker"
        },
        headers=auth_headers,
    )
    
    assert response.status_code == 202
    data = response.json()
    
    assert "job_id" in data
    assert data["status"] in ["pending", "processing", "completed", "fallback_used"]
    assert "message" in data
    assert "estimated_completion_seconds" in data


@pytest.mark.asyncio
async def test_get_world_status(client: AsyncClient, auth_headers: dict) -> None:
    """Test getting world status."""
    # First generate a world
    gen_response = await client.post(
        "/api/v1/worlds/generate",
        json={
            "dasha_planet": "venus",
            "archetype": "mystic"
        },
        headers=auth_headers,
    )
    gen_data = gen_response.json()
    job_id = gen_data["job_id"]
    
    # Get status
    response = await client.get(
        f"/api/v1/worlds/{job_id}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["job_id"] == job_id
    assert "status" in data
    assert "progress_percent" in data
    assert "dasha_planet" in data
    assert "archetype" in data


@pytest.mark.asyncio
async def test_get_nonexistent_world(client: AsyncClient, auth_headers: dict) -> None:
    """Test getting status for non-existent world."""
    response = await client.get(
        "/api/v1/worlds/nonexistent_job",
        headers=auth_headers,
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_worlds(client: AsyncClient, auth_headers: dict) -> None:
    """Test listing worlds."""
    response = await client.get("/api/v1/worlds/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_biome_info(client: AsyncClient) -> None:
    """Test getting biome information."""
    response = await client.get("/api/v1/worlds/biome/mars")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["dasha_planet"] == "mars"
    assert "name" in data
    assert "description" in data
    assert "metadata" in data


@pytest.mark.asyncio
async def test_rate_limit_status(client: AsyncClient, auth_headers: dict) -> None:
    """Test rate limit status endpoint."""
    response = await client.get(
        "/api/v1/worlds/rate-limit/status",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["resource_type"] == "world_generation"
    assert "allowed" in data
    assert "remaining_seconds" in data
    assert "limit" in data
    assert "window_seconds" in data


@pytest.mark.asyncio
async def test_generate_world_requires_auth(client: AsyncClient) -> None:
    """Test that world generation requires authentication."""
    response = await client.post(
        "/api/v1/worlds/generate",
        json={
            "dasha_planet": "jupiter",
            "archetype": "warrior"
        },
    )
    
    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_all_dasha_planets(client: AsyncClient, auth_headers: dict) -> None:
    """Test biome info for all Dasha planets."""
    planets = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]
    
    for planet in planets:
        response = await client.get(f"/api/v1/worlds/biome/{planet}")
        
        assert response.status_code == 200, f"Failed for planet: {planet}"
        data = response.json()
        
        assert data["dasha_planet"] == planet
        assert "name" in data
        assert "metadata" in data
