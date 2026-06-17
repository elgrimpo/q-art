# QRAI-82 — Passwordless Email-Code Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a passwordless email login (6-digit code) alongside the existing Google OAuth, with no passwords stored.

**Architecture:** A new next-auth `email-code` Credentials provider (mirrors the existing guest Credentials provider, so no DB adapter is needed). Code issuance/verification lives in a new focused FastAPI controller (`login_code_controller.py`) backed by a new `login_codes` Mongo collection with a TTL index. User upsert + guest-image transfer reuse the existing `/api/user/auth` path — the new endpoints only issue and verify codes. Email is sent via Resend's REST API over `httpx`.

**Tech Stack:** Next.js 14 (App Router) + next-auth v4, FastAPI + Motor (MongoDB), Resend (email), pytest + Jest.

**Spec:** [docs/superpowers/specs/2026-06-17-qrai-82-passwordless-email-login-design.md](../specs/2026-06-17-qrai-82-passwordless-email-login-design.md)

---

## File Structure

**Backend (create):**
- `api/controllers/login_code_controller.py` — `request_login_code()`, `verify_login_code()`, `send_login_code_email()`, plus the `login_codes` collection + TTL-index helper and code-hashing helper.
- `api/tests/test_login_code.py` — unit tests for the controller.

**Backend (modify):**
- `api/schemas/schemas.py` — add `LoginCodeRequest`, `LoginCodeVerify` Pydantic models.
- `api/main.py` — wire `POST /api/user/request-code` and `POST /api/user/verify-code`, both service-token gated.
- `api/tests/conftest.py` — add `RESEND_API_KEY` / `EMAIL_FROM` defaults.

**Frontend (create):**
- `src/app/api/auth/request-code/route.js` — public route handler that validates the email, mints a service token, and proxies to FastAPI.
- `src/__tests__/requestCodeRoute.test.js` — tests for the route handler.
- `src/__tests__/signInForm.test.js` — component test for the two-step form.

**Frontend (modify):**
- `src/app/api/auth/[...nextauth]/route.js` — add the `email-code` provider; extend `jwt` + `signIn` callbacks.
- `src/app/api/auth/signin/signIn.js` — two-step UI (email → code), keep Google.

**Docs/config (modify):**
- `.env` — add `RESEND_API_KEY`, `EMAIL_FROM` (local).
- `codebase/CLAUDE.md` — note the new env vars + endpoints.

> **Design refinement vs. spec:** the spec said the `login_codes` collection would live in `users_controller.py`. The plan puts it in a dedicated `login_code_controller.py` instead — it keeps `users_controller.py` focused and matches the repo's one-module-per-domain convention. `verify_login_code` does **not** upsert the user (the `signIn` callback's existing `/api/user/auth` call still owns that), so the new controller needs only the `login_codes` collection — fully self-contained.

---

## Task 1: Backend — request a login code

**Files:**
- Create: `api/controllers/login_code_controller.py`
- Test: `api/tests/test_login_code.py`

- [ ] **Step 1: Write the failing tests**

Create `api/tests/test_login_code.py`:

```python
import os
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from api.controllers.login_code_controller import (
    request_login_code,
    verify_login_code,
    _hash_code,
)

EMAIL = "user@example.com"


# ------------------------------ REQUEST CODE ------------------------------- #

@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_stores_hashed_code_and_sends(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value=None)
    mock_codes.replace_one = AsyncMock()

    result = await request_login_code(EMAIL)

    assert isinstance(result, JSONResponse)
    mock_send.assert_awaited_once()
    sent_email, sent_code = mock_send.await_args.args
    assert sent_email == EMAIL
    assert len(sent_code) == 6 and sent_code.isdigit()

    stored = mock_codes.replace_one.await_args.args[1]
    # The plaintext code is never stored; only its hash.
    assert stored["code_hash"] == _hash_code(EMAIL, sent_code)
    assert stored["code_hash"] != sent_code
    assert stored["attempts"] == 0
    assert stored["expires_at"] > datetime.utcnow()


@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_enforces_resend_cooldown(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value={
        "email": EMAIL,
        "last_sent_at": datetime.utcnow(),       # just sent
        "window_start": datetime.utcnow(),
        "send_count": 1,
    })
    mock_codes.replace_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await request_login_code(EMAIL)

    assert exc.value.status_code == 429
    assert exc.value.detail == "ResendCooldown"
    mock_send.assert_not_awaited()


@patch("api.controllers.login_code_controller.send_login_code_email", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller._ensure_ttl_index", new_callable=AsyncMock)
@patch("api.controllers.login_code_controller.login_codes")
async def test_request_enforces_hourly_send_cap(mock_codes, _idx, mock_send):
    mock_codes.find_one = AsyncMock(return_value={
        "email": EMAIL,
        "last_sent_at": datetime.utcnow() - timedelta(minutes=5),  # past cooldown
        "window_start": datetime.utcnow() - timedelta(minutes=10), # window still open
        "send_count": 5,                                           # cap reached
    })
    mock_codes.replace_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await request_login_code(EMAIL)

    assert exc.value.status_code == 429
    assert exc.value.detail == "TooManyRequests"
    mock_send.assert_not_awaited()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest api/tests/test_login_code.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.controllers.login_code_controller'`

- [ ] **Step 3: Write the implementation**

Create `api/controllers/login_code_controller.py`:

```python
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
```

> **Note on the hourly cap:** the `login_codes` doc is TTL-deleted ~10 min after the last send, so an idle user's send window resets — the cap is best-effort burst protection. The 60s cooldown is the primary spam brake; per-IP limits + CAPTCHA are deferred (see spec "Out of scope").

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest api/tests/test_login_code.py -v`
Expected: PASS (3 request-code tests)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/login_code_controller.py api/tests/test_login_code.py
git commit -m "feat(qrai-82): issue passwordless login codes via Resend"
```

---

## Task 2: Backend — verify a login code

**Files:**
- Modify: `api/controllers/login_code_controller.py`
- Test: `api/tests/test_login_code.py`

- [ ] **Step 1: Write the failing tests**

Append to `api/tests/test_login_code.py`:

```python
# ------------------------------- VERIFY CODE ------------------------------- #

def _valid_doc(code, **overrides):
    base = {
        "email": EMAIL,
        "code_hash": _hash_code(EMAIL, code),
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "attempts": 0,
    }
    base.update(overrides)
    return base


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_success_returns_name_and_clears_code(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456"))
    mock_codes.delete_one = AsyncMock()

    result = await verify_login_code(EMAIL, "123456")

    assert isinstance(result, JSONResponse)
    mock_codes.delete_one.assert_awaited_once_with({"email": EMAIL})


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_wrong_code_increments_attempts(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456"))
    mock_codes.update_one = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "000000")

    assert exc.value.status_code == 400
    assert exc.value.detail == "InvalidCode"
    inc = mock_codes.update_one.await_args.args[1]
    assert inc["$inc"]["attempts"] == 1


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_no_code_is_invalid(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "InvalidCode"


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_expired_code(mock_codes):
    mock_codes.find_one = AsyncMock(
        return_value=_valid_doc("123456", expires_at=datetime.utcnow() - timedelta(seconds=1))
    )
    mock_codes.delete_one = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "CodeExpired"


@patch("api.controllers.login_code_controller.login_codes")
async def test_verify_locks_out_after_max_attempts(mock_codes):
    mock_codes.find_one = AsyncMock(return_value=_valid_doc("123456", attempts=5))
    with pytest.raises(HTTPException) as exc:
        await verify_login_code(EMAIL, "123456")
    assert exc.value.detail == "TooManyAttempts"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest api/tests/test_login_code.py -k verify -v`
Expected: FAIL — `ImportError: cannot import name 'verify_login_code'` (or AttributeError)

- [ ] **Step 3: Write the implementation**

Append to `api/controllers/login_code_controller.py`:

```python
# ---------------------------------------------------------------------------- #
#                                VERIFY A CODE                                 #
# ---------------------------------------------------------------------------- #

async def verify_login_code(email: str, code: str):
    try:
        email = email.strip().lower()
        now = datetime.utcnow()
        doc = await login_codes.find_one({"email": email})

        if not doc:
            raise HTTPException(status_code=400, detail="InvalidCode")
        if doc["expires_at"] < now:
            await login_codes.delete_one({"email": email})
            raise HTTPException(status_code=400, detail="CodeExpired")
        if doc.get("attempts", 0) >= MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail="TooManyAttempts")
        if not hmac.compare_digest(doc["code_hash"], _hash_code(email, code)):
            await login_codes.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(status_code=400, detail="InvalidCode")

        await login_codes.delete_one({"email": email})
        # Suggested display name for brand-new users; the signIn callback's
        # /api/user/auth call owns the actual upsert + guest-image transfer.
        return JSONResponse(content={"name": email.split("@")[0]})
    except HTTPException:
        raise
    except Exception:
        logger.error("Error in verify_login_code", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest api/tests/test_login_code.py -v`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/login_code_controller.py api/tests/test_login_code.py
git commit -m "feat(qrai-82): verify login codes with expiry + attempt lockout"
```

---

## Task 3: Backend — wire the routes

**Files:**
- Modify: `api/schemas/schemas.py` (after the `UserAuth` class, around line 51)
- Modify: `api/main.py` (imports near line 23-26; routes after the `/api/user/auth` route near line 82)
- Test: `api/tests/test_login_code.py`

- [ ] **Step 1: Write the failing tests**

Append to `api/tests/test_login_code.py`:

```python
# ------------------------------ ROUTE WIRING ------------------------------- #

@patch("api.main.request_login_code", new_callable=AsyncMock)
async def test_request_code_endpoint_delegates(mock_req):
    from api.main import request_code_endpoint
    from api.schemas.schemas import LoginCodeRequest

    await request_code_endpoint(LoginCodeRequest(email=EMAIL), _=None)
    mock_req.assert_awaited_once_with(EMAIL)


@patch("api.main.verify_login_code", new_callable=AsyncMock)
async def test_verify_code_endpoint_delegates(mock_verify):
    from api.main import verify_code_endpoint
    from api.schemas.schemas import LoginCodeVerify

    await verify_code_endpoint(LoginCodeVerify(email=EMAIL, code="123456"), _=None)
    mock_verify.assert_awaited_once_with(EMAIL, "123456")
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest api/tests/test_login_code.py -k endpoint -v`
Expected: FAIL — `ImportError: cannot import name 'request_code_endpoint' from 'api.main'`

- [ ] **Step 3a: Add the Pydantic models**

In `api/schemas/schemas.py`, add after the `UserAuth` class (after line 51):

```python
class LoginCodeRequest(BaseModel):
    email: str

class LoginCodeVerify(BaseModel):
    email: str
    code: str
```

- [ ] **Step 3b: Wire the routes**

In `api/main.py`, extend the controller import (near line 23):

```python
from api.controllers.users_controller import get_user_info, authenticate_user
from api.controllers.login_code_controller import request_login_code, verify_login_code
```

Extend the schema import (near line 26):

```python
from api.schemas.schemas import User, UserAuth, LoginCodeRequest, LoginCodeVerify
```

Add the routes right after the `/api/user/auth` route (after line 82):

```python
# REQUEST EMAIL LOGIN CODE (service-token protected)
@app.post("/api/user/request-code")
async def request_code_endpoint(body: LoginCodeRequest, _: None = Depends(require_service_token)):
    return await request_login_code(body.email)

# VERIFY EMAIL LOGIN CODE (service-token protected)
@app.post("/api/user/verify-code")
async def verify_code_endpoint(body: LoginCodeVerify, _: None = Depends(require_service_token)):
    return await verify_login_code(body.email, body.code)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest api/tests/test_login_code.py -v && pytest api/tests/ -q`
Expected: PASS (login_code suite green; full suite still green)

- [ ] **Step 5: Commit**

```bash
git add api/main.py api/schemas/schemas.py api/tests/test_login_code.py
git commit -m "feat(qrai-82): add request-code + verify-code routes"
```

---

## Task 4: Frontend — request-code route handler

**Files:**
- Create: `src/app/api/auth/request-code/route.js`
- Test: `src/__tests__/requestCodeRoute.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/requestCodeRoute.test.js`:

```javascript
/**
 * @jest-environment node
 */
jest.mock('@/_utils/backendAuth', () => ({ getServiceToken: jest.fn() }))

import { getServiceToken } from '@/_utils/backendAuth'
import { POST } from '../app/api/auth/request-code/route'

afterEach(() => jest.clearAllMocks())

test('proxies to the backend with a service token', async () => {
  getServiceToken.mockResolvedValue('svc-token')
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend'
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

  const req = { json: async () => ({ email: 'a@b.com' }) }
  const res = await POST(req)

  expect(res.status).toBe(200)
  expect(global.fetch).toHaveBeenCalledWith(
    'http://backend/api/user/request-code',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer svc-token' }),
    })
  )
})

test('rejects an invalid email without calling the backend', async () => {
  global.fetch = jest.fn()
  const req = { json: async () => ({ email: 'not-an-email' }) }
  const res = await POST(req)

  expect(res.status).toBe(400)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('forwards a backend error detail and status', async () => {
  getServiceToken.mockResolvedValue('svc-token')
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend'
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 429,
    json: async () => ({ detail: 'ResendCooldown' }),
  })

  const req = { json: async () => ({ email: 'a@b.com' }) }
  const res = await POST(req)
  const body = await res.json()

  expect(res.status).toBe(429)
  expect(body.error).toBe('ResendCooldown')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/requestCodeRoute.test.js`
Expected: FAIL — cannot find module `../app/api/auth/request-code/route`

- [ ] **Step 3: Write the implementation**

Create `src/app/api/auth/request-code/route.js`:

```javascript
import { NextResponse } from "next/server";
import { getServiceToken } from "@/_utils/backendAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "InvalidRequest" }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "InvalidEmail" }, { status: 400 });
  }

  const token = await getServiceToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/request-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ error: body.detail || "RequestFailed" }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/requestCodeRoute.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/request-code/route.js src/__tests__/requestCodeRoute.test.js
git commit -m "feat(qrai-82): add request-code proxy route handler"
```

---

## Task 5: Frontend — `email-code` provider + callbacks

**Files:**
- Modify: `src/app/api/auth/[...nextauth]/route.js`

No new automated test — next-auth `authOptions` callbacks are exercised end-to-end by the manual verification in Task 7. Keep the change minimal and mirror the existing Google branch exactly.

- [ ] **Step 1: Add the provider**

In `src/app/api/auth/[...nextauth]/route.js`, add a third provider after the `anonymous` `CredentialsProvider` (after line 34, before the closing `]` of `providers`):

```javascript
    CredentialsProvider({
      id: "email-code",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const code = credentials?.code;
        if (!email || !code) return null;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/verify-code`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await getServiceToken()}`,
            },
            body: JSON.stringify({ email, code }),
          }
        );
        if (!res.ok) return null;            // invalid/expired → sign-in fails
        const data = await res.json();
        return { email, name: data.name, is_guest: false };
      },
    }),
```

- [ ] **Step 2: Treat `email-code` like a real login in the `jwt` callback**

In the `jwt` callback, alongside the existing Google branch (after line 63), add:

```javascript
      // Handle email-code sign in
      if (account?.provider === "email-code") {
        token.is_guest = false;
        delete token.credits;
      }
```

- [ ] **Step 3: Route `email-code` through the existing upsert in the `signIn` callback**

Replace the body of the `signIn` callback (lines 81-129) so Google and email-code share one upsert path:

```javascript
    async signIn({ user, account }) {
      const session = await getServerSession(authOptions);

      const isGoogle = account?.provider === "google";
      const isEmailCode = account?.provider === "email-code";

      if (isGoogle || isEmailCode) {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;
        const authProvider = isGoogle
          ? { provider: "google", providerId: account.providerAccountId }
          : { provider: "email", providerId: user.email };

        const userData = {
          name: user.name,
          email: user.email,
          auth_providers: [authProvider],
          guest_id: session?.user?._id,
        };

        try {
          const serviceToken = await getServiceToken();
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceToken}`,
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to authenticate user:", errorText);
            return false;
          }
          return true;
        } catch (error) {
          console.error("Error authenticating user:", error);
          return false;
        }
      }

      return true;
    },
```

- [ ] **Step 4: Verify the app still boots and existing auth tests pass**

Run: `npx jest src/__tests__/backendAuth.test.js && npm run lint`
Expected: PASS / no new lint errors. (Full sign-in is verified manually in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/\[...nextauth\]/route.js
git commit -m "feat(qrai-82): add email-code provider and route it through /api/user/auth"
```

---

## Task 6: Frontend — two-step sign-in UI

**Files:**
- Modify: `src/app/api/auth/signin/signIn.js`
- Test: `src/__tests__/signInForm.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/signInForm.test.js`:

```javascript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: () => ({ data: null }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

import SignIn from '../app/api/auth/signin/signIn'

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
})
afterEach(() => jest.clearAllMocks())

test('sends a code and advances to the code-entry step', async () => {
  render(<SignIn />)

  await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
  await userEvent.click(screen.getByRole('button', { name: /continue with email/i }))

  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/request-code',
      expect.objectContaining({ method: 'POST' })
    )
  )
  expect(await screen.findByLabelText(/code/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/__tests__/signInForm.test.js`
Expected: FAIL — no element with label matching `/email/i` / no "Continue with email" button.

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `src/app/api/auth/signin/signIn.js`:

```javascript
"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Button,
  Box,
  Typography,
  Stack,
  TextField,
  Divider,
  Link,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

const ERROR_MESSAGES = {
  InvalidEmail: "Please enter a valid email address.",
  ResendCooldown: "Please wait a moment before requesting another code.",
  TooManyRequests: "Too many code requests. Try again later.",
  RequestFailed: "Couldn't send the code. Please try again.",
};

export default function SignIn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const handleAnonymousSignIn = async () => {
      const isAnonymous = searchParams.get("anonymous") === "true";
      if (isAnonymous) {
        try {
          const result = await signIn("anonymous", {
            redirect: false,
            callbackUrl: "/generate",
          });
          if (result?.error) {
            console.error("SignIn: Anonymous sign in failed:", result.error);
          } else if (result?.url) {
            router.push(result.url);
          }
        } catch (err) {
          console.error("SignIn: Error during anonymous sign in:", err);
        }
      }
    };
    handleAnonymousSignIn();
  }, [searchParams, router]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/generate" });
  };

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(ERROR_MESSAGES[body.error] || ERROR_MESSAGES.RequestFailed);
        return;
      }
      setStep("code");
      setCooldown(60);
    } catch {
      setError(ERROR_MESSAGES.RequestFailed);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("email-code", {
        email,
        code,
        redirect: false,
        callbackUrl: "/generate",
      });
      if (result?.error) {
        setError("That code is invalid or expired. Please try again.");
      } else if (result?.url) {
        router.push(result.url);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "320px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        backgroundColor: "white",
      }}
    >
      <Stack useFlexGap spacing={2} sx={{ width: "100%" }}>
        <Typography variant="h5" align="center">
          Sign in to QR AI
        </Typography>

        {step === "email" && (
          <>
            <Button
              startIcon={<GoogleIcon />}
              variant="contained"
              color="primary"
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>

            <Divider>or</Divider>

            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              disabled={loading || !email}
              onClick={sendCode}
            >
              Continue with email
            </Button>
          </>
        )}

        {step === "code" && (
          <>
            <Typography variant="body2" align="center">
              We sent a 6-digit code to <strong>{email}</strong>.
            </Typography>
            <TextField
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              fullWidth
            />
            <Button
              variant="contained"
              color="primary"
              disabled={loading || code.length < 6}
              onClick={verifyCode}
            >
              Verify & sign in
            </Button>
            <Button
              variant="text"
              disabled={cooldown > 0 || loading}
              onClick={sendCode}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </Button>
            <Link
              component="button"
              variant="body2"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
            >
              Use a different email
            </Link>
          </>
        )}

        {error && (
          <Typography variant="body2" color="error" align="center">
            {error}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/__tests__/signInForm.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/signin/signIn.js src/__tests__/signInForm.test.js
git commit -m "feat(qrai-82): two-step email-code sign-in UI"
```

---

## Task 7: Config, docs & manual verification

**Files:**
- Modify: `.env` (local only — do NOT commit secrets)
- Modify: `api/tests/conftest.py`
- Modify: `codebase/CLAUDE.md`

- [ ] **Step 1: Add backend env vars locally**

Add to `.env` (real values from your Resend dashboard):

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Q-Art <login@qr-ai.co>
```

- [ ] **Step 2: Add test defaults**

In `api/tests/conftest.py`, add alongside the other `setdefault` calls:

```python
os.environ.setdefault("RESEND_API_KEY", "re_test_placeholder")
os.environ.setdefault("EMAIL_FROM", "Q-Art <login@test.local>")
```

- [ ] **Step 3: Document the new surface**

In `codebase/CLAUDE.md`, under "Environment Variables", add:

```
- `RESEND_API_KEY` / `EMAIL_FROM` — passwordless email-code login (QRAI-82); FastAPI sends 6-digit codes via Resend.
```

And under the "Auth model" section, add a sentence:

> Email login (QRAI-82): `POST /api/user/request-code` + `POST /api/user/verify-code` (both service-token gated) issue/verify a 6-digit code stored hashed in `login_codes` (TTL-indexed); the `email-code` next-auth provider then upserts via the same `/api/user/auth` path as Google.

- [ ] **Step 4: Run the full test suites**

Run: `pytest api/tests/ -q && npm run test:frontend`
Expected: All green.

- [ ] **Step 5: Manual end-to-end verification**

Prerequisite: verify your domain in Resend (DNS records on qr-ai.co), or set `EMAIL_FROM=onboarding@resend.dev` and send only to your own address for first testing.

1. `npm run dev`, open `http://localhost:3000`, go to sign-in.
2. Enter your email → "Continue with email" → confirm the code arrives.
3. Enter the code → confirm you land on `/generate` signed in (not a guest).
4. As a guest, generate an image first, then sign in by email with the **same** address you'd use for Google → confirm the guest image transfers and you're in one account.
5. Enter a wrong code 5× → confirm lockout; request a new code → confirm the 60s resend cooldown shows.

- [ ] **Step 6: Commit**

```bash
git add api/tests/conftest.py codebase/CLAUDE.md
git commit -m "chore(qrai-82): test defaults + docs for email-code login"
```

---

## Self-Review

**Spec coverage:**
- Passwordless 6-digit code → Tasks 1, 2, 6. ✓
- Credentials provider, no adapter → Task 5. ✓
- Reuse `/api/user/auth` upsert + guest transfer → Task 5 (signIn callback). ✓
- New `request-code` / `verify-code`, service-token gated → Task 3. ✓
- `login_codes` collection + TTL index, hashed codes → Task 1. ✓
- Security defaults (10-min TTL, 5 attempts, 60s cooldown, hourly cap, hashing) → Tasks 1, 2. ✓
- Account linking by email → handled by existing `/api/user/auth`; verified in Task 7 step 5.4. ✓
- Name defaults to email local part → Task 2 (`verify_login_code` return) + Task 5 (passed to `/api/user/auth`). ✓
- Two-step UI with resend + back → Task 6. ✓
- Resend via env vars → Tasks 1, 7. ✓
- Tests (backend security logic; frontend route + form) → Tasks 1-4, 6. ✓
- YAGNI (no magic link / password reset / CAPTCHA) → honored. ✓

**Type/name consistency:** `request_login_code(email)`, `verify_login_code(email, code)`, `send_login_code_email(email, code)`, `_hash_code(email, code)`, `_ensure_ttl_index()`, collection `login_codes`, provider id `email-code`, route paths `/api/user/request-code` + `/api/user/verify-code` + `/api/auth/request-code` — used identically across all tasks. Error details (`InvalidCode`, `CodeExpired`, `TooManyAttempts`, `ResendCooldown`, `TooManyRequests`) consistent between controller and tests.

**Placeholder scan:** none — every step has concrete code/commands.
