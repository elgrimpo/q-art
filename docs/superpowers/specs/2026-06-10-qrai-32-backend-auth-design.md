# QRAI-32 — Backend authentication & authorization

**Ticket:** [QRAI-32](https://biedermannchris.atlassian.net/browse/QRAI-32) (Critical, security)
**Date:** 2026-06-10
**Status:** Approved design — ready for implementation plan

## Problem

The FastAPI backend has no auth layer. It is publicly reachable (the URL is exposed to
the browser via `NEXT_PUBLIC_BACKEND_URL`) and trusts `user_id` / `email` supplied as
plain query parameters. Currently exploitable:

- `DELETE /api/images/delete/{id}` — no ownership check; anyone can delete any image + its S3 objects.
- `GET /api/user/info?email=…` — returns the full user document (credits, `payment_history`, `auth_providers`) for any email → PII + payment-history leak.
- `GET /api/upscale/{id}?user_id=…` — deducts credits from any `user_id` passed → drain another user's credits.
- `PUT /api/images/like/{id}?user_id=…` — like/unlike as any user.
- `GET /api/generate?user_id=…` — generate + deduct credits as any user.
- `POST /api/checkout?user_id=…` — start a checkout against any user.

## Approach (decided)

**Next.js stays the gatekeeper and mints a short-lived signed JWT** that conveys a verified
identity to FastAPI. Chosen over (a) decrypting next-auth's native JWE in Python (brittle)
and (b) a plain secret + user_id header (no signing/expiry).

### Mechanism

1. **Shared secret** `BACKEND_JWT_SECRET` — new env var on **both** Next.js and FastAPI
   (Heroku config var). High-entropy random string.
2. **Next.js mint helper** (`src/_utils/backendAuth.js`, server-only): `getBackendToken()`
   - Reads the verified session via `getServerSession(authOptions)`.
   - Mints an HS256 JWT with claims `{ sub: <user._id>, email, is_guest, scope: "user", exp: now+5min, iat }`.
   - Signs with `BACKEND_JWT_SECRET` using `jose` (already a transitive dependency of next-auth; no new npm package).
   - Returns `null` when there is no session (caller decides how to handle).
   - A second helper `getServiceToken()` mints `{ scope: "service", exp: now+5min }` for the
     sign-in bootstrap call (see `/api/user/auth` below), where no user session exists yet.
3. **FastAPI verification** (`api/utils/auth.py`):
   - `get_current_user` — FastAPI dependency. Reads `Authorization: Bearer <token>`, verifies
     signature + expiry with `pyjwt` (HS256, `BACKEND_JWT_SECRET`), requires `scope == "user"`,
     returns a small object `{ user_id, email, is_guest }`. On any failure → `HTTPException(401)`.
   - `require_service_token` — dependency for the bootstrap endpoint; verifies the same secret
     but requires `scope == "service"`.
   - Identity is taken from the token only. Query-string `user_id` / `email` are dropped from
     protected routes.

### Dependencies

- **Python:** add `pyjwt==2.8.0` to `requirements.txt` (pure-Python; `cryptography` already present).
- **Node:** use `jose` (already installed via next-auth). No new package.

## Endpoint-by-endpoint changes

| Endpoint | Auth | Identity source | Extra check |
|---|---|---|---|
| `GET /api/user/info` | `get_current_user` | token | Look up by token identity; **ignore `email` param**. Returns only the caller's own doc. |
| `DELETE /api/images/delete/{id}` | `get_current_user` | token | Ownership: load image, `403` unless `image.user_id == token user_id`. |
| `GET /api/upscale/{id}` | `get_current_user` | token | Ownership (same as delete) before deducting credits. |
| `PUT /api/images/like/{id}` | `get_current_user` | token | Like as token user_id; drop `user_id` param. |
| `GET /api/generate` | `get_current_user` | token | user_id from token, not query. |
| `POST /api/checkout` | `get_current_user` | token | user_id from token, not query. |
| `POST /api/user/auth` | `require_service_token` | request body | Called during sign-in; trusts the body (bootstrap), but only when carrying a valid service token. |
| `GET /api/images/get` | public | — | Unchanged. Public gallery; all images are public. `user_id` filter stays (no confidentiality gain from locking it — images are public). |
| `GET /api/images/get/{id}` | public | — | Unchanged. Public image page (cached server component). |
| `POST /api/stripe-webhook` | public | — | Unchanged; already verified via Stripe signature. |

### Where the checks live

- **Token verification** is at the **route layer** (FastAPI `Depends`), so controller
  function signatures are unchanged and existing unit tests keep working.
- **Ownership checks** live in the **controllers** (`delete_image`, `upscale`), which already
  have DB access to load the target image. They receive the trusted `user_id` from the route.

## Frontend changes

- **`src/_utils/backendAuth.js`** (new, server-only) — `getBackendToken()` / `getServiceToken()`.
- **`src/_utils/ImagesUtils.js`** — every fetch/axios call to FastAPI attaches
  `Authorization: Bearer <token>`. `deleteImage`, `likeImage`, `upscaleImage`, `generateImage`
  no longer pass `user_id` (derived server-side from the session by FastAPI).
- **`src/_utils/userUtils.js`** — `getUserInfo` attaches the token; no longer needs to send `email`.
- **`src/app/api/auth/[...nextauth]/route.js`** — the `signIn` callback's call to `/api/user/auth`
  attaches a **service token**.
- **Checkout: `src/app/profile/PurchaseCard.js`** (currently a `"use client"` component calling
  the backend directly from the browser with `axios`) → replace the direct call with a new
  **server action** `createCheckout(item)` in a server util (e.g. `src/_utils/paymentUtils.js`).
  The action reads the session, attaches the token, calls `/api/checkout`, and returns the Stripe
  `session_url`. The client component calls the action and does `window.location.href = url`.
  This removes the last browser→FastAPI call.

## Guests

Guest users have `_id` like `guest_…` stored in the next-auth JWT (`token._id`). This flows
into the minted token's `sub` exactly like a real user id. Ownership checks then work
uniformly — a guest can only delete/upscale/like images whose `user_id` matches their guest id.
No new special-casing beyond the existing `guest_`-prefix handling already in the controllers.

## Testing (TDD)

Backend (`api/tests/`, pytest + pytest-asyncio; mirror existing mock style):

- `test_auth.py` (new):
  - valid `user` token → `get_current_user` returns `{user_id, email, is_guest}`.
  - expired token → 401.
  - bad signature / wrong secret → 401.
  - missing/malformed `Authorization` header → 401.
  - `scope: "service"` token rejected by `get_current_user`; accepted by `require_service_token` (and vice-versa).
- `test_images.py` (extend): `delete_image` raises 403 when `image.user_id != user_id`;
  succeeds when they match.
- `test_upscale.py` (extend): ownership 403 path; credits only deducted on owner path.
- Route-level: a couple of `TestClient` checks that protected routes return 401 without a token.

Frontend (`src/__tests__/`, Jest):

- `backendAuth` mints a token containing the session user id and a near-term `exp` (mock `jose`/session).
- Existing `images.test.js` still passes (update mocks for the new `Authorization` header if asserted).

`conftest.py` gains `BACKEND_JWT_SECRET` default so imports don't fail.

## Deployment / rollout notes (breaking change)

- Once FastAPI requires tokens, **any direct browser→FastAPI request breaks** — intended, but
  it means `BACKEND_JWT_SECRET` must be set on **both** Heroku apps **before/at** the deploy,
  identical value.
- Add `BACKEND_JWT_SECRET` to `.env` (and document in `codebase/CLAUDE.md` env section).
- Token lifetime 5 min is ample for a single request round-trip; tokens are minted per call,
  not cached.
- No DB migration. No change to the public explore/gallery experience.

## Out of scope

- Rate limiting, CSRF hardening of Next.js server actions, refresh-token rotation.
- Reworking the guest model.
- Locking down the public gallery (images are intentionally public).
