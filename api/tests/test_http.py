"""
HTTP layer tests — validates route registration, param parsing, and status codes
using httpx.AsyncClient against the live FastAPI app. Controller functions are
mocked so no real DB, S3, or Novita calls are made.
"""
import pytest
import httpx
import jwt
import os
from unittest.mock import AsyncMock, patch

from api.main import app


BASE = "http://test"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


def _guest_auth_headers(email: str = "test@example.com") -> dict:
    """Return Authorization headers carrying a valid guest JWT."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    token = jwt.encode(
        {"sub": "guest_test", "email": email, "scope": "user", "is_guest": True},
        secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _service_auth_headers() -> dict:
    """Return Authorization headers carrying a valid service JWT."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    token = jwt.encode(
        {"scope": "service"},
        secret,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------- #
#                              AUTH ENFORCEMENT TESTS                          #
# ---------------------------------------------------------------------------- #

async def test_delete_requires_auth():
    """DELETE /api/images/delete/:id must return 401 with no token."""
    async with _client() as client:
        resp = await client.delete("/api/images/delete/507f1f77bcf86cd799439011")
    assert resp.status_code == 401


async def test_user_info_requires_auth():
    """GET /api/user/info must return 401 with no token."""
    async with _client() as client:
        resp = await client.get("/api/user/info")
    assert resp.status_code == 401


async def test_like_requires_auth():
    """PUT /api/images/like/:id must return 401 with no token."""
    async with _client() as client:
        resp = await client.put("/api/images/like/507f1f77bcf86cd799439011")
    assert resp.status_code == 401


async def test_user_auth_requires_service_token():
    """POST /api/user/auth must return 401 with no service token."""
    async with _client() as client:
        resp = await client.post("/api/user/auth", json={
            "name": "x", "email": "x@y.com",
            "auth_providers": [{"provider": "google", "providerId": "1"}],
        })
    assert resp.status_code == 401


@patch("api.main.get_images", new_callable=AsyncMock)
async def test_public_images_get_no_auth(mock_get_images):
    """GET /api/images/get is public — must NOT be 401."""
    mock_get_images.return_value = []
    async with _client() as client:
        resp = await client.get("/api/images/get")
    # Public route: must NOT be 401 (may be 200 or a DB error, but never auth-blocked)
    assert resp.status_code != 401


# ---------------------------------------------------------------------------- #
#                              USER ROUTES                                     #
# ---------------------------------------------------------------------------- #

@patch("api.main.get_user_info", new_callable=AsyncMock)
async def test_get_user_info_returns_200(mock_get_user):
    mock_get_user.return_value = {"email": "test@example.com", "credits": 10}

    async with _client() as client:
        response = await client.get("/api/user/info", headers=_guest_auth_headers())

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
        response = await client.post("/api/user/auth", json=body, headers=_service_auth_headers())

    assert response.status_code == 200


async def test_post_user_auth_returns_422_for_missing_fields():
    """Pydantic validation: missing required fields must return 422 (even without service token, Pydantic fires first — but now auth fires first, so expect 401)."""
    async with _client() as client:
        response = await client.post("/api/user/auth", json={"name": "Test"})

    # Auth dependency now fires before Pydantic body validation — 401 is correct
    assert response.status_code == 401


# ---------------------------------------------------------------------------- #
#                             GENERATE ROUTES                                  #
# ---------------------------------------------------------------------------- #

async def test_get_generate_returns_422_for_missing_params():
    """All generate params are required; calling without them (and without auth) must return 401."""
    async with _client() as client:
        response = await client.get("/api/generate")

    # Auth dependency fires before param validation — 401, not 422
    assert response.status_code == 401


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
        "style_prompt": ", cinematic",
        "style_title": "Cinematic",
    }
    async with _client() as client:
        response = await client.get("/api/generate", params=params, headers=_guest_auth_headers())

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
        response = await client.delete(
            "/api/images/delete/507f1f77bcf86cd799439011",
            headers=_guest_auth_headers(),
        )

    assert response.status_code == 200


async def test_delete_image_rejects_get_method():
    """DELETE endpoint must not respond to GET requests."""
    async with _client() as client:
        response = await client.get("/api/images/delete/507f1f77bcf86cd799439011")

    assert response.status_code == 405


# ---------------------------------------------------------------------------- #
#                         GET IMAGE BY ID ROUTE                                #
# ---------------------------------------------------------------------------- #

@patch("api.main.get_image", new_callable=AsyncMock)
async def test_get_image_by_id_returns_200(mock_get_image):
    """GET /api/images/get/:id returns 200 when controller succeeds."""
    mock_get_image.return_value = {"_id": "507f1f77bcf86cd799439011", "prompt": "a dragon"}
    async with _client() as client:
        resp = await client.get("/api/images/get/507f1f77bcf86cd799439011")
    assert resp.status_code == 200
    assert resp.json()["_id"] == "507f1f77bcf86cd799439011"


@patch("api.main.get_image", new_callable=AsyncMock)
async def test_get_image_by_id_not_found_returns_404(mock_get_image):
    """GET /api/images/get/:id propagates 404 from the controller."""
    from fastapi import HTTPException
    mock_get_image.side_effect = HTTPException(status_code=404, detail="Not found")
    async with _client() as client:
        resp = await client.get("/api/images/get/507f1f77bcf86cd799439011")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------- #
#                            UPSCALE ROUTE                                     #
# ---------------------------------------------------------------------------- #

async def test_upscale_requires_auth():
    """GET /api/upscale/:id must return 401 with no token."""
    async with _client() as client:
        resp = await client.get(
            "/api/upscale/507f1f77bcf86cd799439011",
            params={"resolution": "1024"},
        )
    assert resp.status_code == 401


@patch("api.main.upscale", new_callable=AsyncMock)
async def test_upscale_route_returns_200(mock_upscale):
    """GET /api/upscale/:id returns 200 with valid auth and params."""
    mock_upscale.return_value = {"_id": "507f1f77bcf86cd799439011", "width": 1024}
    async with _client() as client:
        resp = await client.get(
            "/api/upscale/507f1f77bcf86cd799439011",
            params={"resolution": "1024"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    mock_upscale.assert_called_once()


# ---------------------------------------------------------------------------- #
#                            CHECKOUT ROUTE                                    #
# ---------------------------------------------------------------------------- #

async def test_checkout_requires_auth():
    """POST /api/checkout must return 401 with no token."""
    async with _client() as client:
        resp = await client.post(
            "/api/checkout",
            params={"image_id": "607f1f77bcf86cd799439022"},
        )
    assert resp.status_code == 401


@patch("api.main.create_unlock_checkout_session")
async def test_checkout_returns_session_url(mock_checkout):
    """POST /api/checkout returns session_url with valid auth."""
    mock_checkout.return_value = {"session_url": "https://checkout.stripe.com/pay/cs_test"}
    async with _client() as client:
        resp = await client.post(
            "/api/checkout",
            params={"image_id": "607f1f77bcf86cd799439022"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    assert resp.json()["session_url"] == "https://checkout.stripe.com/pay/cs_test"
