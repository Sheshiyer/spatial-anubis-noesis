"""
Tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login(client: AsyncClient) -> None:
    """Test login endpoint."""
    response = await client.post("/api/v1/auth/login", params={"user_id": "test_user_123"})
    
    assert response.status_code == 200
    data = response.json()
    
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient) -> None:
    """Test token refresh."""
    # First login
    login_response = await client.post("/api/v1/auth/login", params={"user_id": "test_user"})
    login_data = login_response.json()
    refresh_token = login_data["refresh_token"]
    
    # Then refresh
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_refresh_with_invalid_token(client: AsyncClient) -> None:
    """Test refresh with invalid token."""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"}
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, auth_headers: dict) -> None:
    """Test logout endpoint."""
    response = await client.post("/api/v1/auth/logout", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["message"] == "Successfully logged out"


@pytest.mark.asyncio
async def test_protected_route_without_auth(client: AsyncClient) -> None:
    """Test that protected routes require authentication."""
    response = await client.get("/api/v1/worlds/")
    
    assert response.status_code == 403  # FastAPI HTTPBearer auto_error=False


@pytest.mark.asyncio
async def test_protected_route_with_auth(client: AsyncClient, auth_headers: dict) -> None:
    """Test that protected routes work with valid auth."""
    response = await client.get("/api/v1/worlds/", headers=auth_headers)
    
    # Should not be 401/403 (actual response depends on other factors)
    assert response.status_code != 401
    assert response.status_code != 403
