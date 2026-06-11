import os
import time
import jwt
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from api.utils.auth import decode_token, get_current_user, require_service_token

SECRET = os.environ["BACKEND_JWT_SECRET"]
FAKE_OBJECT_ID = "507f1f77bcf86cd799439012"


def _make_token(claims, secret=SECRET, exp_delta=300):
    now = int(time.time())
    payload = {"iat": now, "exp": now + exp_delta, **claims}
    return jwt.encode(payload, secret, algorithm="HS256")


# ------------------------------- decode_token ------------------------------- #

def test_decode_token_valid_user_scope():
    token = _make_token({"sub": "x@example.com", "email": "x@example.com", "is_guest": False, "scope": "user"})
    claims = decode_token(token, expected_scope="user")
    assert claims["email"] == "x@example.com"


def test_decode_token_rejects_expired():
    token = _make_token({"scope": "user"}, exp_delta=-10)
    with pytest.raises(HTTPException) as exc:
        decode_token(token, expected_scope="user")
    assert exc.value.status_code == 401


def test_decode_token_rejects_bad_signature():
    token = _make_token({"scope": "user"}, secret="wrong-secret")
    with pytest.raises(HTTPException) as exc:
        decode_token(token, expected_scope="user")
    assert exc.value.status_code == 401


def test_decode_token_rejects_wrong_scope():
    token = _make_token({"scope": "service"})
    with pytest.raises(HTTPException) as exc:
        decode_token(token, expected_scope="user")
    assert exc.value.status_code == 401


# ----------------------------- get_current_user ----------------------------- #

async def test_get_current_user_guest_uses_sub_directly():
    token = _make_token({"sub": "guest_123", "email": "guest_123@anonymous.com", "is_guest": True, "scope": "user"})
    result = await get_current_user(authorization=f"Bearer {token}")
    assert result == {"user_id": "guest_123", "email": "guest_123@anonymous.com", "is_guest": True}


@patch("api.utils.auth.users")
async def test_get_current_user_loggedin_resolves_email_to_id(mock_users):
    from bson import ObjectId
    mock_users.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_OBJECT_ID), "email": "a@b.com"})
    token = _make_token({"sub": "a@b.com", "email": "a@b.com", "is_guest": False, "scope": "user"})
    result = await get_current_user(authorization=f"Bearer {token}")
    assert result == {"user_id": FAKE_OBJECT_ID, "email": "a@b.com", "is_guest": False}


@patch("api.utils.auth.users")
async def test_get_current_user_loggedin_unknown_email_401(mock_users):
    mock_users.find_one = AsyncMock(return_value=None)
    token = _make_token({"sub": "a@b.com", "email": "a@b.com", "is_guest": False, "scope": "user"})
    with pytest.raises(HTTPException) as exc:
        await get_current_user(authorization=f"Bearer {token}")
    assert exc.value.status_code == 401


async def test_get_current_user_missing_header_401():
    with pytest.raises(HTTPException) as exc:
        await get_current_user(authorization=None)
    assert exc.value.status_code == 401


async def test_get_current_user_malformed_header_401():
    with pytest.raises(HTTPException) as exc:
        await get_current_user(authorization="NotBearer xyz")
    assert exc.value.status_code == 401


# --------------------------- require_service_token -------------------------- #

async def test_require_service_token_accepts_service_scope():
    token = _make_token({"scope": "service"})
    # Should not raise
    await require_service_token(authorization=f"Bearer {token}")


async def test_require_service_token_rejects_user_scope():
    token = _make_token({"scope": "user"})
    with pytest.raises(HTTPException) as exc:
        await require_service_token(authorization=f"Bearer {token}")
    assert exc.value.status_code == 401
