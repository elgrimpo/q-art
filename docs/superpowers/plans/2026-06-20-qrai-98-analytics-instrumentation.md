# QRAI-98 Analytics Instrumentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the Amplitude gaps so the monetization funnel (click → checkout → revenue), ad-campaign attribution, and a regeneration signal are all captured.

**Architecture:** Client-side Amplitude events fired at existing seams in the unlock flow, a new `analytics.js` holding the funnel event-name constants + a revenue helper, a new `attribution.js` that sets a sticky `landing_variant` user property from a URL param, and two new props on the existing `Generate Image` event. No backend changes.

**Tech Stack:** Next.js 14 client components, `@amplitude/analytics-browser` (`track`, `revenue`, `Revenue`, `identify`, `Identify`), Jest + Testing Library (jsdom).

## Global Constraints

- Event names are exact, Title Case: `Checkout Started`, `Purchase Completed`, `Purchase Abandoned`, `Purchase Failed`. Existing event `Unlock Image Clicked` is unchanged.
- Revenue: `productId = "hd_unlock"`, `price = 3.99`, `quantity = 1`, `currency = "USD"`.
- New code references event names via the `EVENTS` constants / `trackUnlockRevenue()` from `src/_utils/analytics.js`. **Do not rename existing events** (`Generate Image`, `Like image`, etc.) — that fragments Amplitude history.
- URL param is `variant`; user property is `landing_variant`; `localStorage` key is `qrai_landing_variant`.
- Regeneration counter uses `sessionStorage` key `qrai_generation_count`.
- Follow the existing direct `amplitude.track("Name", props)` call pattern (the `trackAmplitudeEvent` context wrapper stays unused for events).
- Path alias `@/` → `src/`. Tests live in `src/__tests__/**/*.test.js`; run with `npm run test:frontend`.
- TDD, one logical change per task, commit at the end of each task.

---

### Task 1: Analytics constants + revenue helper

**Files:**
- Create: `src/_utils/analytics.js`
- Test: `src/__tests__/analytics.test.js`

**Interfaces:**
- Consumes: `track`, `revenue`, `Revenue` from `@amplitude/analytics-browser`.
- Produces:
  - `EVENTS` — `{ CHECKOUT_STARTED, PURCHASE_COMPLETED, PURCHASE_ABANDONED, PURCHASE_FAILED }` (string values above).
  - `UNLOCK_PRICE = 3.99`, `CURRENCY = "USD"`, `PRODUCT_ID = "hd_unlock"`.
  - `trackUnlockRevenue(imageId)` — fires `Purchase Completed` + an Amplitude Revenue event.

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/analytics.test.js
jest.mock('@amplitude/analytics-browser', () => ({
  track: jest.fn(),
  revenue: jest.fn(),
  Revenue: jest.fn().mockImplementation(() => {
    const inst = {}
    inst.setProductId = jest.fn(() => inst)
    inst.setPrice = jest.fn(() => inst)
    inst.setQuantity = jest.fn(() => inst)
    return inst
  }),
}))

import { track, revenue, Revenue } from '@amplitude/analytics-browser'
import {
  EVENTS, UNLOCK_PRICE, CURRENCY, PRODUCT_ID, trackUnlockRevenue,
} from '../_utils/analytics'

beforeEach(() => jest.clearAllMocks())

test('EVENTS exposes the funnel event names', () => {
  expect(EVENTS.CHECKOUT_STARTED).toBe('Checkout Started')
  expect(EVENTS.PURCHASE_COMPLETED).toBe('Purchase Completed')
  expect(EVENTS.PURCHASE_ABANDONED).toBe('Purchase Abandoned')
  expect(EVENTS.PURCHASE_FAILED).toBe('Purchase Failed')
})

test('trackUnlockRevenue fires Purchase Completed + an Amplitude Revenue event', () => {
  trackUnlockRevenue('img1')

  expect(track).toHaveBeenCalledWith('Purchase Completed', {
    imageId: 'img1', price: UNLOCK_PRICE, currency: CURRENCY,
  })

  const inst = Revenue.mock.results[0].value
  expect(inst.setProductId).toHaveBeenCalledWith(PRODUCT_ID)
  expect(inst.setPrice).toHaveBeenCalledWith(UNLOCK_PRICE)
  expect(inst.setQuantity).toHaveBeenCalledWith(1)
  expect(revenue).toHaveBeenCalledWith(inst)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- analytics.test.js`
Expected: FAIL — `Cannot find module '../_utils/analytics'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/_utils/analytics.js
import { track, revenue, Revenue } from "@amplitude/analytics-browser";

export const EVENTS = {
  CHECKOUT_STARTED: "Checkout Started",
  PURCHASE_COMPLETED: "Purchase Completed",
  PURCHASE_ABANDONED: "Purchase Abandoned",
  PURCHASE_FAILED: "Purchase Failed",
};

export const UNLOCK_PRICE = 3.99;
export const CURRENCY = "USD";
export const PRODUCT_ID = "hd_unlock";

// Fires the funnel's terminal step + an Amplitude Revenue event (emits the
// revenue_amount / unverified_revenue properties). Client-reported revenue —
// reconcile against Stripe later if a server-side integration is added.
export function trackUnlockRevenue(imageId) {
  track(EVENTS.PURCHASE_COMPLETED, {
    imageId,
    price: UNLOCK_PRICE,
    currency: CURRENCY,
  });

  const revenueEvent = new Revenue()
    .setProductId(PRODUCT_ID)
    .setPrice(UNLOCK_PRICE)
    .setQuantity(1);
  revenue(revenueEvent);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- analytics.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/_utils/analytics.js src/__tests__/analytics.test.js
git commit -m "feat(qrai-98): analytics event constants + unlock revenue helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Landing-variant attribution helper + wiring

**Files:**
- Create: `src/_utils/attribution.js`
- Test: `src/__tests__/attribution.test.js`
- Modify: `src/_context/amplitudeContext.js` (init effect)

**Interfaces:**
- Consumes: `identify`, `Identify` from `@amplitude/analytics-browser`.
- Produces: `captureLandingVariant()` — reads `?variant=`, persists to `localStorage["qrai_landing_variant"]`, and sets the `landing_variant` user property. No-op when there's no variant (param or stored).

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/attribution.test.js
jest.mock('@amplitude/analytics-browser', () => ({
  identify: jest.fn(),
  Identify: jest.fn().mockImplementation(() => {
    const inst = {}
    inst.set = jest.fn(() => inst)
    return inst
  }),
}))

import { identify, Identify } from '@amplitude/analytics-browser'
import { captureLandingVariant } from '../_utils/attribution'

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    value: { search }, writable: true, configurable: true,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
  setSearch('')
})

test('sets landing_variant from the ?variant= param and persists it', () => {
  setSearch('?variant=reddit-cafes')
  captureLandingVariant()

  expect(window.localStorage.getItem('qrai_landing_variant')).toBe('reddit-cafes')
  const inst = Identify.mock.results[0].value
  expect(inst.set).toHaveBeenCalledWith('landing_variant', 'reddit-cafes')
  expect(identify).toHaveBeenCalledWith(inst)
})

test('falls back to the stored variant when no param is present', () => {
  window.localStorage.setItem('qrai_landing_variant', 'pinterest-weddings')
  captureLandingVariant()

  const inst = Identify.mock.results[0].value
  expect(inst.set).toHaveBeenCalledWith('landing_variant', 'pinterest-weddings')
  expect(identify).toHaveBeenCalledWith(inst)
})

test('does nothing when there is no param and nothing stored', () => {
  captureLandingVariant()
  expect(identify).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- attribution.test.js`
Expected: FAIL — `Cannot find module '../_utils/attribution'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/_utils/attribution.js
import { identify, Identify } from "@amplitude/analytics-browser";

const PARAM = "variant";
const STORAGE_KEY = "qrai_landing_variant";

// First-touch-durable audience tag for ad experiments. Campaigns tag their
// landing URLs (?variant=reddit-cafes); we stick it in localStorage so it
// survives later sessions in the same browser, then set it as a sticky user
// property so every event can be sliced by landing_variant.
export function captureLandingVariant() {
  if (typeof window === "undefined") return;

  const param = new URLSearchParams(window.location.search).get(PARAM);
  if (param) {
    try {
      window.localStorage.setItem(STORAGE_KEY, param);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  let variant = param;
  if (!variant) {
    try {
      variant = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      variant = null;
    }
  }
  if (!variant) return;

  identify(new Identify().set("landing_variant", variant));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- attribution.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire it into the Amplitude init effect**

In `src/_context/amplitudeContext.js`, add the import and call it once, right after `init`:

```javascript
import { init, track, identify, setUserId, Identify } from "@amplitude/analytics-browser";
import { useStore } from "../store";
import { captureLandingVariant } from "../_utils/attribution";
```

```javascript
  useEffect(() => {
    init(AMPLITUDE_API_KEY, {
      defaultTracking: true,
    });
    captureLandingVariant();
  }, []);
```

- [ ] **Step 6: Run the existing context test to confirm no regression**

Run: `npm run test:frontend -- amplitudeContext.test.js`
Expected: PASS (5 tests). `captureLandingVariant()` no-ops in that suite (no `?variant=`, empty `localStorage`), so the existing `identify`/`setUserId` assertions are unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/_utils/attribution.js src/__tests__/attribution.test.js src/_context/amplitudeContext.js
git commit -m "feat(qrai-98): capture landing_variant user property for ad attribution

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Regeneration props on Generate Image

**Files:**
- Modify: `src/app/(main_pages)/generate/GenerateForm.js` (module-scope helper + the `track` call in `handleGenerate`)
- Test: `src/__tests__/GenerateForm.test.js` (extend)

**Interfaces:**
- Consumes: nothing new (self-contained, `sessionStorage`-backed).
- Produces: `Generate Image` event now carries `generation_number` (1-based int within the tab session) and `is_first_generation` (bool).

- [ ] **Step 1: Write the failing tests**

Add an import for the mocked SDK near the other imports in `src/__tests__/GenerateForm.test.js`:

```javascript
import * as amplitude from '@amplitude/analytics-browser'
```

Clear the counter + the track mock in the existing `beforeEach` (add these two lines):

```javascript
beforeEach(() => {
  resetStore()
  mockPush.mockClear()
  mockGenerateImage.mockReset()
  window.sessionStorage.clear()
  amplitude.track.mockClear()
})
```

Add these tests inside the `describe('GenerateForm', ...)` block:

```javascript
  function getGenerateImageProps() {
    const call = amplitude.track.mock.calls.find((c) => c[0] === 'Generate Image')
    return call ? call[1] : null
  }

  function fillForm() {
    resetStore({
      generateFormValues: {
        website: 'example.com', prompt: 'a dragon', style_id: 2,
        style_title: 'Anime', style_prompt: 'anime style', qr_weight: 0.0,
        negative_prompt: '', seed: -1, sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })
  }

  test('first generation tags the event as generation_number 1 / is_first_generation true', async () => {
    mockGenerateImage.mockResolvedValueOnce({ _id: 'img_abc' })
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(1)
    expect(getGenerateImageProps().is_first_generation).toBe(true)
  })

  test('a repeat generation in the same session increments generation_number', async () => {
    window.sessionStorage.setItem('qrai_generation_count', '1')
    mockGenerateImage.mockResolvedValueOnce({ _id: 'img_def' })
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(2)
    expect(getGenerateImageProps().is_first_generation).toBe(false)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- GenerateForm.test.js -t "generation"`
Expected: FAIL — `generation_number` is `undefined`.

- [ ] **Step 3: Add the counter helper and props**

In `src/app/(main_pages)/generate/GenerateForm.js`, add a module-scope helper above the component (after the imports):

```javascript
// Per-tab-session generation counter. sessionStorage (not a module variable)
// because the app navigates to /images/{id} after each generate and back to
// /generate — a module variable would reset on that full navigation.
function nextGenerationNumber() {
  if (typeof window === "undefined") return 1;
  try {
    const prev = parseInt(
      window.sessionStorage.getItem("qrai_generation_count") || "0",
      10,
    );
    const next = Number.isNaN(prev) ? 1 : prev + 1;
    window.sessionStorage.setItem("qrai_generation_count", String(next));
    return next;
  } catch {
    return 1;
  }
}
```

Then in `handleGenerate`, replace the existing `amplitude.track("Generate Image", {...})` call with:

```javascript
      const generationNumber = nextGenerationNumber();
      amplitude.track("Generate Image", {
        userId: user?.id,
        url: generateFormValues.website,
        style_title: generateFormValues.style_title,
        qr_weight: generateFormValues.qr_weight,
        isGuest: user?.is_guest || false,
        generation_number: generationNumber,
        is_first_generation: generationNumber === 1,
      });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- GenerateForm.test.js`
Expected: PASS (all existing tests + the 2 new ones).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main_pages)/generate/GenerateForm.js" src/__tests__/GenerateForm.test.js
git commit -m "feat(qrai-98): tag Generate Image with session generation_number

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Checkout Started + pre-payment Purchase Failed (UnlockButton)

**Files:**
- Modify: `src/_components/actions/UnlockButton.js` (`handleUnlock`)
- Test: `src/__tests__/UnlockButton.test.js` (new)

**Interfaces:**
- Consumes: `EVENTS`, `UNLOCK_PRICE`, `CURRENCY` from Task 1's `src/_utils/analytics.js`.
- Produces: `Checkout Started` on a successful Stripe session; `Purchase Failed` (`stage: "checkout_creation"`) when the session can't be created.

- [ ] **Step 1: Write the failing tests**

```javascript
// src/__tests__/UnlockButton.test.js
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockCreateUnlockCheckout = jest.fn()
jest.mock('@/_utils/paymentUtils', () => ({
  createUnlockCheckout: (...a) => mockCreateUnlockCheckout(...a),
}))

import * as amplitude from '@amplitude/analytics-browser'
import { EVENTS, UNLOCK_PRICE, CURRENCY } from '../_utils/analytics'
import UnlockButton from '../_components/actions/UnlockButton'

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { href: '' }, writable: true, configurable: true,
  })
})

function clickUnlock() {
  return act(async () => {
    fireEvent.click(screen.getByRole('button'))
  })
}

test('fires Checkout Started and redirects when a session is created', async () => {
  mockCreateUnlockCheckout.mockResolvedValueOnce('https://stripe.test/session')
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.CHECKOUT_STARTED, {
      imageId: 'img1', price: UNLOCK_PRICE, currency: CURRENCY,
    }),
  )
  expect(window.location.href).toBe('https://stripe.test/session')
})

test('fires Purchase Failed (checkout_creation) when no session URL comes back', async () => {
  mockCreateUnlockCheckout.mockResolvedValueOnce(null)
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'checkout_creation',
    }),
  )
})

test('fires Purchase Failed (checkout_creation) when checkout creation throws', async () => {
  mockCreateUnlockCheckout.mockRejectedValueOnce(new Error('boom'))
  render(<UnlockButton image={{ _id: 'img1', unlocked: false }} />)

  await clickUnlock()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'checkout_creation',
    }),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- UnlockButton.test.js`
Expected: FAIL — `Checkout Started` / `Purchase Failed` not tracked (the events don't exist yet).

- [ ] **Step 3: Add the events to handleUnlock**

In `src/_components/actions/UnlockButton.js`, add the import:

```javascript
import { EVENTS, UNLOCK_PRICE, CURRENCY } from "@/_utils/analytics";
```

Replace the body of `handleUnlock` with (keeps `Unlock Image Clicked` and the existing alerts, adds the funnel events):

```javascript
  const handleUnlock = async () => {
    setLoading(true);
    try {
      amplitude.track("Unlock Image Clicked", { imageId: image._id });
      const sessionUrl = await createUnlockCheckout(image._id);
      if (sessionUrl) {
        amplitude.track(EVENTS.CHECKOUT_STARTED, {
          imageId: image._id,
          price: UNLOCK_PRICE,
          currency: CURRENCY,
        });
        window.location.href = sessionUrl;
      } else {
        amplitude.track(EVENTS.PURCHASE_FAILED, {
          imageId: image._id,
          stage: "checkout_creation",
        });
        openAlert("error", "Could not start checkout. Please try again.");
      }
    } catch {
      amplitude.track(EVENTS.PURCHASE_FAILED, {
        imageId: image._id,
        stage: "checkout_creation",
      });
      openAlert("error", "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- UnlockButton.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/_components/actions/UnlockButton.js src/__tests__/UnlockButton.test.js
git commit -m "feat(qrai-98): Checkout Started + pre-payment Purchase Failed events

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Purchase Completed / Abandoned / fulfillment-Failed (ImageSidebar)

**Files:**
- Modify: `src/app/images/[imageId]/ImageSidebar.js` (the mount effect)
- Test: `src/__tests__/ImageSidebar.test.js` (new)

**Interfaces:**
- Consumes: `EVENTS`, `trackUnlockRevenue` from Task 1; `unlockImage` (existing).
- Produces: `Purchase Completed` + Revenue when unlock resolves; `Purchase Abandoned` on `?canceled=true`; `Purchase Failed` (`stage: "fulfillment"`) when the post-payment unlock throws.

- [ ] **Step 1: Write the failing tests**

```javascript
// src/__tests__/ImageSidebar.test.js
import React from 'react'
import { render, waitFor, act } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

const mockUnlockImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({ unlockImage: (...a) => mockUnlockImage(...a) }))

const mockTrackUnlockRevenue = jest.fn()
jest.mock('@/_utils/analytics', () => {
  const actual = jest.requireActual('../_utils/analytics')
  return { ...actual, trackUnlockRevenue: (...a) => mockTrackUnlockRevenue(...a) }
})

// Stub the action-button children — they import server utils / amplitude we
// don't exercise here.
jest.mock('@/_components/actions/DeleteButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/CopyButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/LikeButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/UnlockButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('@/_components/actions/ShareButton', () => ({ __esModule: true, default: () => <div /> }))
jest.mock('../app/images/[imageId]/GuestSignupPrompt', () => ({ __esModule: true, default: () => <div /> }))

import * as amplitude from '@amplitude/analytics-browser'
import { EVENTS } from '../_utils/analytics'
import ImageSidebar from '../app/images/[imageId]/ImageSidebar'

const IMAGE = { _id: 'img1', unlocked: false, user_id: 'u1' }
const USER = { _id: 'u1', is_guest: false }

function setSearch(search) {
  Object.defineProperty(window, 'location', {
    value: { search }, writable: true, configurable: true,
  })
}

async function renderSidebar() {
  await act(async () => {
    render(<ImageSidebar image={IMAGE} user={USER} customDeleteAction={jest.fn()} />)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setSearch('')
})

test('fires Purchase Completed + revenue when unlock resolves', async () => {
  setSearch('?stripe_session_id=sess1')
  mockUnlockImage.mockResolvedValueOnce({ ...IMAGE, unlocked: true })

  await renderSidebar()

  await waitFor(() => expect(mockTrackUnlockRevenue).toHaveBeenCalledWith('img1'))
})

test('fires Purchase Abandoned when returning with ?canceled=true', async () => {
  setSearch('?canceled=true')

  await renderSidebar()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_ABANDONED, { imageId: 'img1' }),
  )
  expect(mockUnlockImage).not.toHaveBeenCalled()
})

test('fires Purchase Failed (fulfillment) when the post-payment unlock throws', async () => {
  setSearch('?stripe_session_id=sess1')
  mockUnlockImage.mockRejectedValueOnce(new Error('upscale failed'))

  await renderSidebar()

  await waitFor(() =>
    expect(amplitude.track).toHaveBeenCalledWith(EVENTS.PURCHASE_FAILED, {
      imageId: 'img1', stage: 'fulfillment',
    }),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- ImageSidebar.test.js`
Expected: FAIL — none of the funnel events fire yet.

- [ ] **Step 3: Add the events to the mount effect**

In `src/app/images/[imageId]/ImageSidebar.js`, add the imports:

```javascript
import * as amplitude from "@amplitude/analytics-browser";
import { EVENTS, trackUnlockRevenue } from "@/_utils/analytics";
```

Update the mount effect — add the abandoned check after reading params, fire revenue in `.then`, and fire the fulfillment failure in `.catch`:

```javascript
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("stripe_session_id");
    setStripeSessionId(sessionId);
    setJustGenerated(params.get("justGenerated") === "true");

    if (params.get("canceled") === "true" && currentImage?._id) {
      amplitude.track(EVENTS.PURCHASE_ABANDONED, { imageId: currentImage._id });
    }

    if (currentImage?.unlocked) return;
    const shouldUnlock = sessionId || currentImage?.unlock_pending;
    if (!shouldUnlock) return;

    setUnlocking(true);
    unlockImage(currentImage._id, sessionId)
      .then((updatedImage) => {
        trackUnlockRevenue(currentImage._id);
        setCurrentImage(updatedImage);
        // Refresh server components so ImageFill also shows the HD image.
        router.refresh();
      })
      .catch(() => {
        amplitude.track(EVENTS.PURCHASE_FAILED, {
          imageId: currentImage._id,
          stage: "fulfillment",
        });
        openAlert(
          "error",
          "Image preparation failed — please try again or contact support.",
        );
      })
      .finally(() => setUnlocking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- ImageSidebar.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/images/[imageId]/ImageSidebar.js" src/__tests__/ImageSidebar.test.js
git commit -m "feat(qrai-98): Purchase Completed/Abandoned/Failed events on unlock return

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Full-suite + lint verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm run test:frontend`
Expected: PASS — all suites green, including the four new files (`analytics`, `attribution`, `UnlockButton`, `ImageSidebar`) and the extended `GenerateForm`.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: No new errors in the touched files.

- [ ] **Step 3: Manual / dashboard verification checklist (record in the ticket, not code)**

These cannot be asserted from the codebase — note them on QRAI-98 for a real-session pass:
- Run a real unlock end-to-end → `Checkout Started` → `Purchase Completed` + `revenue_amount` appear in Amplitude.
- Cancel a Stripe checkout → `Purchase Abandoned`.
- Visit with a UTM-tagged URL → `utm_*` user properties populate (confirms the existing `defaultTracking` attribution).
- Visit with `?variant=test` → `landing_variant` set on the user.
- Build the acceptance-criteria funnel chart in Amplitude: `Page Viewed → Generate Image → Unlock Image Clicked → Checkout Started → Purchase Completed`.

- [ ] **Step 4: Commit (if lint auto-fixed anything)**

```bash
git add -A
git commit -m "chore(qrai-98): lint cleanup" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Monetization funnel (Checkout Started, Purchase Completed + Revenue, Abandoned, Failed) → Tasks 1, 4, 5. ✅
- Revenue (client-side, reconcile later) → Task 1 `trackUnlockRevenue`, fired in Task 5. ✅
- UTM attribution → no code; Task 6 Step 3 verification. ✅
- Segment / landing_variant → Task 2. ✅
- Regeneration property → Task 3. ✅ Variations → N/A (documented in spec). ✅
- Light structure (`analytics.js` constants + helper) → Task 1. ✅
- Deferred use-case prompt / retention / funnel-chart → out of scope, no tasks. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code and exact commands.

**Type consistency:** `EVENTS.{CHECKOUT_STARTED,PURCHASE_COMPLETED,PURCHASE_ABANDONED,PURCHASE_FAILED}`, `UNLOCK_PRICE`, `CURRENCY`, `PRODUCT_ID`, and `trackUnlockRevenue(imageId)` are defined in Task 1 and consumed with the same names/signatures in Tasks 4 and 5. `captureLandingVariant()` defined and wired in Task 2. `nextGenerationNumber()` is local to Task 3. Event-name string values match the Global Constraints exactly.
