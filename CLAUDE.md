# Q-Art (qr-ai.co)

AI-powered QR code art generator. Takes a URL + text prompt and produces a scannable image styled with Stable Diffusion + ControlNet.

## Architecture

**Monorepo**: Next.js 14 frontend + Python FastAPI backend running concurrently.

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, MUI v5, Zustand, next-auth |
| Backend | FastAPI, Motor (async MongoDB), aioboto3 (S3) |
| AI | Novita client → SD 1.5 + ControlNet (img2img_v3) |
| DB | MongoDB Atlas, database: `QART`, collections: `users`, `images` |
| Storage | AWS S3: `qrartimages` (originals), `qrartimageswatermarked` |
| Payments | Stripe (checkout + webhooks) |
| Analytics | Amplitude |

## Key Commands

```bash
npm run dev          # Start both Next.js (3000) and FastAPI (8000) concurrently
npm run next-dev     # Next.js only
npm run fastapi-dev  # FastAPI only (pip install + uvicorn --reload)
npm run build        # Build both
npm run lint         # ESLint
```

FastAPI also runnable directly: `uvicorn api.main:app --reload`

## Environment Variables (`.env`)

Required keys (see `.env` for values):
- `MONGO_URL` — MongoDB Atlas connection string
- `SESSION_SECRET_KEY` — Starlette session middleware
- `NOVITA_KEY` — Novita AI API key
- `S3_URL` — S3 base URL
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `STRIPE_API_KEY` / `STRIPE_ENDPOINT_SECRET` — Stripe secret key + webhook signing secret
- `STRIPE_UNLOCK_PRICE_ID` — Stripe Price ID charged by the pay-per-result unlock checkout (see Pricing model below)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `BACKEND_JWT_SECRET` — shared HS256 secret used to sign (Next.js) and verify (FastAPI) backend auth tokens. **Must be identical on both apps.** Next.js mints a short-lived JWT carrying the verified identity; FastAPI derives `user_id` from it instead of trusting query params (see `api/utils/auth.py`, `src/_utils/backendAuth.js`).
- `ADMIN_EMAILS` — comma-separated list of email addresses granted admin privileges (QRAI-129). Read by FastAPI only; `get_current_user` sets `is_admin: true` for any verified email in this list. Not stored in MongoDB — derived at request time.
- `RESEND_API_KEY` / `EMAIL_FROM` — passwordless email-code login (QRAI-82); FastAPI sends 6-digit login codes via Resend.

## Auth model (QRAI-32)

The FastAPI backend never trusts a client-supplied `user_id`/`email`. Every user-scoped call goes through a Next.js `"use server"` util that attaches `Authorization: Bearer <token>` (minted by `getBackendToken()`); FastAPI verifies it via `Depends(get_current_user)` and resolves the canonical `user_id` (guest id used directly; logged-in email → Mongo `_id`). `POST /api/user/auth` (sign-in bootstrap) uses a `service`-scoped token. Public routes (`GET /api/images/get`, `GET /api/images/get/{id}`, `POST /api/stripe-webhook`) stay open. Delete/upscale enforce ownership.

Email login (QRAI-82): `POST /api/user/request-code` + `POST /api/user/verify-code` (both service-token gated) issue/verify a 6-digit code stored hashed in the `login_codes` collection (TTL-indexed for auto-cleanup); the `email-code` next-auth Credentials provider then upserts the user via the same `/api/user/auth` path as Google (so guest-image transfer and account-linking-by-email work identically).

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── (main_pages)/       # Next.js pages: generate, explore, mycodes, auth
│   │   ├── api/                # Next.js API routes (auth, etc.)
│   │   ├── layout.js           # Root layout + providers
│   │   └── globals.css
│   ├── _components/            # Shared UI components
│   ├── _utils/                 # Frontend utilities (ImageStyles, PromptGenerator, etc.)
│   ├── _styles/                # MUI theme + palette
│   ├── _context/               # Amplitude analytics context
│   └── store.js                # Zustand store
├── api/
│   ├── main.py                 # FastAPI app + all route definitions
│   ├── controllers/            # generate, images, users, payment
│   ├── schemas/schemas.py      # Pydantic models (ImageDoc, User, ControlNet, etc.)
│   └── utils/
│       ├── utils.py            # img2img request builder, watermark (credit calc is dead code, see Pricing model)
│       └── payload_config.py
├── public/                     # Static assets
└── requirements.txt            # Python dependencies
```

## AI Generation Pipeline

1. Generate QR code from URL (qrcode lib, ERROR_CORRECT_H)
2. Build `img2img_v3` request via `prepare_img2img_request()`:
   - Two ControlNet units, both scaled by `qr_weight + style_modifier`: `control_v1p_sd15_brightness` and `control_v1p_sd15_qrcode_monster_v2`
   - `qr_weight` (-2..2, from the frontend slider) + `style_modifier` (-2..2, per-style, not persisted) are summed and drive strength/guidance across both ControlNet units and the top-level img2img strength (see `api/utils/CLAUDE.md`)
3. Submit to Novita via `ProcessPoolExecutor` (avoids blocking async loop)
4. Poll with `wait_for_task_v3`
5. Apply watermark, upload both versions to S3
6. Write `ImageDoc` to MongoDB

## Pricing model: pay-per-result (QRAI-53)

Generation is free — no credits, no server-side credit checks (the old credit-pack system was torn down in `5e05334c5`; `sufficient_credit()` in `api/utils/utils.py` is now dead code). Every generated image comes back watermarked at 768px. To get the clean, full-resolution version, the user pays once per image via Stripe Checkout (`POST /api/checkout/unlock` → `STRIPE_UNLOCK_PRICE_ID`) to unlock it — no tiered upscale sizes; `unlock_image()` always upscales the same 768px original to a fixed 2048px and overwrites it in place in S3 (`api/controllers/unlock_controller.py`).

## Conventions

- FastAPI routes are all in `api/main.py`; logic lives in `api/controllers/`
- Frontend state is Zustand (`src/store.js`) — no Redux despite README saying Redux
- MUI theme is in `src/_styles/theme.js`; palette in `src/_styles/palette.js`
- Image styles/presets are in `src/_utils/ImageStyles.js`
- Python venv: `api/venv/` — activate before running Python tools
