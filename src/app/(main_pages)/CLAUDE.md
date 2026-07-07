# `src/app/(main_pages)/` — main app pages

App Router routes for the signed-in app experience. `(main_pages)` is a **route group** — the parentheses mean it organizes files without adding a URL segment. Same for `(navbar)` and `(formComponents)`.

## Routes

- `generate/` — the core flow (URL → `/generate`). `page.js` + `GenerateForm.js` drive the form (state in the Zustand `generateFormValues`). Sub-pieces live in `(formComponents)/`: `UrlPrompt`, `PromptKeywords`, `StylesModal`/`StylesCard`, `SettingsModal`, `GeneratingLoader`.
- `mycodes/` — the user's gallery. `page.js` + `ImagesCard`, `ImageModal`, `SkeletonCard`, `FilterPanelDesktop`/`FilterPanelMobile`, and `AdminMyCodesMenu` (admin-only "My codes" toggle, QRAI-142). Since `page.js` only ever mounts at the literal `/mycodes` route, it has no `pathname`-branching logic.
- `explore/` — public gallery, its own standalone `page.js`. There is no rewrite from `/explore` to `/mycodes` (`next.config.mjs` only rewrites `/api/stripe-webhook`) — that was true historically but no longer is.
- `(navbar)/` — `NavBarDesktop`/`NavBarMobile` + `AccountMenuDesktop`/`AccountMenuMobile`. Desktop/mobile are separate components (responsive split, not one adaptive component).
- `layout.js` — shared layout for this group.

## Parallel / intercepting routes (generate modal)

`generate/@modal/` is a **parallel route slot**. `@modal/(...)images/[imageId]/page.js` is an **intercepting route**: clicking an image while on `/generate` opens its detail (`/images/[imageId]`) in a modal overlay instead of a full navigation. `@modal/default.js` renders nothing when the slot is inactive. If you touch image-detail rendering, there are **two** entry points to keep consistent: this intercepted modal and the full page at `src/app/images/[imageId]/`.

## Conventions

- **Desktop and mobile are often separate component files** (NavBar, AccountMenu, FilterPanel). Update both when changing behavior.
- **Forms read/write the Zustand store**, not local state, so values survive navigation and feed `generateImage`.
- Data fetching uses the server-action utils in `src/_utils/` (see `src/CLAUDE.md`) — don't call the backend `fetch` inline in components; go through those helpers so cache `revalidateTag`s stay consistent.
- The root layout (`src/app/layout.js`) already wires providers (next-auth `SessionProvider`, MUI theme, Amplitude, `StoreInitializer`, `Toaster`) and fetches the user — pages can assume the store and session are initialized.
