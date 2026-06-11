# `src/` — Next.js 14 frontend

App Router (Next 14), React 18, MUI v5, Zustand, next-auth. See repo-root `codebase/CLAUDE.md` for stack overview. This file covers the frontend's state + data layer and shared pieces.

## Directory map

- `app/` — App Router routes, layouts, pages. See `app/(main_pages)/CLAUDE.md` for routing details.
- `_components/` — shared UI. `actions/` holds the per-image action buttons (Copy, Delete, Download, Like, Share). `StoreInitializer.js` seeds the Zustand store from server-fetched data; `Toaster.js` renders alerts from store state.
- `_utils/` — data-fetching + helpers (see below).
- `_styles/` — `theme.js` (MUI theme) + `palette.js`. Style the app here, not with inline `sx` sprawl.
- `_context/` — Amplitude analytics provider (`amplitudeContext.js`) + `useAmplitudeContext` hook for tracking events.
- `store.js` — the single Zustand store.
- `__tests__/` — Jest tests (`npm run test:frontend`).

## State — Zustand (`store.js`)

One store, no Redux (despite any stale README). Holds: `user`, `alert` (drives `Toaster`), `generateFormValues` (the generate form), `generatingImage`, `processingImages` (ids mid-generation). Key actions: `setGenerateFormValues`/`resetGenerateFormValues`, `setGeneratingImage`, `add/removeImageProcessing`, `openAlert`/`closeAlert`.

`generateFormValues` defaults define the canonical generate payload shape: `website, prompt, style_id, style_title, style_prompt, qr_weight(0.0), negative_prompt, seed(-1), sd_model`.

## Data layer (`_utils/`) — how the frontend talks to the backend

- `ImagesUtils.js` — `getImages`, `getImageById`, `generateImage`, `deleteImage`, `likeImage`, `upscaleImage`.
- `userUtils.js` — `getUserInfo` (resolves session → fetches user from backend), `revalidateUser`.
- `utils.js` — `calculateCredits` (**mirrors backend `api/utils/utils.py`; keep pricing in sync**).
- `ImageStyles.js` — style presets/prompts. `PromptGenerator.js` — random prompt helper.

**Conventions / gotchas:**

- **Calls go straight to FastAPI** via `process.env.NEXT_PUBLIC_BACKEND_URL`, not through Next API routes. The browser-visible `user._id` is appended as a query param (e.g. `generateImage` → `?user_id=...`). This is the untrusted-`user_id` surface noted on the backend (epic SCRUM-27).
- **`getImages`/`getImageById` use `fetch` with `next: { tags: [...] }` caching.** After any mutation, call `revalidateTag('images')` and/or `revalidateTag('user')` — the existing util functions already do this; preserve it when editing.
- **`"use server"`** sits at the top of `ImagesUtils.js`/`userUtils.js` (server actions). `getUserInfo` reads the next-auth session via `getServerSession(authOptions)` and writes the user into the store through `StoreInitializer`.
- **Error strings are semantic:** `generateImage` maps backend `detail` to `"InsufficientCredits"` / `"GenerationFailed"`; callers branch on these.

## Auth (`app/api/auth/[...nextauth]/route.js`)

next-auth with two providers: Google + an **anonymous "guest"** Credentials provider that mints `guest_<timestamp>` ids. JWT session strategy. On Google sign-in the `signIn` callback POSTs to the backend `/api/user/auth`, passing `guest_id` so guest-created images transfer to the real account. Guest credits live only in the token.
