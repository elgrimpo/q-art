# QRAI-82 — Passwordless email-code login

**Status:** Design approved, pending spec review
**Ticket:** [QRAI-82](https://biedermannchris.atlassian.net/browse/QRAI-82) — "Add additional login option"
**Date:** 2026-06-17

## Goal

Add an email-based login option alongside the existing Google OAuth, so users who
don't want to use Google can still sign up / sign in. The chosen mechanism is
**passwordless: a 6-digit code emailed to the user**. No passwords are stored.

## Why this approach

- **Passwordless over password:** lower UX friction (nothing to remember or reset),
  and it removes the highest-stakes security surface (password storage + reset flow).
- **Self-rolled via a Credentials provider, not next-auth's `EmailProvider`:** the
  built-in `EmailProvider` requires a next-auth database adapter, whose own `users`
  collection would collide with the app's existing FastAPI-owned `users` collection.
  The codebase already has a working pattern for this — the guest login is a
  `CredentialsProvider` on the JWT session strategy with no adapter — so we mirror it.
- **6-digit code over magic link:** keeps the user on the same tab (better on mobile /
  in-app browsers), simpler state.
- **Resend** as the email sender: fastest path to a working transactional sender with
  a good free tier.

## Existing pieces we reuse (no change to their behavior)

- `POST /api/user/auth` ([api/main.py](../../../api/main.py), logic in
  [api/controllers/users_controller.py](../../../api/controllers/users_controller.py)
  `authenticate_user`) — upserts a user by email, appends to `auth_providers[]`, and
  transfers guest-created images via `guest_id`. **This stays the single source of
  truth for user upsert + guest transfer.** Both Google and email-code feed into it.
- The `signIn` / `jwt` / `session` callbacks in
  [src/app/api/auth/[...nextauth]/route.js](../../../src/app/api/auth/%5B...nextauth%5D/route.js).
- `getServiceToken()` in
  [src/_utils/backendAuth.js](../../../src/_utils/backendAuth.js) for service-scoped
  backend calls, and `require_service_token` on the FastAPI side.
- The `User` schema and `auth_providers: [{provider, providerId}]` shape in
  [api/schemas/schemas.py](../../../api/schemas/schemas.py).

## Flow (end to end)

1. On the sign-in page, alongside Google, the user types their email and hits
   **Continue with email**.
2. Browser → thin Next route `POST /api/auth/request-code` (server-side; rate-limits +
   mints a service token) → FastAPI `POST /api/user/request-code`.
3. FastAPI generates a 6-digit code, stores a **hash** of it (not the code) with a
   short expiry in a new `login_codes` collection, and emails the code via Resend.
4. The page swaps to a code-entry view. User types the 6 digits →
   `signIn("email-code", { email, code })`.
5. The new `email-code` Credentials provider's `authorize()` calls FastAPI
   `POST /api/user/verify-code` (service token). If the code is valid, it returns the
   user object.
6. The existing `signIn` callback then calls `/api/user/auth` — the same upsert +
   guest-transfer path Google uses — and the JWT session is minted. The `jwt` callback
   treats `email-code` like Google (`is_guest = false`, drop guest credits).

## Account linking & guest transfer (free, via existing code)

- The backend keys users by **email** and appends to `auth_providers[]`. A user who
  signed in with Google as `x@gmail.com` and later logs in by email lands in the
  **same account** — a new `{provider: "email", providerId: <email>}` entry is
  appended. Safe, because receiving the code proves inbox ownership.
- Guest images transfer automatically: the `signIn` callback already passes `guest_id`
  to `/api/user/auth`, identical to Google.
- `User.name` is required by the schema, so for brand-new email users we default the
  display name to the email's local part (editable later). No name-entry step — keeps
  friction low.

## New backend surface (FastAPI)

### `POST /api/user/request-code` (service-token gated)
- Input: `{ email }`.
- Generates a 6-digit numeric code.
- Upserts into `login_codes` (one active code per email): `{ email, code_hash,
  expires_at, attempts: 0, last_sent_at }`. Storing only a hash means a DB leak does
  not expose live codes.
- Enforces a **60s send cooldown** (via `last_sent_at`) and a **per-email hourly cap**.
- Sends the code via Resend.
- Returns a uniform 200 regardless of whether the email already has an account (don't
  leak account existence).

### `POST /api/user/verify-code` (service-token gated)
- Input: `{ email, code }`.
- Validates: code exists, not expired, `attempts < 5`, hash matches.
- On wrong code: increment `attempts`; after 5, invalidate the code.
- On success: delete/invalidate the code and return success (+ a suggested display
  name = email local part). Does **not** itself upsert — the `signIn` callback's
  existing `/api/user/auth` call owns that.
- On failure: semantic 400 (e.g. `InvalidCode`, `CodeExpired`, `TooManyAttempts`),
  following the existing semantic-error-string convention.

### New `login_codes` collection
- Fields: `{ email, code_hash, expires_at, attempts, last_sent_at }`.
- **TTL index on `expires_at`** so codes self-clean.
- Created in `users_controller.py` (which already owns the `users` collection).

## Security defaults

The real defense for a low-entropy 6-digit code (1M combinations) is the rate limits,
not hash strength:

- Code expires in **10 minutes**.
- **Max 5 verify attempts**, then the code is invalidated.
- **60s cooldown** between sends + a per-email hourly send cap.
- Store only a **hash** of the code.
- **Out of scope (future hardening):** CAPTCHA, per-IP limits. Acceptable now because
  the product has no users yet; note for later.

## Frontend

- Extend [src/app/api/auth/signin/signIn.js](../../../src/app/api/auth/signin/signIn.js)
  into a two-step form: email entry → code entry. The code step has a **resend**
  action (respecting the 60s cooldown) and a "use a different email" back link. The
  Google button stays.
- Add the `email-code` `CredentialsProvider` and extend the `jwt` + `signIn` callbacks
  in [route.js](../../../src/app/api/auth/%5B...nextauth%5D/route.js) to treat it as a
  real (non-guest) login, mirroring the Google branch.
- New route handler `src/app/api/auth/request-code/route.js` — public entry point that
  rate-limits, mints a service token, and proxies to FastAPI `request-code`. Keeps the
  FastAPI endpoint behind a service token, consistent with the QRAI-32 auth model.
- Error strings stay semantic so the form can branch on them (mirrors `generateImage`).

## Setup prerequisites (user action, not code)

- Resend account + **domain verification** (DNS records on qr-ai.co) for
  deliverability. Until verified, test by sending to your own address from
  `onboarding@resend.dev`.
- New env vars on the FastAPI side (sending lives there):
  `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `login@qr-ai.co`).

## Testing

- **Backend pytest** (where the security logic lives), Resend send mocked:
  - code stored hashed (never plaintext);
  - expiry enforced;
  - attempt-lockout after 5 wrong tries;
  - resend cooldown / hourly cap enforced;
  - `verify-code` success path.
- **Frontend**: light test on the `request-code` route handler + the form's
  step transitions (email → code → back).

## Out of scope (YAGNI)

Magic links, password reset, "remember this device", CAPTCHA.
