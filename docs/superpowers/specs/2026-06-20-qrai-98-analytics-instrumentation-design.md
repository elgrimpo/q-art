# QRAI-98 — Analytics gap-fill: funnel + segment instrumentation

**Status:** Design approved, pending spec review
**Ticket:** [QRAI-98](https://biedermannchris.atlassian.net/browse/QRAI-98) — "Instrument analytics: track user behavior events for funnel + segment analysis"
**Date:** 2026-06-20

## Goal

Close the gaps in the existing Amplitude event set so we have a complete funnel +
segment view — specifically the monetization funnel (click → checkout → revenue),
ad-campaign attribution, and a regeneration signal. This is gap-fill on a working
Amplitude integration, **not** a from-scratch instrumentation.

## What already exists (verified in code, no change)

- Amplitude initialised once in [src/_context/amplitudeContext.js](../../../src/_context/amplitudeContext.js)
  with `defaultTracking: true` → autotracks `Page Viewed`, `Element Clicked`,
  `session_start`, `session_end`, form interactions, file downloads, **and web
  attribution (`utm_*`)**.
- Events fire via direct `amplitude.track("Event Name", {props})` calls in client
  components (the `trackAmplitudeEvent` context wrapper exists but is unused for
  events — we follow the direct-call pattern to stay consistent).
- Confirmed events in code: `Generate Image`
  ([GenerateForm.js:161](<../../../src/app/(main_pages)/generate/GenerateForm.js>)),
  `Unlock Image Clicked` ([UnlockButton.js:35](../../../src/_components/actions/UnlockButton.js)),
  `Share Image`, `Copy Image`, `Delete Image`, `Like image` / `Unlike image`.

## Findings that shaped this design

1. **Revenue is not tracked anywhere in the code.** The ticket listed
   `revenue_amount / unverified_revenue` as "already tracked," but no revenue event
   exists (client or server). Decision: **add a client-side Amplitude Revenue event**
   on unlock success now, and reconcile later if a Stripe→Amplitude dashboard
   integration turns out to exist (double-counting risk is nil — zero current users).
2. **No named `Download Image` event** — HD download is an `<a download>` in
   [UnlockButton.js](../../../src/_components/actions/UnlockButton.js), so it's only
   captured as Amplitude's autotracked file-download / `Element Clicked`. Left as-is
   (out of scope); noted so the funnel doesn't assume a named event.
3. **Variations don't exist** — generation produces exactly one image per prompt and
   navigates straight to it. So "Variations viewed/selected" is **N/A**. Regeneration
   is real and is modeled as a property on `Generate Image`, not a new event.

## Event design

### Monetization funnel (new, all client-side)

The unlock flow's natural seams:
- **Intent:** `Unlock Image Clicked` (button click) — unchanged.
- **Checkout creation:** [UnlockButton.handleUnlock](../../../src/_components/actions/UnlockButton.js)
  — `createUnlockCheckout()` returns a Stripe `sessionUrl`, then redirects.
- **Return from Stripe:** [ImageSidebar mount effect](<../../../src/app/images/[imageId]/ImageSidebar.js>)
  — `?stripe_session_id` → `unlockImage()` resolves (success) or `.catch` (fulfillment
  failure); `?canceled=true` → user cancelled.

| Event | Fires where | Properties |
|---|---|---|
| `Checkout Started` | UnlockButton, after a non-null `sessionUrl`, before `window.location.href = sessionUrl` | `imageId`, `price: 3.99`, `currency: "USD"` |
| `Purchase Completed` | ImageSidebar, when `unlockImage()` resolves | `imageId`, `price: 3.99`, `currency: "USD"` |
| *(Amplitude Revenue)* | same call site as `Purchase Completed` | `new Revenue().setProductId("hd_unlock").setPrice(3.99).setQuantity(1)` → emits `revenue_amount` / `unverified_revenue` |
| `Purchase Abandoned` | ImageSidebar, when the return URL has `?canceled=true` | `imageId` |
| `Purchase Failed` | UnlockButton (null session **or** exception) **and** ImageSidebar `.catch` | `imageId`, `stage: "checkout_creation" \| "fulfillment"` |

**Why one `Purchase Failed` with a `stage` prop** (vs separate event names): keeps the
funnel vocabulary small while preserving the one distinction that matters operationally
— `stage: "fulfillment"` means *payment taken but HD never delivered* (the alert-worthy
case), vs `stage: "checkout_creation"` (a pre-payment dead end, no money moved).

Resulting acceptance-criteria funnel, all steps now present:
`Page Viewed → Generate Image → Unlock Image Clicked → Checkout Started → Purchase Completed`.

### Activation: regeneration property (new props on existing event)

On `Generate Image`, add:
- `generation_number` — 1-based count within the browser session.
- `is_first_generation` — `generation_number === 1`.

Source of truth is a `sessionStorage` counter (`qrai_generation_count`), incremented in
[GenerateForm.handleGenerate](<../../../src/app/(main_pages)/generate/GenerateForm.js>)
before the `track` call. `sessionStorage` (not a module variable) because the app
navigates to `/images/{id}` after each generate and back to `/generate` — a module
variable would reset on that full navigation; `sessionStorage` survives within the tab
session, which matches the "within same session" intent.

## Attribution

### UTM — no code change

`defaultTracking: true` already enables Amplitude's web-attribution plugin, which
captures `utm_source/medium/campaign/term/content` as user properties on session start.
**Action is dashboard-side verification only:** confirm these are populated on real
sessions. (Cannot be asserted from the codebase.)

### Segment / landing variant — new

New helper `src/_utils/attribution.js`, called once from the Amplitude init effect in
[amplitudeContext.js](../../../src/_context/amplitudeContext.js):

1. On load, read `?variant=` from `window.location.search`.
2. If present, write it to `localStorage` (`qrai_landing_variant`).
3. Read the effective value (param if present, else `localStorage`) and, if any, set it
   as a sticky user property via `identify(new Identify().set("landing_variant", v))`.

This makes `landing_variant` first-touch-durable across sessions in the same browser, so
ad campaigns tag landing URLs (e.g. `?variant=reddit-cafes`) and every event slices by
audience. It's independent of `utm_*` (which already covers source/medium/campaign);
`landing_variant` is the explicit audience-hypothesis tag the ticket asks for. Param
name is `variant`.

## Light structure

New `src/_utils/analytics.js` providing one source of truth for the **new** funnel
vocabulary:
- `EVENTS` — name constants for the funnel events above.
- `trackUnlockRevenue()` — wraps the Amplitude `Revenue` API + `Purchase Completed`
  track call, so the revenue logic lives in one place.

Existing events keep their current names and call sites (renaming would fragment
Amplitude history). New code uses the constants/helper.

## Files touched

- `src/_components/actions/UnlockButton.js` — `Checkout Started`; `Purchase Failed`
  (`stage: "checkout_creation"`).
- `src/app/images/[imageId]/ImageSidebar.js` — `Purchase Completed` + Revenue via
  `trackUnlockRevenue()`; `Purchase Abandoned` (`?canceled=true`); `Purchase Failed`
  (`stage: "fulfillment"`, in the unlock `.catch`).
- `src/app/(main_pages)/generate/GenerateForm.js` — `generation_number` /
  `is_first_generation` props on `Generate Image`.
- `src/_context/amplitudeContext.js` — call `captureLandingVariant()` in the init effect.
- `src/_utils/attribution.js` *(new)* — `captureLandingVariant()`.
- `src/_utils/analytics.js` *(new)* — `EVENTS` constants + `trackUnlockRevenue()`.

## Testing

Extend the existing Jest suites (`src/__tests__/`). TDD at implementation time:
- `Checkout Started` / `Purchase Failed (checkout_creation)` fire from UnlockButton with
  correct props (mock `amplitude.track`; mock `createUnlockCheckout` success + failure).
- `Purchase Completed` + Revenue, `Purchase Abandoned`, `Purchase Failed (fulfillment)`
  fire from the ImageSidebar return flow (mock `unlockImage` resolve/reject; simulate
  `?canceled=true`).
- `Generate Image` carries an incrementing `generation_number` across repeated
  generates (sessionStorage-backed); `is_first_generation` true only on the first.
- `captureLandingVariant()` sets the `landing_variant` user property from `?variant=`
  and falls back to `localStorage`.

## Out of scope / deferred

- **"What's this for" use-case prompt** (segment signal) → deferred, not implemented in
  this ticket (no separate ticket tracked). It's the only net-new UI and adds activation
  friction, so it's left to be designed on its own later.
- **Retention** (returning visitor, repeat purchase) → buildable as Amplitude
  cohorts/charts from existing `session_*` + revenue events; no code.
- **The AC funnel chart itself** → built in the Amplitude UI once events are live.
- **Renaming existing events** for casing consistency (`Like image` etc.) → avoided;
  would fragment historical data for no functional gain.
- **Dynamic QR / scan analytics** → parked with the feature (per ticket).

## Verification (post-implementation, dashboard-side)

- Run a real unlock end-to-end; confirm `Checkout Started → Purchase Completed` +
  `revenue_amount` appear in Amplitude.
- Cancel a checkout; confirm `Purchase Abandoned`.
- Confirm `utm_*` user properties populate on a UTM-tagged visit.
- Visit with `?variant=test`; confirm `landing_variant` on the user.
- Build the AC funnel chart in Amplitude.
