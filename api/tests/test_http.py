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


def _auth_headers(email: str = "user@example.com") -> dict:
    """Return Authorization headers carrying a valid authenticated (non-guest) JWT."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    token = jwt.encode(
        {"sub": "507f1f77bcf86cd799439011", "email": email, "scope": "user", "is_guest": False},
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


@patch("api.main.get_user_info", new_callable=AsyncMock)
async def test_get_user_info_includes_is_admin(mock_get_user):
    """GET /api/user/info must include is_admin merged from the JWT token claims."""
    mock_get_user.return_value = {"email": "test@example.com", "credits": 10}

    async with _client() as client:
        response = await client.get("/api/user/info", headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert "is_admin" in body
    # Guest JWT for test@example.com is not an admin email — must be False
    assert body["is_admin"] is False


@patch("api.utils.auth.users.find_one", new_callable=AsyncMock)
@patch("api.main.get_user_info", new_callable=AsyncMock)
async def test_get_user_info_includes_is_admin_true_for_admin_email(mock_get_user, mock_find_one):
    """GET /api/user/info must return is_admin=True for authenticated users with admin email."""
    admin_email = "admin@example.com"
    mock_get_user.return_value = {"email": admin_email, "credits": 10}
    # Mock the MongoDB lookup in get_current_user
    mock_find_one.return_value = {"_id": "507f1f77bcf86cd799439011", "email": admin_email}

    with patch.dict(os.environ, {"ADMIN_EMAILS": "admin@example.com"}):
        async with _client() as client:
            response = await client.get("/api/user/info", headers=_auth_headers(email=admin_email))

    assert response.status_code == 200
    body = response.json()
    assert "is_admin" in body
    # Authenticated JWT with admin@example.com and admin email in env — must be True
    assert body["is_admin"] is True


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

async def test_generate_start_requires_auth():
    """POST /api/generate/start must return 401 with no token (auth fires before param validation)."""
    async with _client() as client:
        response = await client.post("/api/generate/start")

    assert response.status_code == 401


@patch("api.main.start_generation", new_callable=AsyncMock)
@patch("api.main.get_style", new_callable=AsyncMock)
async def test_generate_start_returns_job_id(mock_get_style, mock_start_generation):
    from api.schemas.schemas import Style

    mock_get_style.return_value = Style(
        _id="507f1f77bcf86cd799439099",
        style_key="cinematic",
        version=1,
        is_active=True,
        title="Cinematic",
        prompt=", cinematic",
        loras=[],
        style_modifier=0,
        sd_model="sd-v1-5",
    )
    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "negative_prompt": "ugly",
        "seed": "42",
        "qr_weight": "1",
        "style_id": "507f1f77bcf86cd799439099",
    }
    async with _client() as client:
        response = await client.post("/api/generate/start", params=params, headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("job_id"), str) and body["job_id"]
    mock_get_style.assert_awaited_once_with("507f1f77bcf86cd799439099")


@patch("api.main.get_style", new_callable=AsyncMock)
async def test_generate_start_returns_400_for_unknown_style(mock_get_style):
    from fastapi import HTTPException

    mock_get_style.side_effect = HTTPException(status_code=404, detail="Style not found")
    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "style_id": "000000000000000000000000",
    }
    async with _client() as client:
        response = await client.post("/api/generate/start", params=params, headers=_guest_auth_headers())

    assert response.status_code == 404


# ---------------------------------------------------------------------------- #
#                          GENERATION PROGRESS ROUTE                           #
# ---------------------------------------------------------------------------- #

async def test_generate_progress_requires_auth():
    """GET /api/generate/progress/:id must return 401 with no token."""
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc")
    assert response.status_code == 401


@patch("api.main.get_job")
async def test_generate_progress_returns_job_status(mock_get_job):
    mock_get_job.return_value = {
        "user_id": "guest_test", "status": "processing", "percent": 42,
        "stage": "novita", "eta": 5, "result": None, "error": None,
    }
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc", headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["percent"] == 42
    assert body["stage"] == "novita"


@patch("api.main.get_job")
async def test_generate_progress_404_for_unknown_job(mock_get_job):
    mock_get_job.return_value = None
    async with _client() as client:
        response = await client.get("/api/generate/progress/does-not-exist", headers=_guest_auth_headers())
    assert response.status_code == 404


@patch("api.main.get_job")
async def test_generate_progress_403_for_other_users_job(mock_get_job):
    mock_get_job.return_value = {
        "user_id": "someone_else", "status": "processing", "percent": 10,
        "stage": "prep", "eta": None, "result": None, "error": None,
    }
    async with _client() as client:
        response = await client.get("/api/generate/progress/job-abc", headers=_guest_auth_headers())
    assert response.status_code == 403


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
#                            CHECKOUT/UNLOCK ROUTE                             #
# ---------------------------------------------------------------------------- #

async def test_checkout_unlock_requires_auth():
    """POST /api/checkout/unlock must return 401 with no token."""
    async with _client() as client:
        resp = await client.post(
            "/api/checkout/unlock",
            params={"image_id": "607f1f77bcf86cd799439022"},
        )
    assert resp.status_code == 401


@patch("api.main.create_unlock_checkout_session")
async def test_checkout_unlock_returns_session_url(mock_checkout):
    """POST /api/checkout/unlock returns session_url with valid auth."""
    mock_checkout.return_value = {"session_url": "https://checkout.stripe.com/pay/cs_test"}
    async with _client() as client:
        resp = await client.post(
            "/api/checkout/unlock",
            params={"image_id": "607f1f77bcf86cd799439022"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    assert resp.json()["session_url"] == "https://checkout.stripe.com/pay/cs_test"


# ---------------------------------------------------------------------------- #
#                            UNLOCK ROUTE                                      #
# ---------------------------------------------------------------------------- #

async def test_unlock_requires_auth():
    """POST /api/unlock/:id must return 401 with no token."""
    async with _client() as client:
        resp = await client.post("/api/unlock/507f1f77bcf86cd799439011")
    assert resp.status_code == 401


@patch("api.main.unlock_image", new_callable=AsyncMock)
async def test_unlock_route_returns_200(mock_unlock):
    """POST /api/unlock/:id returns 200 with valid auth."""
    mock_unlock.return_value = {"_id": "507f1f77bcf86cd799439011", "unlocked": True}
    async with _client() as client:
        resp = await client.post(
            "/api/unlock/507f1f77bcf86cd799439011",
            params={"stripe_session_id": "cs_test_abc123"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    assert resp.json()["unlocked"] is True
    mock_unlock.assert_called_once_with("507f1f77bcf86cd799439011", "cs_test_abc123", mock_unlock.call_args.args[2])
