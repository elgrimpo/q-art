# QRAI-32 Backend Authentication & Authorization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the FastAPI backend trusting client-supplied `user_id`/`email`; derive a verified identity from a short-lived signed JWT minted by Next.js, and add ownership checks to mutating endpoints.

**Architecture:** Next.js (which holds the verified next-auth session) mints an HS256 JWT signed with a shared secret `BACKEND_JWT_SECRET` and sends it as `Authorization: Bearer <token>` on every server-side call to FastAPI. FastAPI verifies the signature/expiry, resolves the canonical Mongo `user_id` (guest id used directly; logged-in email resolved to `_id`), and enforces ownership on delete/upscale. Query-string identity is ignored on protected routes.

**Tech Stack:** FastAPI + PyJWT (new) on the backend; Next.js 14 server actions + `jose` (already present via next-auth) on the frontend. Tests: pytest/pytest-asyncio (backend), Jest (frontend).

**Spec:** `docs/superpowers/specs/2026-06-10-qrai-32-backend-auth-design.md`

---

## Conventions used in this plan

- Run backend tests with the project venv: `api/venv/bin/python -m pytest` (from repo root `codebase/`).
- Run frontend tests with: `npm run test:frontend`.
- The shared secret in tests is `BACKEND_JWT_SECRET="test-backend-secret"` (added to `conftest.py`).
- Token claims: `{ "sub": <id>, "email": <email>, "is_guest": <bool>, "scope": "user"|"service", "iat": <int>, "exp": <int> }`.

---

## Task 1: Add PyJWT dependency and test secret

**Files:**
- Modify: `requirements.txt`
- Modify: `api/tests/conftest.py`

- [ ] **Step 1: Add PyJWT to requirements**

In `requirements.txt`, add this line (alphabetical-ish, near `pydantic`):

```
PyJWT==2.8.0
```

- [ ] **Step 2: Install it into the venv**

Run: `api/venv/bin/python -m pip install PyJWT==2.8.0`
Expected: `Successfully installed PyJWT-2.8.0`

- [ ] **Step 3: Add the test secret to conftest**

In `api/tests/conftest.py`, add alongside the other `os.environ.setdefault(...)` lines:

```python
os.environ.setdefault("BACKEND_JWT_SECRET", "test-backend-secret")
```

- [ ] **Step 4: Verify import works**

Run: `api/venv/bin/python -c "import jwt; print(jwt.__version__)"`
Expected: prints `2.8.0`

- [ ] **Step 5: Commit**

```bash
git add requirements.txt api/tests/conftest.py
git commit -m "chore: add PyJWT dependency and test secret for QRAI-32"
```

---

## Task 2: Backend auth module — token verification + identity resolution

**Files:**
- Create: `api/utils/auth.py`
- Create: `api/tests/test_auth.py`

The module exposes:
- `decode_token(token: str, expected_scope: str) -> dict` — verifies signature/expiry/scope, returns the raw claims. Raises `HTTPException(401)` on any problem.
- `get_current_user(authorization: str = Header(None)) -> dict` — FastAPI dependency for user routes. Returns `{"user_id", "email", "is_guest"}` (resolving email→`_id` for logged-in users).
- `require_service_token(authorization: str = Header(None)) -> None` — FastAPI dependency for the bootstrap route.

- [ ] **Step 1: Write the failing tests**

Create `api/tests/test_auth.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `api/venv/bin/python -m pytest api/tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.utils.auth'`

- [ ] **Step 3: Implement `api/utils/auth.py`**

```python
# Token verification + identity resolution for QRAI-32.
import os
import jwt
from fastapi import Header, HTTPException
import certifi
import motor.motor_asyncio as motor
from bson import ObjectId

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
        return {"user_id": claims.get("sub"), "email": email, "is_guest": True}

    user = await users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"user_id": str(user["_id"]), "email": email, "is_guest": False}


async def require_service_token(authorization: str = Header(None)) -> None:
    token = _extract_bearer(authorization)
    decode_token(token, expected_scope="service")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `api/venv/bin/python -m pytest api/tests/test_auth.py -v`
Expected: PASS (all 11 tests)

- [ ] **Step 5: Commit**

```bash
git add api/utils/auth.py api/tests/test_auth.py
git commit -m "feat: backend JWT auth module with identity resolution (QRAI-32)"
```

---

## Task 3: Ownership check in `delete_image` controller

**Files:**
- Modify: `api/controllers/images_controller.py` (`delete_image`)
- Modify: `api/tests/test_images.py`

`delete_image` currently takes only `id` and deletes S3 + DB with no ownership check. Change signature to `delete_image(id, user_id)`, load the image first, and raise `403` if `image["user_id"] != user_id`.

- [ ] **Step 1: Write the failing tests**

Add to `api/tests/test_images.py` (it already imports `delete_image`, `ObjectId`, `AsyncMock`, `MagicMock`, `patch`, `HTTPException`, and defines `_mock_s3_session`, `FAKE_IMAGE_ID`, `FAKE_USER_ID`):

```python
@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
@patch("api.controllers.images_controller.s3_session")
async def test_delete_image_rejects_non_owner(mock_s3_session, mock_images, mock_db):
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": "someone_else"})

    with pytest.raises(HTTPException) as exc:
        await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert exc.value.status_code == 403
    mock_s3_client.delete_object.assert_not_called()


@patch("api.controllers.images_controller.db")
@patch("api.controllers.images_controller.images")
@patch("api.controllers.images_controller.s3_session")
async def test_delete_image_allows_owner(mock_s3_session, mock_images, mock_db):
    mock_session, mock_s3_client = _mock_s3_session()
    mock_s3_session.client = mock_session.client
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "user_id": FAKE_USER_ID})
    delete_result = MagicMock(deleted_count=1)
    mock_db.__getitem__.return_value.delete_one = AsyncMock(return_value=delete_result)

    result = await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)

    assert result == {"message": "Image and document deleted successfully"}
    assert mock_s3_client.delete_object.call_count == 2


@patch("api.controllers.images_controller.images")
async def test_delete_image_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await delete_image(FAKE_IMAGE_ID, FAKE_USER_ID)
    assert exc.value.status_code == 404
```

Ensure `import pytest` is present at the top of `test_images.py` (it is).

- [ ] **Step 2: Run tests to verify they fail**

Run: `api/venv/bin/python -m pytest api/tests/test_images.py -k delete_image -v`
Expected: FAIL — `delete_image()` takes 1 positional arg but 2 given (and no ownership/404 logic).

- [ ] **Step 3: Implement the ownership check**

In `api/controllers/images_controller.py`, change the `delete_image` signature and add a load + checks at the top of the `try` block. Replace:

```python
async def delete_image(id: str):
    try:
        object_id = ObjectId(id)
        object_name = f"{id}.png"
```

with:

```python
async def delete_image(id: str, user_id: str):
    try:
        object_id = ObjectId(id)
        object_name = f"{id}.png"

        # --------------------------- OWNERSHIP CHECK -------------------------- #
        image = await images.find_one({"_id": object_id})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        if image.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this image")
```

(The existing `except HTTPException: raise` block already re-raises the 403/404 correctly.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `api/venv/bin/python -m pytest api/tests/test_images.py -k delete_image -v`
Expected: PASS

- [ ] **Step 5: Run the full images test file (no regressions)**

Run: `api/venv/bin/python -m pytest api/tests/test_images.py -v`
Expected: PASS (existing toggle_like / get_images tests still green)

- [ ] **Step 6: Commit**

```bash
git add api/controllers/images_controller.py api/tests/test_images.py
git commit -m "feat: ownership check on delete_image (QRAI-32)"
```

---

## Task 4: Ownership check in `upscale` controller

**Files:**
- Modify: `api/controllers/generate_controller.py` (`upscale`)
- Modify: `api/tests/test_upscale.py`

`upscale(image_id, user_id, resolution)` already loads `image` at the top. Add a not-found guard and an ownership check immediately after the load, before any credit work.

- [ ] **Step 1: Write the failing test**

Add to `api/tests/test_upscale.py` (it imports `upscale`, `AsyncMock`, `patch`, `HTTPException`, and defines `_fake_image`, `FAKE_IMAGE_ID`, `FAKE_USER_ID`):

```python
@patch("api.controllers.generate_controller.users")
@patch("api.controllers.generate_controller.images")
async def test_upscale_rejects_non_owner(mock_images, mock_users):
    img = _fake_image()
    img["user_id"] = "someone_else"
    mock_images.find_one = AsyncMock(return_value=img)
    mock_users.find_one = AsyncMock(return_value={"_id": FAKE_USER_ID, "credits": 1000})

    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, 1024)

    assert exc.value.status_code == 403
    # Credits must not be touched on a rejected upscale
    mock_users.find_one.assert_not_called()


@patch("api.controllers.generate_controller.images")
async def test_upscale_image_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await upscale(FAKE_IMAGE_ID, FAKE_USER_ID, 1024)
    assert exc.value.status_code == 404
```

Ensure `import pytest` is at the top of `test_upscale.py` (it is).

- [ ] **Step 2: Run tests to verify they fail**

Run: `api/venv/bin/python -m pytest api/tests/test_upscale.py -k "non_owner or not_found" -v`
Expected: FAIL — no 403/404 raised (the non-owner currently proceeds; the not-found currently crashes with `TypeError` on `image["width"]`).

- [ ] **Step 3: Implement the checks**

In `api/controllers/generate_controller.py`, in `upscale`, replace:

```python
async def upscale(image_id, user_id, resolution):
    try:
        # -------------------------------- CHECK FUNDS ------------------------------- #
        image = await images.find_one({"_id": ObjectId(image_id)})

        service_config = {
```

with:

```python
async def upscale(image_id, user_id, resolution):
    try:
        # -------------------------------- CHECK FUNDS ------------------------------- #
        image = await images.find_one({"_id": ObjectId(image_id)})

        # --------------------------- OWNERSHIP CHECK -------------------------- #
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        if image.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to upscale this image")

        service_config = {
```

The existing `except HTTPException: raise` block (near the bottom of `upscale`) re-raises 403/404 correctly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `api/venv/bin/python -m pytest api/tests/test_upscale.py -v`
Expected: PASS (new tests + existing upscale tests)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/test_upscale.py
git commit -m "feat: ownership check on upscale (QRAI-32)"
```

---

## Task 5: `get_user_info` returns only the caller's own document

**Files:**
- Modify: `api/controllers/users_controller.py` (`get_user_info`)
- Modify: `api/tests/test_users.py`

`get_user_info(email)` already looks up by email and 404s when missing — that behavior is correct once `email` comes from the verified token instead of the query string. The only change here is **defense in depth**: rename the parameter to make the trusted source explicit and keep the lookup. (The real enforcement happens at the route in Task 6, which passes the token email.) No signature change is strictly required, but add a test pinning the "returns the matched user" contract.

- [ ] **Step 1: Write the failing/contract test**

Look at `api/tests/test_users.py` first:

Run: `api/venv/bin/python -m pytest api/tests/test_users.py -v`
Expected: shows existing user tests (note their style).

Add this test to `api/tests/test_users.py` (match the existing import of `get_user_info` and `patch` target; if `get_user_info` is not yet imported there, add `from api.controllers.users_controller import get_user_info`):

```python
@patch("api.controllers.users_controller.users")
async def test_get_user_info_returns_matched_user(mock_users):
    from unittest.mock import AsyncMock
    mock_users.find_one = AsyncMock(return_value={
        "_id": "507f1f77bcf86cd799439012",
        "name": "A", "email": "a@b.com",
        "auth_providers": [], "credits": 10, "payment_history": [],
    })
    result = await get_user_info("a@b.com")
    assert result.email == "a@b.com"
    mock_users.find_one.assert_awaited_once_with({"email": "a@b.com"})
```

- [ ] **Step 2: Run the test**

Run: `api/venv/bin/python -m pytest api/tests/test_users.py -k returns_matched_user -v`
Expected: PASS already (this pins existing behavior). If it fails on imports, fix the import line and re-run until PASS.

- [ ] **Step 3: Commit**

```bash
git add api/tests/test_users.py
git commit -m "test: pin get_user_info returns only matched user (QRAI-32)"
```

---

## Task 6: Wire auth dependencies into the routes (`api/main.py`)

**Files:**
- Modify: `api/main.py`
- Test: `api/tests/test_http.py`

Apply `get_current_user` to user-scoped routes and `require_service_token` to `/api/user/auth`. Derive identity from the dependency; drop the query-string `user_id`/`email` from protected routes.

- [ ] **Step 1: Write failing route-level tests**

Look at `api/tests/test_http.py` first to match its `TestClient` style:

Run: `api/venv/bin/python -m pytest api/tests/test_http.py -v`
Expected: shows how the app is imported / client built.

Add tests asserting protected routes 401 without a token. Append to `api/tests/test_http.py` (adapt the client fixture/name to whatever the file already uses — assume `from fastapi.testclient import TestClient` and `from api.main import app`):

```python
def test_delete_requires_auth():
    client = TestClient(app)
    resp = client.delete("/api/images/delete/507f1f77bcf86cd799439011")
    assert resp.status_code == 401

def test_user_info_requires_auth():
    client = TestClient(app)
    resp = client.get("/api/user/info")
    assert resp.status_code == 401

def test_like_requires_auth():
    client = TestClient(app)
    resp = client.put("/api/images/like/507f1f77bcf86cd799439011")
    assert resp.status_code == 401

def test_user_auth_requires_service_token():
    client = TestClient(app)
    resp = client.post("/api/user/auth", json={
        "name": "x", "email": "x@y.com",
        "auth_providers": [{"provider": "google", "providerId": "1"}],
    })
    assert resp.status_code == 401

def test_public_images_get_no_auth():
    client = TestClient(app)
    resp = client.get("/api/images/get")
    # Public route: must NOT be 401 (may be 200 or a DB error, but never auth-blocked)
    assert resp.status_code != 401
```

- [ ] **Step 2: Run to verify they fail**

Run: `api/venv/bin/python -m pytest api/tests/test_http.py -k "requires_auth or service_token" -v`
Expected: FAIL — routes currently return 200/422/500, not 401.

- [ ] **Step 3: Update `api/main.py`**

Update imports near the top:

```python
from fastapi import FastAPI, Header, Depends
```

Add after the existing controller imports:

```python
from api.utils.auth import get_current_user, require_service_token
```

Replace the **USER**, **GENERATE**, **IMAGE**, and **PAYMENT** route definitions with token-aware versions. Replace this block:

```python
# GET USER INFO
@app.get("/api/user/info")
async def get_user_info_endpoint(email: Optional[str] = None):
    return await get_user_info(email)

# AUTHENTICATE USER
@app.post("/api/user/auth")
async def authenticate_user_endpoint(user_auth: UserAuth):
    return await authenticate_user(user_auth)
```

with:

```python
# GET USER INFO
@app.get("/api/user/info")
async def get_user_info_endpoint(current_user: dict = Depends(get_current_user)):
    return await get_user_info(current_user["email"])

# AUTHENTICATE USER (sign-in bootstrap; service-token protected)
@app.post("/api/user/auth")
async def authenticate_user_endpoint(user_auth: UserAuth, _: None = Depends(require_service_token)):
    return await authenticate_user(user_auth)
```

Replace the generate + upscale block:

```python
# GENERATE IMAGE
@app.get("/api/generate")
async def generate_endpoint(
    prompt,
    website,
    negative_prompt,
    seed,
    qr_weight,
    sd_model,
    user_id,
    style_prompt,
    style_title
):
    return await predict(
        prompt,
        website,
        negative_prompt,
        seed,
        qr_weight,
        sd_model,
        user_id,
        style_prompt,
        style_title
    )

# UPSCALE IMAGE
@app.get("/api/upscale/{image_id}")
async def upscale_endpoint(
    image_id,
    user_id,
    resolution
):
    return await upscale(
        image_id,
        user_id,
        resolution
    )
```

with (note `user_id` is now derived from the token, not the query string):

```python
# GENERATE IMAGE
@app.get("/api/generate")
async def generate_endpoint(
    prompt,
    website,
    negative_prompt,
    seed,
    qr_weight,
    sd_model,
    style_prompt,
    style_title,
    current_user: dict = Depends(get_current_user),
):
    return await predict(
        prompt,
        website,
        negative_prompt,
        seed,
        qr_weight,
        sd_model,
        current_user["user_id"],
        style_prompt,
        style_title
    )

# UPSCALE IMAGE
@app.get("/api/upscale/{image_id}")
async def upscale_endpoint(
    image_id,
    resolution,
    current_user: dict = Depends(get_current_user),
):
    return await upscale(
        image_id,
        current_user["user_id"],
        resolution
    )
```

Replace the like + delete block:

```python
# LIKE IMAGE
@app.put("/api/images/like/{id}")
async def toggle_like_endpoint(id: Optional[str] = None, user_id: Optional[str] = None):
    return await toggle_like(id, user_id)

# DELETE IMAGE
@app.delete("/api/images/delete/{id}")
async def delete_image_endpoint(id: str):
    return await delete_image(id)
```

with:

```python
# LIKE IMAGE
@app.put("/api/images/like/{id}")
async def toggle_like_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await toggle_like(id, current_user["user_id"])

# DELETE IMAGE
@app.delete("/api/images/delete/{id}")
async def delete_image_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    return await delete_image(id, current_user["user_id"])
```

Replace the checkout route:

```python
@app.post('/api/checkout')
async def create_checkout_session_endpoint(stripeId: Optional[str] = None, credit_amount: Optional[str] = None, user_id: Optional[str] = None):
    return create_checkout_session(stripeId, credit_amount, user_id)
```

with:

```python
@app.post('/api/checkout')
async def create_checkout_session_endpoint(
    stripeId: Optional[str] = None,
    credit_amount: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return create_checkout_session(stripeId, credit_amount, current_user["user_id"])
```

Leave `GET /api/images/get`, `GET /api/images/get/{id}`, and `POST /api/stripe-webhook` unchanged.

- [ ] **Step 4: Run route tests to verify they pass**

Run: `api/venv/bin/python -m pytest api/tests/test_http.py -v`
Expected: PASS (401s where expected, public route not 401)

- [ ] **Step 5: Run the full backend suite**

Run: `api/venv/bin/python -m pytest api/tests -v`
Expected: PASS across all files.

- [ ] **Step 6: Commit**

```bash
git add api/main.py api/tests/test_http.py
git commit -m "feat: enforce JWT auth on user-scoped routes (QRAI-32)"
```

---

## Task 7: Frontend token-mint helper (`backendAuth.js`)

**Files:**
- Create: `src/_utils/backendAuth.js`
- Create: `src/__tests__/backendAuth.test.js`

`getBackendToken()` reads the session and mints a `user`-scoped JWT; `getServiceToken()` mints a `service`-scoped JWT. Sign with `jose` HS256 using `BACKEND_JWT_SECRET`. Both helpers are server-only.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/backendAuth.test.js`:

```javascript
import { jwtVerify } from 'jose'

// Mock next-auth session
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
// authOptions import pulls in the route file; stub it
jest.mock('../app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { getBackendToken, getServiceToken } from '../_utils/backendAuth'

const SECRET = 'test-backend-secret'
const key = new TextEncoder().encode(SECRET)

beforeAll(() => {
  process.env.BACKEND_JWT_SECRET = SECRET
})
afterEach(() => jest.clearAllMocks())

test('getBackendToken mints a user-scoped token with email for logged-in user', async () => {
  getServerSession.mockResolvedValue({ user: { email: 'a@b.com', is_guest: false } })
  const token = await getBackendToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.scope).toBe('user')
  expect(payload.email).toBe('a@b.com')
  expect(payload.is_guest).toBe(false)
  expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
})

test('getBackendToken uses guest id as sub for guests', async () => {
  getServerSession.mockResolvedValue({ user: { _id: 'guest_9', email: 'guest_9@anonymous.com', is_guest: true } })
  const token = await getBackendToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.sub).toBe('guest_9')
  expect(payload.is_guest).toBe(true)
})

test('getBackendToken returns null when no session', async () => {
  getServerSession.mockResolvedValue(null)
  expect(await getBackendToken()).toBeNull()
})

test('getServiceToken mints a service-scoped token', async () => {
  const token = await getServiceToken()
  const { payload } = await jwtVerify(token, key)
  expect(payload.scope).toBe('service')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:frontend -- backendAuth`
Expected: FAIL — `Cannot find module '../_utils/backendAuth'`

- [ ] **Step 3: Implement `src/_utils/backendAuth.js`**

```javascript
"use server";

import { SignJWT } from "jose";
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const getKey = () => new TextEncoder().encode(process.env.BACKEND_JWT_SECRET);
const TTL_SECONDS = 5 * 60;

const sign = async (claims) => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(getKey());
};

export const getBackendToken = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const isGuest = !!session.user.is_guest;
  return sign({
    sub: isGuest ? session.user._id : session.user.email,
    email: session.user.email,
    is_guest: isGuest,
    scope: "user",
  });
};

export const getServiceToken = async () => {
  return sign({ scope: "service" });
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:frontend -- backendAuth`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/backendAuth.js src/__tests__/backendAuth.test.js
git commit -m "feat: Next.js backend token mint helper (QRAI-32)"
```

---

## Task 8: Attach the token in `ImagesUtils.js` and `userUtils.js`

**Files:**
- Modify: `src/_utils/ImagesUtils.js`
- Modify: `src/_utils/userUtils.js`
- Modify: `src/__tests__/images.test.js`

Attach `Authorization: Bearer <token>` to every FastAPI call, and stop sending `user_id` on `generate`/`like`/`upscale` (the backend now derives it).

- [ ] **Step 1: Update the existing generate test to assert the Authorization header**

In `src/__tests__/images.test.js`, add a mock for `backendAuth` near the other `jest.mock` calls at the top:

```javascript
jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))
```

Then add a test in the `generateImage` describe block:

```javascript
test('attaches Authorization header and omits user_id from query', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ _id: 'img_1' }) })
  await generateImage(FAKE_FORM, FAKE_USER)
  const [url, opts] = fetch.mock.calls[0]
  expect(opts.headers.Authorization).toBe('Bearer test-token')
  expect(url).not.toContain('user_id=')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:frontend -- images`
Expected: FAIL — current `generateImage` puts `user_id` in the URL and sets no `Authorization` header.

- [ ] **Step 3: Update `src/_utils/ImagesUtils.js`**

Add the import at the top (after the existing imports):

```javascript
import { getBackendToken } from "./backendAuth";
```

Rewrite the FastAPI-calling functions to attach the token. Replace `generateImage`:

```javascript
export const generateImage = (generateFormValues, user) => {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(generateFormValues);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/?user_id=${
      user._id
    }&${queryParams.toString()}`;

    fetch(url, {
      method: "GET",
      credentials: "include",
    })
```

with:

```javascript
export const generateImage = async (generateFormValues, user) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(generateFormValues);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/?${queryParams.toString()}`;

    fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    })
```

(The rest of the `generateImage` body — `.then`/`.catch` — is unchanged. The `user` arg is kept for call-site compatibility but no longer used for `user_id`.)

Replace `deleteImage`:

```javascript
export const deleteImage = (id) => {
  return new Promise((resolve, reject) => {
    axios
      .delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/delete/${id}`)
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
```

with:

```javascript
export const deleteImage = async (id) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    axios
      .delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
```

Replace `likeImage`:

```javascript
export const likeImage = async (imageId, userId) => {
  return new Promise((resolve, reject) => {
    axios
      .put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/like/${imageId}`,
        null,
        {
          params: { user_id: userId },
        }
      )
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
```

with:

```javascript
export const likeImage = async (imageId, userId) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    axios
      .put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/like/${imageId}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
```

Replace `upscaleImage`:

```javascript
export const upscaleImage = (imageId, resolution, userId) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upscale/${imageId}`, {
        params: { user_id: userId, resolution: resolution },
        withCredentials: true,
      })
```

with:

```javascript
export const upscaleImage = async (imageId, resolution, userId) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upscale/${imageId}`, {
        params: { resolution: resolution },
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      })
```

(The `.then`/`.catch` bodies of `upscaleImage` are unchanged. `userId` arg kept for call-site compatibility.)

- [ ] **Step 4: Update `src/_utils/userUtils.js`**

Add the import near the top:

```javascript
import { getBackendToken } from "./backendAuth";
```

In `getUserInfo`, replace the fetch block:

```javascript
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL
      }/api/user/info?email=${encodeURIComponent(session.user.email)}`,
      {
        method: "GET",
        headers: { Cookie: cookies().toString() },
        credentials: "include",
        next: { revalidate: 3600, tags: ["user"] },
      }
    );
```

with (email no longer sent; token carries identity):

```javascript
    const token = await getBackendToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/info`,
      {
        method: "GET",
        headers: {
          Cookie: cookies().toString(),
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        next: { revalidate: 3600, tags: ["user"] },
      }
    );
```

- [ ] **Step 5: Run frontend tests**

Run: `npm run test:frontend`
Expected: PASS (images suite including the new header assertion). If the existing `InsufficientCredits` test breaks because `generateImage` is now `async`, it still returns a promise — no change needed; verify it passes.

- [ ] **Step 6: Commit**

```bash
git add src/_utils/ImagesUtils.js src/_utils/userUtils.js src/__tests__/images.test.js
git commit -m "feat: attach backend auth token in image/user utils (QRAI-32)"
```

---

## Task 9: Service token on the sign-in bootstrap call

**Files:**
- Modify: `src/app/api/auth/[...nextauth]/route.js` (`signIn` callback)

The `signIn` callback calls `/api/user/auth` during Google sign-in. That route now requires a service token.

- [ ] **Step 1: Add the import**

At the top of `src/app/api/auth/[...nextauth]/route.js`, add:

```javascript
import { getServiceToken } from "../../../../_utils/backendAuth";
```

(Verify the relative path resolves to `src/_utils/backendAuth.js` from `src/app/api/auth/[...nextauth]/route.js` — it is four levels up: `[...nextauth]` → `auth` → `api` → `app` → `src`. If the project uses the `@/` alias elsewhere, prefer `import { getServiceToken } from "@/_utils/backendAuth";`.)

- [ ] **Step 2: Attach the token to the fetch**

In the `signIn` callback, replace:

```javascript
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });
```

with:

```javascript
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
```

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: no new errors in the changed file.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/auth/[...nextauth]/route.js"
git commit -m "feat: service token on sign-in bootstrap call (QRAI-32)"
```

---

## Task 10: Move checkout to a server action

**Files:**
- Create: `src/_utils/paymentUtils.js`
- Modify: `src/app/profile/PurchaseCard.js`

The checkout call is the last browser→FastAPI call. Move it into a server action that attaches the token; the client component calls the action and redirects.

- [ ] **Step 1: Create the server action**

Create `src/_utils/paymentUtils.js`:

```javascript
"use server";

import axios from "axios";
import { getBackendToken } from "./backendAuth";

export const createCheckout = async (item) => {
  const token = await getBackendToken();
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout`,
    null,
    {
      params: {
        stripeId: item.stripeId,
        credit_amount: item.creditAmount,
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data?.session_url ?? null;
};
```

- [ ] **Step 2: Update `PurchaseCard.js` to call the action**

In `src/app/profile/PurchaseCard.js`, remove the `axios` import if it is now unused, and add:

```javascript
import { createCheckout } from "@/_utils/paymentUtils";
```

Replace the `handleCheckout` function:

```javascript
  const handleCheckout = (item) => {
    // API call
    axios
      .post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout`, null, {
        params: {
          stripeId: item.stripeId,
          credit_amount: item.creditAmount,
          user_id: user._id,
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data && res.data.session_url) {
          // Redirect to the Stripe Checkout URL
          const sessionURL = res.data.session_url;
          window.location.href = sessionURL;
        } else {
          console.error("Invalid response or missing session URL");
          openAlert("error", "Payment session could not be opened.");
        }
      })
      // Error handling
      .catch((err) => {
        openAlert("error", "Credit purchase failed.");
        console.log(err);
      });
  };
```

with:

```javascript
  const handleCheckout = async (item) => {
    try {
      const sessionURL = await createCheckout(item);
      if (sessionURL) {
        window.location.href = sessionURL;
      } else {
        console.error("Invalid response or missing session URL");
        openAlert("error", "Payment session could not be opened.");
      }
    } catch (err) {
      openAlert("error", "Credit purchase failed.");
      console.log(err);
    }
  };
```

If `user` and `axios` are now both unused in the file, remove their now-dead references (keep `useStore`/`openAlert`).

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: no unused-var errors in `PurchaseCard.js` (remove `axios`/`user` if flagged).

- [ ] **Step 4: Commit**

```bash
git add src/_utils/paymentUtils.js src/app/profile/PurchaseCard.js
git commit -m "feat: move checkout to authenticated server action (QRAI-32)"
```

---

## Task 11: Env documentation + full verification

**Files:**
- Modify: `codebase/CLAUDE.md` (env section)
- Modify: `.env` (local; not committed)

- [ ] **Step 1: Add a local secret to `.env`**

Add to `codebase/.env` (use a real random value locally):

```
BACKEND_JWT_SECRET=<paste output of: openssl rand -hex 32>
```

Generate one: `openssl rand -hex 32`

- [ ] **Step 2: Document the new env var**

In `codebase/CLAUDE.md`, under "Environment Variables (`.env`)", add to the required-keys list:

```
- `BACKEND_JWT_SECRET` — shared HS256 secret used to sign/verify backend auth tokens (must be identical on Next.js and FastAPI)
```

- [ ] **Step 3: Full backend suite**

Run: `api/venv/bin/python -m pytest api/tests -v`
Expected: PASS (all files).

- [ ] **Step 4: Full frontend suite**

Run: `npm run test:frontend`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Manual smoke (optional but recommended)**

With `BACKEND_JWT_SECRET` set in `.env`, run `npm run dev` and verify:
- Generate works while signed in / as guest.
- Delete works on your own image; deleting via a raw `curl` (no token) returns 401.
- `curl "$BACKEND/api/user/info?email=someone@else.com"` returns 401 (no token).

- [ ] **Step 7: Commit docs**

```bash
git add codebase/CLAUDE.md
git commit -m "docs: document BACKEND_JWT_SECRET env var (QRAI-32)"
```

---

## Deployment checklist (post-merge, not part of code tasks)

- Set `BACKEND_JWT_SECRET` (same value) on **both** Heroku apps (Next.js + FastAPI) **before** deploying.
- Deploy backend and frontend together — once the backend enforces tokens, any unauthenticated/direct browser call breaks (intended).
- Smoke-test generate, delete, like, upscale, purchase, and Google sign-in on the deployed environment.

---

## Self-review notes

- **Spec coverage:** auth module (T2) ✓; delete ownership (T3) ✓; upscale ownership/credit-drain (T4) ✓; user/info PII leak (T5+T6) ✓; like spoofing (T6) ✓; generate identity (T6) ✓; checkout (T6+T10) ✓; user/auth service token (T6+T9) ✓; public routes untouched (T6) ✓; mint helpers + token attach (T7,T8) ✓; guests via `sub` (T2,T7) ✓; deps (T1) ✓; env/docs (T11) ✓.
- **Identifier consistency:** token claims `sub/email/is_guest/scope`; `get_current_user` returns `{user_id,email,is_guest}`; controllers compare `image["user_id"]` to `user_id`. Consistent across T2/T3/T4/T6.
- **Function names:** `getBackendToken`/`getServiceToken` (JS) and `get_current_user`/`require_service_token`/`decode_token` (PY) used identically wherever referenced.
