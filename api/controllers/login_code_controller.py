# Passwordless email login codes (QRAI-82).
import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta

import certifi
import httpx
import motor.motor_asyncio as motor
from fastapi import HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# ---------------------------- INITIALIAZE CLIENT ---------------------------- #
mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
login_codes = db.get_collection("login_codes")

# ------------------------------- TUNING KNOBS ------------------------------- #
CODE_TTL_SECONDS = 600          # code valid for 10 minutes
RESEND_COOLDOWN_SECONDS = 60    # min gap between sends to one email
MAX_ATTEMPTS = 5                # wrong-code guesses before invalidation
SEND_WINDOW_SECONDS = 3600      # hourly send window
MAX_SENDS_PER_WINDOW = 5        # max sends per email per window

RESEND_API_URL = "https://api.resend.com/emails"

_index_ensured = False


async def _ensure_ttl_index():
    # Idempotent: Mongo no-ops if the index already exists. Deletes a doc once
    # `expires_at` is reached, so stale codes self-clean.
    global _index_ensured
    if not _index_ensured:
        await login_codes.create_index("expires_at", expireAfterSeconds=0)
        _index_ensured = True


def _hash_code(email: str, code: str) -> str:
    # HMAC binds the code to the email and peppers it with the backend secret,
    # so a DB leak never exposes a usable code.
    secret = os.environ["BACKEND_JWT_SECRET"].encode()
    return hmac.new(secret, f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------- #
#                               REQUEST A CODE                                 #
# ---------------------------------------------------------------------------- #

async def request_login_code(email: str):
    try:
        await _ensure_ttl_index()
        email = email.strip().lower()
        now = datetime.utcnow()
        existing = await login_codes.find_one({"email": email})

        # Hourly send window: reuse the open window, else start a fresh one.
        if (
            existing
            and existing.get("window_start")
            and (now - existing["window_start"]).total_seconds() < SEND_WINDOW_SECONDS
        ):
            window_start = existing["window_start"]
            send_count = existing.get("send_count", 0)
        else:
            window_start = now
            send_count = 0

        if send_count >= MAX_SENDS_PER_WINDOW:
            raise HTTPException(status_code=429, detail="TooManyRequests")

        if (
            existing
            and existing.get("last_sent_at")
            and (now - existing["last_sent_at"]).total_seconds() < RESEND_COOLDOWN_SECONDS
        ):
            raise HTTPException(status_code=429, detail="ResendCooldown")

        code = str(secrets.randbelow(900000) + 100000)  # always 6 digits, no leading zero
        await login_codes.replace_one(
            {"email": email},
            {
                "email": email,
                "code_hash": _hash_code(email, code),
                "expires_at": now + timedelta(seconds=CODE_TTL_SECONDS),
                "attempts": 0,
                "last_sent_at": now,
                "window_start": window_start,
                "send_count": send_count + 1,
            },
            upsert=True,
        )

        await send_login_code_email(email, code)
        return JSONResponse(content={"message": "Code sent"})
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in request_login_code", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------- #
#                                 SEND EMAIL                                   #
# ---------------------------------------------------------------------------- #

async def send_login_code_email(email: str, code: str):
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("EMAIL_FROM", "Q-Art <login@qr-ai.co>")
    if not api_key:
        logger.error("RESEND_API_KEY not set; cannot send login code email")
        raise HTTPException(status_code=500, detail="EmailNotConfigured")

    payload = {
        "from": sender,
        "to": [email],
        "subject": "Your Q-Art login code",
        "text": f"Your Q-Art login code is {code}. It expires in 10 minutes.",
        "html": (
            f"<p>Your Q-Art login code is <strong>{code}</strong>.</p>"
            f"<p>It expires in 10 minutes.</p>"
        ),
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=10.0)) as http_client:
        resp = await http_client.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
    if resp.status_code >= 400:
        logger.error("Resend send failed: %s %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="EmailSendFailed")


# verify_login_code is implemented in Task 2; stub keeps the module importable.
async def verify_login_code(email: str, code: str):
    raise NotImplementedError
