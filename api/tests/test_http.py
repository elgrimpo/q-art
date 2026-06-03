"""
HTTP layer tests — validates route registration, param parsing, and status codes
using httpx.AsyncClient against the live FastAPI app. Controller functions are
mocked so no real DB, S3, or Novita calls are made.
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch

from api.main import app


BASE = "http://test"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


# ---------------------------------------------------------------------------- #
#                              USER ROUTES                                     #
# ---------------------------------------------------------------------------- #

@patch("api.main.get_user_info", new_callable=AsyncMock)
async def test_get_user_info_returns_200(mock_get_user):
    mock_get_user.return_value = {"email": "test@example.com", "credits": 10}

    async with _client() as client:
        response = await client.get("/api/user/info?email=test@example.com")

    assert response.status_code == 200
    mock_get_user.assert_called_once_with("test@example.com")


@patch("api.main.authenticate_user", new_callable=AsyncMock)
async def test_post_user_auth_returns_200_with_valid_body(mock_auth):
    mock_auth.return_value = {"message": "User authenticated successfully"}

    body = {
        "name": "Test User",
        "email": "test@example.com",
        "auth_providers": [{"provider": "google", "providerId": "google_123"}],
    }
    async with _client() as client:
        response = await client.post("/api/user/auth", json=body)

    assert response.status_code == 200


async def test_post_user_auth_returns_422_for_missing_fields():
    """Pydantic validation: missing required fields must return 422."""
    async with _client() as client:
        response = await client.post("/api/user/auth", json={"name": "Test"})

    assert response.status_code == 422


# ---------------------------------------------------------------------------- #
#                             GENERATE ROUTES                                  #
# ---------------------------------------------------------------------------- #

async def test_get_generate_returns_422_for_missing_params():
    """All generate params are required; calling without them must return 422."""
    async with _client() as client:
        response = await client.get("/api/generate")

    assert response.status_code == 422


@patch("api.main.predict", new_callable=AsyncMock)
async def test_get_generate_returns_200_with_all_params(mock_predict):
    mock_predict.return_value = {"image_url": "https://example.com/img.png"}

    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "negative_prompt": "ugly",
        "seed": "42",
        "qr_weight": "0.5",
        "sd_model": "sd-v1-5",
        "user_id": "guest_abc",
        "style_prompt": ", cinematic",
        "style_title": "Cinematic",
    }
    async with _client() as client:
        response = await client.get("/api/generate", params=params)

    assert response.status_code == 200


# ---------------------------------------------------------------------------- #
#                              IMAGE ROUTES                                    #
# ---------------------------------------------------------------------------- #

@patch("api.main.get_images", new_callable=AsyncMock)
async def test_get_images_returns_200_with_defaults(mock_get_images):
    """GET /api/images/get with no params must work (all params have defaults)."""
    mock_get_images.return_value = []

    async with _client() as client:
        response = await client.get("/api/images/get")

    assert response.status_code == 200
    assert response.json() == []


@patch("api.main.delete_image", new_callable=AsyncMock)
async def test_delete_image_route_exists(mock_delete):
    mock_delete.return_value = {"message": "Image and document deleted successfully"}

    async with _client() as client:
        response = await client.delete("/api/images/delete/507f1f77bcf86cd799439011")

    assert response.status_code == 200


async def test_delete_image_rejects_get_method():
    """DELETE endpoint must not respond to GET requests."""
    async with _client() as client:
        response = await client.get("/api/images/delete/507f1f77bcf86cd799439011")

    assert response.status_code == 405
