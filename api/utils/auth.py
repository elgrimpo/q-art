# Token verification + identity resolution for QRAI-32.
import os
import jwt
from fastapi import Header, HTTPException
import certifi
import motor.motor_asyncio as motor
SECRET = os.environ["BACKEND_JWT_SECRET"]
ALGORITHM = "HS256"

# Mongo client (same pattern as the controllers)
_client = motor.AsyncIOMotorClient(os.environ["MONGO_URL"], tlsCAFile=certifi.where())
users = _client.get_database("QART").get_collection("users")


def decode_token(token: str, expected_scope: str) -> dict:
    try:
        claims = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if claims.get("scope") != expected_scope:
        raise HTTPException(status_code=401, detail="Invalid token scope")
    return claims


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization[len("Bearer "):]


async def get_current_user(authorization: str = Header(None)) -> dict:
    token = _extract_bearer(authorization)
    claims = decode_token(token, expected_scope="user")
    email = claims.get("email")
    is_guest = bool(claims.get("is_guest"))

    if is_guest:
        sub = claims.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token claims")
        return {"user_id": sub, "email": email, "is_guest": True}

    if not email:
        raise HTTPException(status_code=401, detail="Invalid token claims")
    user = await users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"user_id": str(user["_id"]), "email": email, "is_guest": False}


async def require_service_token(authorization: str = Header(None)) -> None:
    token = _extract_bearer(authorization)
    decode_token(token, expected_scope="service")
