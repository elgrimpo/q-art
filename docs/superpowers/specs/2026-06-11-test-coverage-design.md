# Test Coverage & Feature Summary Design

**Date:** 2026-06-11
**Scope:** Q-Art (qr-ai.co) — Next.js 14 + FastAPI monorepo

---

## Background

The codebase has solid Python test coverage across all six controller/util domains and good unit tests for two of the three frontend utility modules. The goal of this work is to:

1. Close the remaining unit-test gaps (Python HTTP routes, JS utils)
2. Add targeted React component tests for the two highest-regression-risk surfaces
3. Build a dedicated e2e integration suite covering the three critical user flows
4. Produce a living feature summary document at the project root

---

## Current Coverage Baseline

### Python (pytest) — `api/tests/` — solid

| File | What it covers |
|---|---|
| `test_utils.py` | `calculate_credits`, `sufficient_credit`, `parse_seed`, `prepare_img2img_request`, `createImagesFilterQuery`, `create_watermark` |
| `test_auth.py` | `decode_token`, `get_current_user`, `require_service_token` |
| `test_generate.py` | `predict` (happy path, credit check, guest flow, Novita failure, S3 upload, `download_image_bytes`) |
| `test_upscale.py` | `upscale` (resolution tiers, ownership, credits, resolution validation) |
| `test_images.py` | `toggle_like`, `delete_image`, `get_images` (pagination, sort modes) |
| `test_users.py` | `authenticate_user`, `get_user_info`, `increment_user_count` |
| `test_payment.py` | `stripe_webhook` (all event types, idempotency), `add_user_payment` |
| `test_http.py` | Auth enforcement, public routes, generate + images + user HTTP layer |

### Python — gaps

- `get_image_by_id` controller function — no direct unit test
- `GET /api/images/get/:id` HTTP route — not in `test_http.py`
- `GET /api/upscale/:id` HTTP route — not in `test_http.py`
- `create_checkout` controller (Stripe session creation) — no test

### JS (Jest) — `src/__tests__/` — partial

| File | What it covers |
|---|---|
| `utils.test.js` | `calculateCredits` (full parity with Python) |
| `backendAuth.test.js` | `getBackendToken`, `getServiceToken` |
| `images.test.js` | `generateImage` only |

### JS — gaps

- `ImagesUtils.js`: `deleteImage`, `likeImage`, `upscaleImage`, `getImages`, `getImageById` — no tests
- `paymentUtils.js`: `createCheckout` — no test
- `PromptGenerator.js`: `promptRandomizer` — no test
- React components — zero tests (no `@testing-library/react` installed)

### E2E — none

---

## Design

### Layer 1 — Python HTTP gaps

**Files touched:** `api/tests/test_http.py`, `api/tests/test_images.py`, `api/tests/test_payment.py`

**New tests in `test_http.py`:**
- `test_get_image_by_id_returns_200` — mock controller, assert 200
- `test_get_image_by_id_not_found_404` — mock controller raising 404, assert 404
- `test_upscale_route_returns_200` — mock `upscale`, assert 200
- `test_upscale_route_requires_auth` — no token, assert 401

**New tests in `api/tests/test_images.py`:**
- `test_get_image_by_id_found` — mock `images.find_one`, assert returned document
- `test_get_image_by_id_not_found_raises_404` — mock returns `None`, assert 404

**New tests in `api/tests/test_payment.py` (or new `test_checkout.py`):**
- `test_create_checkout_returns_session_url` — mock `stripe.checkout.Session.create`, assert URL returned
- `test_create_checkout_stripe_error_raises_500` — mock raises `stripe.error.StripeError`, assert 500

All follow existing `@patch` / `AsyncMock` patterns. No new dependencies.

---

### Layer 2 — JS utility gaps

**Files touched:** `src/__tests__/images.test.js` (extended), new `src/__tests__/promptGenerator.test.js`, new `src/__tests__/paymentUtils.test.js`

#### `images.test.js` additions

Mock strategy: `jest.mock('axios')` for axios-backed calls; `global.fetch = jest.fn()` for fetch-backed calls (already used for `generateImage`). Mock `backendAuth` via existing pattern.

| Function | Tests |
|---|---|
| `deleteImage` | Calls `axios.delete` with correct URL + auth header; resolves `true`; rejects on axios error |
| `likeImage` | Calls `axios.put` with correct URL + auth header; resolves `true`; rejects on error |
| `upscaleImage` | Calls `axios.get` with `resolution` query param + auth header; resolves with image data; rejects on 403 |
| `getImages` | Calls `fetch` with forwarded query params; resolves with array; throws on non-ok |
| `getImageById` | Calls `fetch` with correct URL; resolves with image; calls `notFound()` on 404 |

#### `promptGenerator.test.js`

- `promptRandomizer()` returns a non-empty string
- Output contains a substring from at least one `who`/`what`/`where`/`when` list entry (verifies combinator is wired, not just calling `Math.random`)

#### `paymentUtils.test.js`

- `createCheckout` passes `stripeId` as query param + auth header; returns `session_url`
- `createCheckout` rejects when axios throws

---

### Layer 3 — React component tests

**New dev dependencies:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`

**`jest.config.js`** update: add `setupFilesAfterFramework: ['@testing-library/jest-dom']` (enables `toBeInTheDocument()` etc.).

#### `src/__tests__/GenerateForm.test.js`

Covers the primary product flow. Mocks: Zustand store, `generateImage`, `getBackendToken`.

| Test | What it asserts |
|---|---|
| Renders expected fields | prompt textarea, website input, submit button present |
| Empty submit blocked | `generateImage` not called; validation feedback visible |
| Valid submit calls `generateImage` | Correct payload forwarded |
| Loading state during generation | Submit button disabled; loading indicator visible |
| `InsufficientCredits` surfaces correct message | Not a generic error message |

#### `src/__tests__/DownloadButton.test.js`

Covers the credit math display — silent mismatch with the backend is the highest-risk regression. Mocks: Zustand store, `upscaleImage`.

| Test | What it asserts |
|---|---|
| First download at current resolution | Shows 10 credits |
| 512→1024 upscale + first download | Shows 25 credits |
| Already downloaded at same resolution | Shows 0 credits |
| Clicking triggers `upscaleImage` with selected resolution | |
| Loading state during upscale | Button disabled |

---

### Layer 4 — E2E integration suite

**Location:** `api/tests/e2e/`
**Run command:** `pytest api/tests/e2e/ -v` (separate from the unit suite)
**Config:** `pytest-e2e.ini` — sets `testpaths = api/tests/e2e`, `asyncio_mode = auto`
**Marker:** `@pytest.mark.e2e` registered in `conftest.py`

#### Infrastructure (`api/tests/e2e/conftest.py`)

- `test_db` fixture: connects to `QART_TEST` database (same `MONGO_URL`, different DB name), yields, cleans up inserted documents by tracking inserted IDs
- `test_user` fixture: seeds a disposable user in `QART_TEST.users`, tears down after the test
- S3 cleanup helper: deletes objects from both buckets by ID after generate e2e test

#### `test_e2e_generate.py` — real Novita call

Uses `httpx.AsyncClient` against the FastAPI ASGI app. A guest JWT is minted for a disposable guest entry.

1. Send `GET /api/generate` with a simple prompt and a real URL
2. Wait up to 120s (Novita typical turnaround is 30-90s)
3. Assert response contains `image_url` + `watermarked_image_url` pointing to S3
4. Verify image document written to `QART_TEST.images`
5. Verify guest credit usage incremented in `QART_TEST.guest_credits`
6. Teardown: delete S3 objects + MongoDB doc

**Expected runtime:** 60-120s. This is the only test that makes a real Novita call.

#### `test_e2e_payment.py` — Stripe test-mode webhook

Uses real Stripe test-mode signature via `stripe.WebhookSignature.generate_header` (SDK test utility — no real charge).

1. Seed test user in `QART_TEST` with 10 credits
2. Construct a valid `checkout.session.completed` event with `client_reference_id = user_id`
3. Sign it with `STRIPE_WEBHOOK_SECRET` (test-mode value)
4. `POST /api/stripe-webhook` with the signed payload
5. Assert user credits increased by `PRICE_CREDITS_MAP[price_id]`
6. Replay same event — assert credits unchanged (idempotency)
7. Teardown: delete test user

#### `test_e2e_auth.py` — guest → sign-in → image transfer

Tests the auth bootstrap flow entirely at the HTTP level.

1. Seed a guest entry and an image owned by that guest in `QART_TEST`
2. `POST /api/user/auth` with a service token, passing `guest_id`
3. Assert the image's `user_id` re-attributed to the new real user's `_id`
4. Assert new user has 10 starter credits
5. Teardown: delete test user + image

---

### Layer 5 — Feature summary document

**Location:** `QR AI/FEATURES.md` (top-level project root)

Structured as functional feature areas with columns: feature name, description, owner file(s), test pointers. Each PR that adds or changes a feature should update the relevant row. The file is intentionally product-level — no internal class/method references.

Sections:
- Core Generation (QR art generation, style presets, random prompt, QR weight)
- Auth & Identity (Google OAuth, guest sessions, image transfer on sign-in)
- Credits & Payments (credit system, Stripe checkout, credit tiers)
- Image Management (explore gallery, my codes, delete, like, single image view)
- Download & Upscale (download, resolution tiers, credit cost display)

---

## Dependencies introduced

| Dependency | Layer | Type |
|---|---|---|
| `@testing-library/react` | Layer 3 | devDependency |
| `@testing-library/user-event` | Layer 3 | devDependency |
| `@testing-library/jest-dom` | Layer 3 | devDependency |

No new Python dependencies (e2e tests use existing `pytest`, `httpx`, `stripe` SDK already in `requirements.txt`).

---

## Test commands (final state)

```bash
# Frontend unit tests (existing + new)
npm run test:frontend

# Backend unit tests (existing + new)
pytest api/tests/ -v

# E2E suite (run deliberately, not in CI by default)
pytest api/tests/e2e/ -v
```

---

## Out of scope

- Playwright / browser automation — too heavy for a solo side project at this stage
- Coverage reports (Istanbul, pytest-cov) — gaps are auditable by eye
- Component tests beyond GenerateForm and DownloadButton — other components are presentational with minimal logic
- `ImageStyles.js` — pure data, no logic to test
- `getUserInfo` / `revalidateUser` — deep Next.js server-action internals; testing value is low relative to mock complexity
