"""
Shared fixtures for the e2e integration suite.

All tests write to the real QART database and clean up after themselves.
Run with: pytest api/tests/e2e/ -v --co  (to list without running)
          pytest api/tests/e2e/ -v        (to run all e2e tests)
"""
import os
import time
import jwt
import pytest
import motor.motor_asyncio as motor
import certifi


@pytest.fixture(scope="session")
def mongo_db():
    """Motor connection to QART (production DB). Cleaned up after the session."""
    mongo_url = os.environ["MONGO_URL"]
    _tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
    client = motor.AsyncIOMotorClient(mongo_url, **_tls)
    db = client.get_database("QART")
    yield db
    client.close()


def mint_guest_jwt(guest_id: str) -> str:
    """Return a signed user-scoped JWT for a guest identity."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {
            "sub": guest_id,
            "email": f"{guest_id}@anonymous.com",
            "is_guest": True,
            "scope": "user",
            "iat": now,
            "exp": now + 3600,
        },
        secret,
        algorithm="HS256",
    )


def mint_service_jwt() -> str:
    """Return a signed service-scoped JWT for /api/user/auth calls."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {"scope": "service", "iat": now, "exp": now + 3600},
        secret,
        algorithm="HS256",
    )


def mint_user_jwt(user_id: str, email: str) -> str:
    """Return a signed user-scoped JWT for a real (non-guest) identity."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {
            "sub": email,
            "email": email,
            "is_guest": False,
            "scope": "user",
            "iat": now,
            "exp": now + 3600,
        },
        secret,
        algorithm="HS256",
    )
