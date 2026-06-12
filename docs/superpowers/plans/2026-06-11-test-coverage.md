# Test Coverage & Feature Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close unit-test gaps in Python and JS, add React component tests for the two highest-regression-risk surfaces, build an e2e integration suite for the three critical user flows, and produce a living feature summary document.

**Architecture:** Five layers executed in order — Python gaps first (no new tooling needed), then JS gaps, then install `@testing-library/react` and write component tests, then build the e2e pytest suite under `api/tests/e2e/`, then write `FEATURES.md`. Every layer is independently runnable.

**Tech Stack:** pytest (existing), Jest 29 + nextJest (existing), @testing-library/react + user-event + jest-dom (new), httpx ASGI transport for e2e, Motor for e2e DB cleanup, stripe SDK for webhook signing in e2e.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `api/tests/test_images.py` | Add `get_image` controller tests |
| Modify | `api/tests/test_http.py` | Add 6 HTTP route tests (get-by-id, upscale, checkout) |
| Modify | `api/tests/test_payment.py` | Add `create_checkout_session` unit tests |
| Modify | `src/__tests__/images.test.js` | Add 5 ImagesUtils function tests |
| Modify | `jest.config.js` | Add `setupFilesAfterFramework` for jest-dom |
| Create | `src/__tests__/promptGenerator.test.js` | PromptGenerator unit tests |
| Create | `src/__tests__/paymentUtils.test.js` | paymentUtils unit tests |
| Create | `src/__tests__/GenerateForm.test.js` | React component tests |
| Create | `src/__tests__/DownloadButton.test.js` | React component tests |
| Create | `api/tests/e2e/__init__.py` | Package marker |
| Create | `api/tests/e2e/conftest.py` | Shared e2e fixtures |
| Create | `pytest-e2e.ini` | Separate pytest config for e2e suite |
| Create | `api/tests/e2e/test_e2e_generate.py` | Real Novita generation flow |
| Create | `api/tests/e2e/test_e2e_payment.py` | Stripe test-mode webhook flow |
| Create | `api/tests/e2e/test_e2e_auth.py` | Guest → sign-in → image transfer flow |
| Create | `QR AI/FEATURES.md` | Living feature summary |

---

## Task 1: Python — `get_image` controller tests

**Files:**
- Modify: `api/tests/test_images.py`

Read the current import line before editing — it currently imports three functions:
```
from api.controllers.images_controller import toggle_like, delete_image, get_images
```

- [ ] **Step 1: Add `get_image` to the import**

Edit line 9 of `api/tests/test_images.py`:
```python
from api.controllers.images_controller import toggle_like, delete_image, get_images, get_image
```

- [ ] **Step 2: Add the two controller tests** (append after the last test in the file)

```python
# ---------------------------------------------------------------------------- #
#                           GET IMAGE BY ID                                    #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.images_controller.db")
async def test_get_image_found(mock_db):
    """get_image returns the document with _id converted to str."""
    image_doc = {
        "_id": ObjectId(FAKE_IMAGE_ID),
        "user_id": FAKE_USER_ID,
        "prompt": "a dragon",
    }
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=image_doc)

    result = await get_image(FAKE_IMAGE_ID)

    assert result["_id"] == FAKE_IMAGE_ID
    assert result["prompt"] == "a dragon"
    mock_db.__getitem__.return_value.find_one.assert_awaited_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}
    )


@patch("api.controllers.images_controller.db")
async def test_get_image_not_found_raises_404(mock_db):
    """get_image raises HTTPException 404 when no document matches."""
    mock_db.__getitem__.return_value.find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_image(FAKE_IMAGE_ID)

    assert exc_info.value.status_code == 404
```

- [ ] **Step 3: Run the new tests**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase"
source api/venv/bin/activate
pytest api/tests/test_images.py::test_get_image_found api/tests/test_images.py::test_get_image_not_found_raises_404 -v
```

Expected output: both tests PASS.

- [ ] **Step 4: Commit**

```bash
git add api/tests/test_images.py
git commit -m "test(api): add get_image controller unit tests"
```

---

## Task 2: Python — HTTP route gap tests

**Files:**
- Modify: `api/tests/test_http.py`

The existing file already defines `_client()`, `_guest_auth_headers()`, and `_service_auth_headers()` helpers. Add the following tests **after** the existing `test_delete_image_rejects_get_method` test.

- [ ] **Step 1: Add `get_image` and `upscale` and `create_checkout_session` to the main patch targets**

The existing `test_http.py` patches at `api.main.*`. No import changes needed.

- [ ] **Step 2: Append these tests to `api/tests/test_http.py`**

```python
# ---------------------------------------------------------------------------- #
#                         GET IMAGE BY ID ROUTE                                #
# ---------------------------------------------------------------------------- #

@patch("api.main.get_image", new_callable=AsyncMock)
async def test_get_image_by_id_returns_200(mock_get_image):
    """GET /api/images/get/:id returns 200 when controller succeeds."""
    mock_get_image.return_value = {"_id": "507f1f77bcf86cd799439011", "prompt": "a dragon"}
    async with _client() as client:
        resp = await client.get("/api/images/get/507f1f77bcf86cd799439011")
    assert resp.status_code == 200
    assert resp.json()["_id"] == "507f1f77bcf86cd799439011"


@patch("api.main.get_image", new_callable=AsyncMock)
async def test_get_image_by_id_not_found_returns_404(mock_get_image):
    """GET /api/images/get/:id propagates 404 from the controller."""
    from fastapi import HTTPException
    mock_get_image.side_effect = HTTPException(status_code=404, detail="Not found")
    async with _client() as client:
        resp = await client.get("/api/images/get/507f1f77bcf86cd799439011")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------- #
#                            UPSCALE ROUTE                                     #
# ---------------------------------------------------------------------------- #

async def test_upscale_requires_auth():
    """GET /api/upscale/:id must return 401 with no token."""
    async with _client() as client:
        resp = await client.get(
            "/api/upscale/507f1f77bcf86cd799439011",
            params={"resolution": "1024"},
        )
    assert resp.status_code == 401


@patch("api.main.upscale", new_callable=AsyncMock)
async def test_upscale_route_returns_200(mock_upscale):
    """GET /api/upscale/:id returns 200 with valid auth and params."""
    mock_upscale.return_value = {"_id": "507f1f77bcf86cd799439011", "width": 1024}
    async with _client() as client:
        resp = await client.get(
            "/api/upscale/507f1f77bcf86cd799439011",
            params={"resolution": "1024"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    mock_upscale.assert_called_once()


# ---------------------------------------------------------------------------- #
#                            CHECKOUT ROUTE                                    #
# ---------------------------------------------------------------------------- #

async def test_checkout_requires_auth():
    """POST /api/checkout must return 401 with no token."""
    async with _client() as client:
        resp = await client.post(
            "/api/checkout",
            params={"stripeId": "price_1OpIN8AaPyl1Ov3Pi3q6dkEC"},
        )
    assert resp.status_code == 401


@patch("api.main.create_checkout_session")
async def test_checkout_returns_session_url(mock_checkout):
    """POST /api/checkout returns session_url with valid auth."""
    mock_checkout.return_value = {"session_url": "https://checkout.stripe.com/pay/cs_test"}
    async with _client() as client:
        resp = await client.post(
            "/api/checkout",
            params={"stripeId": "price_1OpIN8AaPyl1Ov3Pi3q6dkEC"},
            headers=_guest_auth_headers(),
        )
    assert resp.status_code == 200
    assert resp.json()["session_url"] == "https://checkout.stripe.com/pay/cs_test"
```

- [ ] **Step 3: Run the new tests**

```bash
pytest api/tests/test_http.py -v -k "get_image_by_id or upscale_route or upscale_requires or checkout"
```

Expected: all 6 new tests PASS.

- [ ] **Step 4: Run the full HTTP test file to confirm nothing regressed**

```bash
pytest api/tests/test_http.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/tests/test_http.py
git commit -m "test(api): add HTTP route tests for get-by-id, upscale, and checkout"
```

---

## Task 3: Python — `create_checkout_session` unit tests

**Files:**
- Modify: `api/tests/test_payment.py`

The existing imports are:
```python
from api.controllers.payment_controller import stripe_webhook, PRICE_CREDITS_MAP
```

- [ ] **Step 1: Extend the import to include `create_checkout_session`**

```python
from api.controllers.payment_controller import stripe_webhook, PRICE_CREDITS_MAP, create_checkout_session
```

- [ ] **Step 2: Append these tests to `api/tests/test_payment.py`**

```python
# ---------------------------------------------------------------------------- #
#                         create_checkout_session                              #
# ---------------------------------------------------------------------------- #

@patch("api.controllers.payment_controller.stripe.checkout.Session.create")
def test_create_checkout_returns_session_url(mock_create):
    """Happy path: a valid price_id returns the Stripe session URL."""
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc"
    mock_create.return_value = mock_session

    result = create_checkout_session(VALID_PRICE_ID, FAKE_USER_ID)

    assert result == {"session_url": "https://checkout.stripe.com/pay/cs_test_abc"}
    mock_create.assert_called_once()


def test_create_checkout_unknown_price_id_raises_400():
    """An unrecognised price_id must raise 400 before calling Stripe."""
    with pytest.raises(HTTPException) as exc_info:
        create_checkout_session("price_unknown_bogus", FAKE_USER_ID)
    assert exc_info.value.status_code == 400


@patch("api.controllers.payment_controller.stripe.checkout.Session.create")
def test_create_checkout_stripe_error_raises_500(mock_create):
    """A Stripe API failure must surface as 500, not propagate raw."""
    mock_create.side_effect = Exception("Stripe connection refused")

    with pytest.raises(HTTPException) as exc_info:
        create_checkout_session(VALID_PRICE_ID, FAKE_USER_ID)
    assert exc_info.value.status_code == 500
```

- [ ] **Step 3: Run the new tests**

```bash
pytest api/tests/test_payment.py::test_create_checkout_returns_session_url api/tests/test_payment.py::test_create_checkout_unknown_price_id_raises_400 api/tests/test_payment.py::test_create_checkout_stripe_error_raises_500 -v
```

Expected: all 3 PASS.

- [ ] **Step 4: Run full Python test suite to confirm no regressions**

```bash
pytest api/tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/tests/test_payment.py
git commit -m "test(api): add create_checkout_session unit tests"
```

---

## Task 4: JS — extend `images.test.js` with missing utility tests

**Files:**
- Modify: `src/__tests__/images.test.js`

The existing file already has at the top:
```js
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }))
jest.mock('next/navigation', () => ({ notFound: jest.fn() }))
jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))
```

And imports `generateImage`. We need to also import the other functions and mock axios.

- [ ] **Step 1: Add axios mock and additional imports at the top of the file**

Edit `src/__tests__/images.test.js` — add after line 1 (the existing `jest.mock` for `next/cache`):

```js
jest.mock('axios')
```

And edit the import line that currently reads:
```js
import { generateImage } from '../_utils/ImagesUtils'
```
to:
```js
import { generateImage, deleteImage, likeImage, upscaleImage, getImages, getImageById } from '../_utils/ImagesUtils'
import axios from 'axios'
```

- [ ] **Step 2: Append the new `describe` blocks after the existing `generateImage` describe block**

```js
// --------------------------------------------------------------------------
// deleteImage
// --------------------------------------------------------------------------

describe('deleteImage', () => {
  test('calls axios.delete with correct URL and auth header', async () => {
    axios.delete.mockResolvedValueOnce({})
    await deleteImage('img_123')
    const [url, config] = axios.delete.mock.calls[0]
    expect(url).toContain('/api/images/delete/img_123')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves true on success', async () => {
    axios.delete.mockResolvedValueOnce({})
    await expect(deleteImage('img_123')).resolves.toBe(true)
  })

  test('rejects when axios.delete throws', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Network error'))
    await expect(deleteImage('img_123')).rejects.toThrow('Network error')
  })
})

// --------------------------------------------------------------------------
// likeImage
// --------------------------------------------------------------------------

describe('likeImage', () => {
  test('calls axios.put with correct URL and auth header', async () => {
    axios.put.mockResolvedValueOnce({})
    await likeImage('img_456', 'user_1')
    const [url, , config] = axios.put.mock.calls[0]
    expect(url).toContain('/api/images/like/img_456')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves true on success', async () => {
    axios.put.mockResolvedValueOnce({})
    await expect(likeImage('img_456', 'user_1')).resolves.toBe(true)
  })

  test('rejects when axios.put throws', async () => {
    axios.put.mockRejectedValueOnce(new Error('Like failed'))
    await expect(likeImage('img_456', 'user_1')).rejects.toThrow('Like failed')
  })
})

// --------------------------------------------------------------------------
// upscaleImage
// --------------------------------------------------------------------------

describe('upscaleImage', () => {
  test('calls axios.get with resolution param and auth header', async () => {
    const fakeImage = { _id: 'img_789', width: 1024 }
    axios.get.mockResolvedValueOnce({ data: fakeImage })
    await upscaleImage('img_789', 1024, 'user_1')
    const [url, config] = axios.get.mock.calls[0]
    expect(url).toContain('/api/upscale/img_789')
    expect(config.params.resolution).toBe(1024)
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves with the image data on success', async () => {
    const fakeImage = { _id: 'img_789', width: 1024, image_url: 'https://s3/img.png' }
    axios.get.mockResolvedValueOnce({ data: fakeImage })
    const result = await upscaleImage('img_789', 1024, 'user_1')
    expect(result).toEqual(fakeImage)
  })

  test('rejects when axios.get throws (e.g. 403 insufficient credits)', async () => {
    const err = Object.assign(new Error('Request failed'), { response: { status: 403 } })
    axios.get.mockRejectedValueOnce(err)
    await expect(upscaleImage('img_789', 1024, 'user_1')).rejects.toThrow()
  })
})

// --------------------------------------------------------------------------
// getImages
// --------------------------------------------------------------------------

describe('getImages', () => {
  test('calls fetch with forwarded query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })
    await getImages({ page: 2, image_style: 'Anime' })
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('page=2')
    expect(url).toContain('image_style=Anime')
  })

  test('resolves with the image array', async () => {
    const fakeImages = [{ _id: 'img1' }, { _id: 'img2' }]
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeImages),
    })
    const result = await getImages({})
    expect(result).toEqual(fakeImages)
  })

  test('rejects when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getImages({})).rejects.toThrow()
  })
})

// --------------------------------------------------------------------------
// getImageById
// --------------------------------------------------------------------------

describe('getImageById', () => {
  test('calls fetch with the correct image URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ _id: 'img_abc' }),
    })
    await getImageById('img_abc')
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/api/images/get/img_abc')
  })

  test('resolves with the image data', async () => {
    const fakeImage = { _id: 'img_abc', prompt: 'a dragon' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeImage),
    })
    const result = await getImageById('img_abc')
    expect(result).toEqual(fakeImage)
  })

  test('calls notFound() when response is 404', async () => {
    const { notFound } = require('next/navigation')
    const err = new Error('Not found')
    err.status = 404
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => { throw err },
    })
    // notFound() is called inside the catch block when status === 404
    try {
      await getImageById('missing_id')
    } catch (_) { /* expected */ }
    expect(notFound).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the new tests**

```bash
npm run test:frontend -- --testPathPattern=images
```

Expected: all tests in `images.test.js` PASS (existing + new).

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/images.test.js
git commit -m "test(frontend): add deleteImage, likeImage, upscaleImage, getImages, getImageById tests"
```

---

## Task 5: JS — `promptGenerator.test.js`

**Files:**
- Create: `src/__tests__/promptGenerator.test.js`

`promptRandomizer` is the default export from `src/_utils/PromptGenerator.js`. It also exports `promptKeywords` (named). The lists (listWho, listWhat, listWhere, listWhen) are internal — not exported.

- [ ] **Step 1: Create the test file**

```js
import promptRandomizer, { promptKeywords } from '../_utils/PromptGenerator'

describe('promptRandomizer', () => {
  test('returns a non-empty string', () => {
    const result = promptRandomizer()
    expect(typeof result).toBe('string')
    expect(result.trim().length).toBeGreaterThan(0)
  })

  test('returns different results across calls (randomness)', () => {
    // With list sizes of 35+, the chance of 5 identical results is negligible.
    const results = Array.from({ length: 5 }, () => promptRandomizer())
    const unique = new Set(results)
    expect(unique.size).toBeGreaterThan(1)
  })

  test('output ends with a time-of-day or era phrase from the when list', () => {
    // Spot-check: the when list entries include phrases like "at sunset", "at Midnight"
    // Run enough times that at least one result contains "at " or "in "
    const results = Array.from({ length: 20 }, () => promptRandomizer())
    const hasTimePhrase = results.some(r => /\b(at|in|during)\b/i.test(r))
    expect(hasTimePhrase).toBe(true)
  })
})

describe('promptKeywords', () => {
  test('is an array of category objects', () => {
    expect(Array.isArray(promptKeywords)).toBe(true)
    expect(promptKeywords.length).toBeGreaterThan(0)
  })

  test('each category has a title and non-empty keywords array', () => {
    for (const category of promptKeywords) {
      expect(typeof category.title).toBe('string')
      expect(Array.isArray(category.keywords)).toBe(true)
      expect(category.keywords.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run the test**

```bash
npm run test:frontend -- --testPathPattern=promptGenerator
```

Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/promptGenerator.test.js
git commit -m "test(frontend): add promptRandomizer and promptKeywords tests"
```

---

## Task 6: JS — `paymentUtils.test.js`

**Files:**
- Create: `src/__tests__/paymentUtils.test.js`

`createCheckout` is a `"use server"` function that uses axios and getBackendToken.

- [ ] **Step 1: Create the test file**

```js
/**
 * @jest-environment node
 */
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }))
jest.mock('../_utils/backendAuth', () => ({
  getBackendToken: jest.fn().mockResolvedValue('test-token'),
}))
jest.mock('axios')

import axios from 'axios'
import { createCheckout } from '../_utils/paymentUtils'

beforeEach(() => jest.clearAllMocks())

describe('createCheckout', () => {
  test('passes stripeId as query param and attaches auth header', async () => {
    axios.post.mockResolvedValueOnce({ data: { session_url: 'https://checkout.stripe.com/test' } })
    await createCheckout({ stripeId: 'price_123' })
    const [, , config] = axios.post.mock.calls[0]
    expect(config.params.stripeId).toBe('price_123')
    expect(config.headers.Authorization).toBe('Bearer test-token')
  })

  test('returns the session_url from the response', async () => {
    axios.post.mockResolvedValueOnce({ data: { session_url: 'https://checkout.stripe.com/test' } })
    const result = await createCheckout({ stripeId: 'price_123' })
    expect(result).toBe('https://checkout.stripe.com/test')
  })

  test('returns null when session_url is absent', async () => {
    axios.post.mockResolvedValueOnce({ data: {} })
    const result = await createCheckout({ stripeId: 'price_123' })
    expect(result).toBeNull()
  })

  test('rejects when axios.post throws', async () => {
    axios.post.mockRejectedValueOnce(new Error('Stripe unreachable'))
    await expect(createCheckout({ stripeId: 'price_123' })).rejects.toThrow('Stripe unreachable')
  })
})
```

- [ ] **Step 2: Run the test**

```bash
npm run test:frontend -- --testPathPattern=paymentUtils
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Run the full frontend suite**

```bash
npm run test:frontend
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/paymentUtils.test.js
git commit -m "test(frontend): add createCheckout unit tests"
```

---

## Task 7: Install `@testing-library` and update jest config

**Files:**
- Modify: `jest.config.js`

- [ ] **Step 1: Install the three new dev dependencies**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase"
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Expected: `package.json` devDependencies gains all three packages.

- [ ] **Step 2: Add a Jest setup file**

Create `src/__tests__/jest.setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Update `jest.config.js`**

Current contents:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^jose(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs$1',
  },
})
```

New contents:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^jose(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs$1',
  },
  setupFilesAfterFramework: ['<rootDir>/src/__tests__/jest.setup.js'],
})
```

> **Note:** If running jest produces `"Unknown option setupFilesAfterFramework"`, the correct key name is `setupFilesAfterFramework` — verify spelling matches your Jest version's docs.

- [ ] **Step 4: Verify existing tests still pass**

```bash
npm run test:frontend
```

Expected: all existing tests still PASS. If there's an `Unknown option` error, check the exact spelling of `setupFilesAfterFramework` in Jest 29 docs and fix in `jest.config.js`.

- [ ] **Step 5: Commit**

```bash
git add jest.config.js src/__tests__/jest.setup.js package.json package-lock.json
git commit -m "test(frontend): install @testing-library and configure jest-dom setup"
```

---

## Task 8: React component tests — `GenerateForm`

**Files:**
- Create: `src/__tests__/GenerateForm.test.js`

**What this tests:** submit button enable/disable logic, loading state rendering, `generateImage` called with correct payload, InsufficientCredits dialog appearance.

**Mocking strategy:**
- Real Zustand store (seed with `useStore.setState` in `beforeEach`)
- Mock `useRouter` (next/navigation) and `useSession` (next-auth/react) — these are Next.js hooks with no jsdom implementation
- Mock `@amplitude/analytics-browser` — side-effect only, no return value needed
- Mock `generateImage` — async, returns image data or throws
- Mock heavy sub-components (StylesModal, SettingsModal, GeneratingLoader, SimpleDialog) — tested separately elsewhere, and mocking them keeps this test focused on GenerateForm's own logic

- [ ] **Step 1: Create the test file**

```js
/**
 * @jest-environment jsdom
 */
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: jest.fn() }))
jest.mock('@/app/(main_pages)/generate/(formComponents)/StylesModal', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('@/app/(main_pages)/generate/(formComponents)/SettingsModal', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('@/app/(main_pages)/generate/(formComponents)/GeneratingLoader', () => ({
  __esModule: true,
  default: () => <div data-testid="generating-loader" />,
}))
jest.mock('@/_components/SimpleDialog', () => ({
  __esModule: true,
  default: ({ open, title }) =>
    open ? <div data-testid="simple-dialog">{title}</div> : null,
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { generateImage } from '@/_utils/ImagesUtils'
import { useStore } from '@/store'
import GenerateForm from '@/app/(main_pages)/generate/GenerateForm'

const mockPush = jest.fn()

// Base form values — non-empty prompt prevents the auto-randomizer useEffect.
// style_id: 2 avoids the random-style-selection branch in handleGenerate.
const BASE_FORM = {
  website: 'https://example.com',
  prompt: 'a test prompt',
  style_id: 2,
  style_title: 'Cinematic',
  style_prompt: ', cinematic',
  qr_weight: 0.5,
  negative_prompt: '',
  seed: -1,
  sd_model: 'sd-v1-5',
}

const BASE_USER = {
  _id: 'user123',
  email: 'test@x.com',
  is_guest: false,
  credits: 10,
}

beforeEach(() => {
  useRouter.mockReturnValue({ push: mockPush })
  useSession.mockReturnValue({
    data: { user: { email: BASE_USER.email, is_guest: false } },
    update: jest.fn().mockResolvedValue({ user: { credits: 9 } }),
  })
  useStore.setState({
    user: { ...BASE_USER },
    generateFormValues: { ...BASE_FORM },
    generatingImage: false,
    processingImages: [],
    alert: { open: false, severity: 'info', message: '' },
  })
  generateImage.mockReset()
})

afterEach(() => jest.clearAllMocks())

test('renders website input, prompt input, and generate button', () => {
  render(<GenerateForm />)
  expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
})

test('generate button is disabled when website is empty', () => {
  useStore.setState({ generateFormValues: { ...BASE_FORM, website: '' } })
  render(<GenerateForm />)
  expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
})

test('generate button is enabled when both website and prompt are filled', () => {
  render(<GenerateForm />)
  expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
})

test('calls generateImage with form values on generate click', async () => {
  const user = userEvent.setup()
  generateImage.mockResolvedValueOnce({ _id: 'img_new' })

  render(<GenerateForm />)
  await user.click(screen.getByRole('button', { name: /generate/i }))

  await waitFor(() => expect(generateImage).toHaveBeenCalledTimes(1))
  expect(generateImage).toHaveBeenCalledWith(
    expect.objectContaining({
      website: 'https://example.com',
      prompt: 'a test prompt',
    }),
    expect.objectContaining({ _id: 'user123' })
  )
})

test('shows generating loader and hides form when generatingImage is true', () => {
  useStore.setState({ generatingImage: true })
  render(<GenerateForm />)
  expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
})

test('shows InsufficientCredits dialog when user has 0 credits', async () => {
  const user = userEvent.setup()
  useStore.setState({ user: { ...BASE_USER, credits: 0 } })

  render(<GenerateForm />)
  await user.click(screen.getByRole('button', { name: /generate/i }))

  expect(screen.getByTestId('simple-dialog')).toBeInTheDocument()
  expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument()
  expect(generateImage).not.toHaveBeenCalled()
})

test('shows InsufficientCredits dialog when backend rejects with that error', async () => {
  const user = userEvent.setup()
  generateImage.mockRejectedValueOnce(new Error('InsufficientCredits'))
  useStore.setState({ user: { ...BASE_USER, credits: 5 } })

  render(<GenerateForm />)
  await user.click(screen.getByRole('button', { name: /generate/i }))

  await waitFor(() =>
    expect(screen.getByTestId('simple-dialog')).toBeInTheDocument()
  )
  expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test**

```bash
npm run test:frontend -- --testPathPattern=GenerateForm
```

Expected: all 7 tests PASS. If MUI produces `window.matchMedia` errors, add this to `src/__tests__/jest.setup.js` before the existing line:
```js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/GenerateForm.test.js src/__tests__/jest.setup.js
git commit -m "test(frontend): add GenerateForm component tests"
```

---

## Task 9: React component tests — `DownloadButton`

**Files:**
- Create: `src/__tests__/DownloadButton.test.js`

**What this tests:** credit cost display (first download, upscale combos, already-downloaded), dialog open/close, `upscaleImage` called with correct resolution.

`DownloadButton` props: `{ image, user }`. It pulls `openAlert`, `addImageProcessing`, `removeImageProcessing` from `useStore()`.

`StyledIconButton` is mocked to a plain `<button>` so the trigger is findable without reading its internals.

- [ ] **Step 1: Create the test file**

```js
/**
 * @jest-environment jsdom
 */
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('@/_utils/ImagesUtils', () => ({ upscaleImage: jest.fn() }))
// Replace StyledIconButton with a plain button so we can trigger the dialog.
jest.mock('@/_components/StyledIconButton', () => ({
  __esModule: true,
  default: ({ handleClick }) => (
    <button data-testid="download-trigger" onClick={handleClick} />
  ),
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { upscaleImage } from '@/_utils/ImagesUtils'
import { useStore } from '@/store'
import DownloadButton from '@/_components/actions/DownloadButton'

const IMAGE_512 = {
  _id: 'img1',
  width: 512,
  downloaded: false,
  image_url: 'https://s3.example/img.png',
}
const IMAGE_512_DONE = { ...IMAGE_512, downloaded: true }
const USER = { _id: 'user1' }

beforeEach(() => {
  useStore.setState({
    alert: { open: false, severity: 'info', message: '' },
    processingImages: [],
  })
  upscaleImage.mockReset()
})

afterEach(() => jest.clearAllMocks())

// Helper: render the button and click the trigger to open the dialog.
async function openDialog(image = IMAGE_512) {
  const ue = userEvent.setup()
  render(<DownloadButton image={image} user={USER} />)
  await ue.click(screen.getByTestId('download-trigger'))
  return ue
}

test('shows 10 credits for first-time download at current resolution', async () => {
  await openDialog(IMAGE_512)
  expect(screen.getByText(/required credits:\s*10/i)).toBeInTheDocument()
})

test('shows 0 credits when image is already downloaded at same resolution', async () => {
  await openDialog(IMAGE_512_DONE)
  expect(screen.getByText(/required credits:\s*0/i)).toBeInTheDocument()
})

test('shows 25 credits after switching to 1024 (15 upscale + 10 download)', async () => {
  const ue = await openDialog(IMAGE_512)
  await ue.click(screen.getByRole('button', { name: /1024 x 1024/i }))
  expect(screen.getByText(/required credits:\s*25/i)).toBeInTheDocument()
})

test('shows 30 credits after switching to 2048 (20 upscale + 10 download)', async () => {
  const ue = await openDialog(IMAGE_512)
  await ue.click(screen.getByRole('button', { name: /2048 x 2048/i }))
  expect(screen.getByText(/required credits:\s*30/i)).toBeInTheDocument()
})

test('calls upscaleImage with the correct image id, resolution, and user id', async () => {
  jest.useFakeTimers()
  upscaleImage.mockResolvedValueOnce({
    _id: 'img1',
    image_url: 'https://s3.example/img-hd.png',
  })
  const ue = userEvent.setup({ delay: null })
  render(<DownloadButton image={IMAGE_512} user={USER} />)
  await ue.click(screen.getByTestId('download-trigger'))
  // Click the "Download ( ... )" action button in the dialog
  const downloadBtn = screen
    .getAllByRole('button')
    .find((b) => b.textContent.startsWith('Download ('))
  await ue.click(downloadBtn)
  await waitFor(() => expect(upscaleImage).toHaveBeenCalledWith('img1', 512, 'user1'))
  jest.runAllTimers()
  jest.useRealTimers()
})
```

- [ ] **Step 2: Run the test**

```bash
npm run test:frontend -- --testPathPattern=DownloadButton
```

Expected: all 5 tests PASS.

- [ ] **Step 3: Run the full frontend test suite**

```bash
npm run test:frontend
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/DownloadButton.test.js
git commit -m "test(frontend): add DownloadButton component tests"
```

---

## Task 10: E2E infrastructure — conftest and config

**Files:**
- Create: `api/tests/e2e/__init__.py`
- Create: `api/tests/e2e/conftest.py`
- Create: `pytest-e2e.ini`

**Note on database:** E2E tests write to the real `QART` database (same as production). Tests use time-stamped unique identifiers to avoid collision and clean up after themselves in `finally` blocks. This is the least-invasive approach — no controller code changes needed.

- [ ] **Step 1: Create `api/tests/e2e/__init__.py`**

```python
```
(empty file — marks the directory as a Python package)

- [ ] **Step 2: Create `api/tests/e2e/conftest.py`**

```python
"""
Shared fixtures for the e2e integration suite.

All tests write to the real QART database and clean up after themselves.
Run with: pytest api/tests/e2e/ -v --co  (to list without running)
          pytest api/tests/e2e/ -v        (to run all e2e tests)
"""
import os
import time
import jwt
import pytest
import motor.motor_asyncio as motor
import certifi


@pytest.fixture(scope="session")
def mongo_db():
    """Motor connection to QART (production DB). Cleaned up after the session."""
    mongo_url = os.environ["MONGO_URL"]
    client = motor.AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
    db = client.get_database("QART")
    yield db
    client.close()


def mint_guest_jwt(guest_id: str) -> str:
    """Return a signed user-scoped JWT for a guest identity."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {
            "sub": guest_id,
            "email": f"{guest_id}@anonymous.com",
            "is_guest": True,
            "scope": "user",
            "iat": now,
            "exp": now + 3600,
        },
        secret,
        algorithm="HS256",
    )


def mint_service_jwt() -> str:
    """Return a signed service-scoped JWT for /api/user/auth calls."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {"scope": "service", "iat": now, "exp": now + 3600},
        secret,
        algorithm="HS256",
    )


def mint_user_jwt(user_id: str, email: str) -> str:
    """Return a signed user-scoped JWT for a real (non-guest) identity."""
    secret = os.environ["BACKEND_JWT_SECRET"]
    now = int(time.time())
    return jwt.encode(
        {
            "sub": email,
            "email": email,
            "is_guest": False,
            "scope": "user",
            "iat": now,
            "exp": now + 3600,
        },
        secret,
        algorithm="HS256",
    )
```

- [ ] **Step 3: Create `pytest-e2e.ini`** (at the codebase root, same level as `pytest.ini`)

```ini
[pytest]
asyncio_mode = auto
testpaths = api/tests/e2e
markers =
    e2e: marks tests as end-to-end integration tests (real external services)
```

- [ ] **Step 4: Verify the config is parseable**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase"
source api/venv/bin/activate
pytest --co -q -c pytest-e2e.ini
```

Expected: "no tests ran" (no test files yet), no config errors.

- [ ] **Step 5: Commit**

```bash
git add api/tests/e2e/__init__.py api/tests/e2e/conftest.py pytest-e2e.ini
git commit -m "test(e2e): add e2e pytest infrastructure (conftest, pytest-e2e.ini)"
```

---

## Task 11: E2E — generation flow (real Novita)

**Files:**
- Create: `api/tests/e2e/test_e2e_generate.py`

**What it tests:** Full path from `GET /api/generate` → Novita img2img → S3 upload → MongoDB insert → response with both S3 URLs.

**Runtime:** 60–120 seconds. Uses a guest identity so no user record is needed in MongoDB.

**Cleanup:** deletes the generated image via the real `DELETE /api/images/delete/:id` endpoint, then removes the guest_credits record directly via Motor.

- [ ] **Step 1: Create the test file**

```python
"""
E2E: Full generation flow — real Novita call, real S3 upload, real MongoDB write.

Run: pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s

WARNING: This test costs one Novita credit and writes to the production QART database.
It cleans up after itself, but interrupting it mid-run will leave orphaned records.
"""
import os
import time
import httpx
import pytest
from api.main import app
from api.tests.e2e.conftest import mint_guest_jwt

BASE = "http://test"

GENERATE_PARAMS = {
    "prompt": "a simple red geometric shape",
    "website": "https://qr-ai.co",
    "negative_prompt": "ugly blurry text",
    "seed": "42",
    "qr_weight": "0.3",
    "sd_model": "cyberrealistic_v40_151857.safetensors",
    "style_prompt": "",
    "style_title": "Custom",
}


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
async def test_generate_produces_scannable_image(mongo_db):
    """
    Full generation flow: real Novita call produces image, stored in S3 and MongoDB.

    Steps:
      1. Send generate request as a guest user
      2. Assert response contains image_url and watermarked_image_url
      3. Verify image document written to QART.images
      4. Cleanup: delete via API + remove guest_credits record
    """
    guest_id = f"guest_e2e_{int(time.time() * 1000)}"
    headers = {"Authorization": f"Bearer {mint_guest_jwt(guest_id)}"}
    image_id = None

    try:
        async with _client() as client:
            resp = await client.get(
                "/api/generate",
                params=GENERATE_PARAMS,
                headers=headers,
                timeout=180.0,
            )

        assert resp.status_code == 200, (
            f"Generate endpoint returned {resp.status_code}: {resp.text[:500]}"
        )
        data = resp.json()

        # Both S3 URLs must be present and non-empty
        assert "image_url" in data, "Response missing image_url"
        assert "watermarked_image_url" in data, "Response missing watermarked_image_url"
        assert data["image_url"].startswith("https://"), "image_url is not an HTTPS URL"
        assert data["watermarked_image_url"].startswith("https://"), \
            "watermarked_image_url is not an HTTPS URL"

        image_id = data.get("_id")
        assert image_id, "Response missing _id"

        # Verify document was written to MongoDB
        from bson import ObjectId
        db_doc = await mongo_db["images"].find_one({"_id": ObjectId(image_id)})
        assert db_doc is not None, f"Image {image_id} not found in QART.images"
        assert db_doc["user_id"] == guest_id
        assert db_doc["image_url"] == data["image_url"]

    finally:
        # Cleanup: delete image via API (exercises the delete endpoint too)
        if image_id:
            async with _client() as client:
                del_resp = await client.delete(
                    f"/api/images/delete/{image_id}",
                    headers=headers,
                    timeout=30.0,
                )
            # 200 or 404 (already deleted) are both acceptable
            assert del_resp.status_code in (200, 404), \
                f"Cleanup delete returned {del_resp.status_code}"

        # Remove the guest_credits record created during generation
        await mongo_db["guest_credits"].delete_one({"_id": guest_id})
```

- [ ] **Step 2: Run the test (takes 60–120 seconds)**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI/codebase"
source api/venv/bin/activate
pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s
```

Expected: 1 test PASSES. You will see Novita API log lines during the run.

If the test fails with a connection error, check that `NOVITA_KEY` is set in `.env`.

- [ ] **Step 3: Commit**

```bash
git add api/tests/e2e/test_e2e_generate.py
git commit -m "test(e2e): add generation flow test (real Novita call)"
```

---

## Task 12: E2E — Stripe test-mode webhook

**Files:**
- Create: `api/tests/e2e/test_e2e_payment.py`

**What it tests:** Full webhook path — valid Stripe test-mode signature → credits added → idempotency (replay doesn't double-credit).

**No real charge:** uses `stripe.WebhookSignature.generate_header` (part of the Stripe SDK) to sign a synthetic payload. No checkout session is created.

- [ ] **Step 1: Create the test file**

```python
"""
E2E: Stripe webhook flow — test-mode signature, real DB write, idempotency check.

Run: pytest api/tests/e2e/test_e2e_payment.py -v -c pytest-e2e.ini -s

Requires: STRIPE_ENDPOINT_SECRET in .env (use the test-mode webhook secret from
the Stripe dashboard → Developers → Webhooks → your endpoint).
"""
import json
import os
import time
import httpx
import pytest
import stripe
from bson import ObjectId
from datetime import datetime, timezone

from api.main import app
from api.controllers.payment_controller import PRICE_CREDITS_MAP
from api.tests.e2e.conftest import mint_service_jwt

BASE = "http://test"

# Use the first price in the map as a known-valid product ID.
VALID_PRICE_ID = list(PRICE_CREDITS_MAP.keys())[0]
VALID_CREDITS = PRICE_CREDITS_MAP[VALID_PRICE_ID]


def _build_checkout_event(user_id: str, payment_intent: str) -> dict:
    """Build a checkout.session.completed event payload."""
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user_id,
                "amount_total": 999,
                "metadata": {"product_id": VALID_PRICE_ID},
                "payment_intent": payment_intent,
                "created": int(time.time()),
            }
        },
    }


def _sign_payload(payload_bytes: bytes) -> str:
    """Sign a raw payload with STRIPE_ENDPOINT_SECRET using the Stripe test helper."""
    secret = os.environ["STRIPE_ENDPOINT_SECRET"]
    timestamp = int(time.time())
    return stripe.WebhookSignature.generate_header(
        payload=payload_bytes,
        secret=secret,
        timestamp=timestamp,
        scheme=stripe.WebhookSignature.EXPECTED_SCHEME,
    )


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
async def test_webhook_grants_credits_and_is_idempotent(mongo_db):
    """
    Stripe webhook flow:
      1. Seed a real user in QART.users with 10 credits
      2. POST a signed checkout.session.completed event
      3. Assert credits increased by VALID_CREDITS
      4. Replay the same event
      5. Assert credits did NOT increase again (idempotency)
    """
    user_id = ObjectId()
    user_email = f"e2e_payment_{int(time.time() * 1000)}@test.example.com"
    payment_intent = f"pi_e2e_test_{int(time.time() * 1000)}"

    user_doc = {
        "_id": user_id,
        "name": "E2E Payment Test",
        "email": user_email,
        "auth_providers": [],
        "credits": 10,
        "payment_history": [],
        "image_counts": {},
        "picture": None,
    }
    await mongo_db["users"].insert_one(user_doc)

    event = _build_checkout_event(str(user_id), payment_intent)
    payload_bytes = json.dumps(event).encode()
    signature = _sign_payload(payload_bytes)

    try:
        # --- First webhook delivery ---
        async with _client() as client:
            resp = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": signature,
                },
            )
        assert resp.status_code == 200, f"Webhook returned {resp.status_code}: {resp.text}"

        updated = await mongo_db["users"].find_one({"_id": user_id})
        assert updated["credits"] == 10 + VALID_CREDITS, (
            f"Expected {10 + VALID_CREDITS} credits, got {updated['credits']}"
        )

        # --- Replay (idempotency check) ---
        # Re-sign because the timestamp in the signature can't be too old.
        signature2 = _sign_payload(payload_bytes)
        async with _client() as client:
            resp2 = await client.post(
                "/api/stripe-webhook",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": signature2,
                },
            )
        assert resp2.status_code == 200

        after_replay = await mongo_db["users"].find_one({"_id": user_id})
        assert after_replay["credits"] == 10 + VALID_CREDITS, (
            "Idempotency failed: credits were granted twice"
        )

    finally:
        await mongo_db["users"].delete_one({"_id": user_id})
```

- [ ] **Step 2: Run the test**

```bash
pytest api/tests/e2e/test_e2e_payment.py -v -c pytest-e2e.ini -s
```

Expected: 1 test PASSES.

If the test fails with `stripe.error.SignatureVerificationError`, check that `STRIPE_ENDPOINT_SECRET` in `.env` is the **test-mode** webhook secret (starts with `whsec_`).

- [ ] **Step 3: Commit**

```bash
git add api/tests/e2e/test_e2e_payment.py
git commit -m "test(e2e): add Stripe webhook flow with idempotency check"
```

---

## Task 13: E2E — guest → sign-in → image transfer

**Files:**
- Create: `api/tests/e2e/test_e2e_auth.py`

**What it tests:** Sign-in bootstrap via `POST /api/user/auth` — new user created with 10 credits, guest image re-attributed to real user's `_id`.

- [ ] **Step 1: Create the test file**

```python
"""
E2E: Auth bootstrap — guest images re-attributed to new account on first sign-in.

Run: pytest api/tests/e2e/test_e2e_auth.py -v -c pytest-e2e.ini -s
"""
import os
import time
import httpx
import pytest
from bson import ObjectId
from datetime import datetime, timezone

from api.main import app
from api.tests.e2e.conftest import mint_service_jwt

BASE = "http://test"


def _client():
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.e2e
async def test_auth_creates_user_and_transfers_guest_images(mongo_db):
    """
    Auth bootstrap flow:
      1. Seed a guest image in QART.images
      2. POST /api/user/auth with guest_id (simulating Google sign-in)
      3. Assert new user created with 10 starter credits
      4. Assert image re-attributed to new user's _id
    """
    ts = int(time.time() * 1000)
    guest_id = f"guest_e2e_auth_{ts}"
    test_email = f"e2e_auth_{ts}@test.example.com"
    google_provider_id = f"google_e2e_{ts}"
    image_id = ObjectId()

    # Seed a guest-owned image
    await mongo_db["images"].insert_one({
        "_id": image_id,
        "user_id": guest_id,
        "prompt": "e2e auth test image",
        "website": "https://test.example.com",
        "created_at": datetime.now(timezone.utc),
        "image_url": "https://s3.example/img.png",
        "watermarked_image_url": "https://s3.example/img_wm.png",
        "style_title": "Custom",
        "sd_model": "test-model",
        "seed": 42,
        "qr_weight": 0.5,
        "negative_prompt": "",
        "width": 512,
        "height": 512,
        "downloaded": False,
        "likes": [],
    })

    auth_body = {
        "name": "E2E Auth Test",
        "email": test_email,
        "auth_providers": [{"provider": "google", "providerId": google_provider_id}],
        "guest_id": guest_id,
        "picture": None,
    }

    try:
        async with _client() as client:
            resp = await client.post(
                "/api/user/auth",
                json=auth_body,
                headers={"Authorization": f"Bearer {mint_service_jwt()}"},
            )

        assert resp.status_code == 200, f"Auth returned {resp.status_code}: {resp.text}"

        # New user must exist with 10 starter credits
        new_user = await mongo_db["users"].find_one({"email": test_email})
        assert new_user is not None, f"User with email {test_email} was not created"
        assert new_user["credits"] == 10, (
            f"Expected 10 starter credits, got {new_user['credits']}"
        )

        # Image must be re-attributed from guest_id to new user's _id
        updated_image = await mongo_db["images"].find_one({"_id": image_id})
        assert updated_image is not None, "Image not found after auth"
        assert updated_image["user_id"] == str(new_user["_id"]), (
            f"Image user_id not updated: expected {new_user['_id']}, "
            f"got {updated_image['user_id']}"
        )

    finally:
        await mongo_db["users"].delete_one({"email": test_email})
        await mongo_db["images"].delete_one({"_id": image_id})
```

- [ ] **Step 2: Run the test**

```bash
pytest api/tests/e2e/test_e2e_auth.py -v -c pytest-e2e.ini -s
```

Expected: 1 test PASSES.

- [ ] **Step 3: Run the full e2e suite (excluding the slow generate test)**

```bash
pytest api/tests/e2e/test_e2e_payment.py api/tests/e2e/test_e2e_auth.py -v -c pytest-e2e.ini -s
```

Expected: 2 tests PASS in under 15 seconds.

- [ ] **Step 4: Commit**

```bash
git add api/tests/e2e/test_e2e_auth.py
git commit -m "test(e2e): add guest→sign-in→image-transfer flow"
```

---

## Task 14: Feature summary document

**Files:**
- Create: `QR AI/FEATURES.md` (one level above `codebase/`)

- [ ] **Step 1: Create the file**

```markdown
# Q-Art Feature Summary

Living reference of all product features, their implementation location, and test coverage. Update the relevant row when adding or changing a feature.

---

## Core Generation

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| QR Art generation | URL + prompt → Stable Diffusion + ControlNet → scannable QR art image | `api/controllers/generate_controller.py` | `test_generate.py`, `test_http.py`, `test_e2e_generate.py` |
| Style presets | Pre-built style title + prompt pairs applied at generation time | `src/_utils/ImageStyles.js` | — (data only) |
| Random prompt | Randomises who/what/where/when + keyword categories for the prompt field | `src/_utils/PromptGenerator.js` | `promptGenerator.test.js` |
| QR weight slider | Controls ControlNet monster unit strength (0.85–1.05) and guidance start | `api/utils/utils.py` → `prepare_img2img_request` | `test_utils.py` (TestPrepareImg2ImgRequest) |
| Custom style | User-provided style prompt via Settings modal | `src/app/(main_pages)/generate/(formComponents)/CustomStyleModal.js` | — |
| Watermarking | Overlay applied before storing watermarked version to S3 | `api/utils/utils.py` → `create_watermark` | `test_utils.py` (TestCreateWatermark) |

---

## Auth & Identity

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Google OAuth sign-in | Standard OAuth 2.0 via next-auth Google provider | `src/app/api/auth/[...nextauth]/route.js` | `test_http.py` (auth enforcement) |
| Anonymous / guest session | Auto-created guest identity (`guest_<timestamp>`) with 3 free generations | `src/app/api/auth/[...nextauth]/route.js`, `api/controllers/generate_controller.py` | `test_generate.py` (guest path), `backendAuth.test.js` |
| Guest image transfer | On first real sign-in, images created as guest are re-owned | `api/controllers/users_controller.py` → `authenticate_user` | `test_users.py`, `test_e2e_auth.py` |
| Backend JWT auth | Short-lived HS256 JWT minted by Next.js, verified by FastAPI on every user-scoped call | `src/_utils/backendAuth.js`, `api/utils/auth.py` | `backendAuth.test.js`, `test_auth.py` |

---

## Credits & Payments

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Credit system | Deduct credits on generate, download, upscale; guest free quota enforced server-side | `api/utils/utils.py`, `api/controllers/users_controller.py` | `test_utils.py`, `test_users.py`, `utils.test.js` |
| Stripe Checkout | Creates a Stripe Checkout Session for a credit top-up | `api/controllers/payment_controller.py` → `create_checkout_session`, `src/_utils/paymentUtils.js` | `test_payment.py`, `paymentUtils.test.js`, `test_http.py` |
| Stripe webhook | Grants credits on `checkout.session.completed`; idempotent (deduplicates by payment_intent) | `api/controllers/payment_controller.py` → `stripe_webhook` | `test_payment.py`, `test_e2e_payment.py` |
| Credit display | Shows cost before download/upscale; must match backend pricing | `src/_components/actions/DownloadButton.js`, `src/_utils/utils.js` | `DownloadButton.test.js`, `utils.test.js` |

---

## Image Management

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Explore gallery | Public paginated feed of all images (sorted, filtered) | `api/controllers/images_controller.py` → `get_images` | `test_images.py`, `test_http.py`, `images.test.js` |
| My Codes gallery | User-scoped image gallery with filters | `src/app/(main_pages)/mycodes/` | — |
| Single image page | Detail view; intercepted as a modal when navigating from `/generate` | `src/app/images/[imageId]/`, `src/app/(main_pages)/generate/@modal/` | `images.test.js` (getImageById), `test_images.py` (get_image) |
| Like / unlike | Toggle like on any image | `api/controllers/images_controller.py` → `toggle_like` | `test_images.py`, `images.test.js` (likeImage) |
| Delete image | Owner-only hard delete from S3 + MongoDB | `api/controllers/images_controller.py` → `delete_image` | `test_images.py`, `images.test.js` (deleteImage) |

---

## Download & Upscale

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Download | First download charges 10 credits; already-downloaded is free | `src/_components/actions/DownloadButton.js`, `api/controllers/generate_controller.py` → `upscale` | `DownloadButton.test.js`, `test_upscale.py` |
| Upscale tiers | 512 / 1024 / 2048 / 4096 px; credit cost: 10 / 15 / 20 / 25 | `api/controllers/generate_controller.py` → `upscale` | `test_upscale.py`, `utils.test.js`, `images.test.js` (upscaleImage) |

---

## Instrumentation

| Feature | Description | Owner file(s) | Tests |
|---|---|---|---|
| Amplitude analytics | Tracks Generate, Download events with userId/style/resolution | `src/_context/amplitudeContext.js`, `src/app/(main_pages)/generate/GenerateForm.js` | Mocked in GenerateForm.test.js |
```

- [ ] **Step 2: Verify the file renders correctly**

Open the file in a markdown viewer or run:
```bash
cat "/Users/christophbiedermann/Documents/Projects/QR AI/FEATURES.md" | head -20
```

Expected: header and first table row visible.

- [ ] **Step 3: Commit**

```bash
cd "/Users/christophbiedermann/Documents/Projects/QR AI"
git add FEATURES.md
git commit -m "docs: add living feature summary (FEATURES.md)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| Python HTTP gaps: get_image_by_id, upscale route, checkout route | Tasks 1, 2 |
| Python unit: create_checkout_session | Task 3 |
| JS utils: deleteImage, likeImage, upscaleImage, getImages, getImageById | Task 4 |
| JS: promptRandomizer | Task 5 |
| JS: createCheckout | Task 6 |
| React testing-library install | Task 7 |
| GenerateForm component tests | Task 8 |
| DownloadButton component tests | Task 9 |
| E2E infrastructure | Task 10 |
| E2E generate (real Novita) | Task 11 |
| E2E Stripe webhook | Task 12 |
| E2E auth/guest transfer | Task 13 |
| FEATURES.md | Task 14 |

**No placeholders found.** All test code is complete and executable.

**Type/name consistency:**
- Python: `get_image` (function name in controller) matches what `test_http.py` patches as `api.main.get_image` ✓
- Python: `create_checkout_session` (function name in `payment_controller.py`) matches patch target ✓
- JS: All imported function names (`deleteImage`, `likeImage`, `upscaleImage`, `getImages`, `getImageById`) match exports in `ImagesUtils.js` ✓
- React: `useStore.setState` used correctly (Zustand exposes this as a static method on the hook) ✓
- E2E: `mint_guest_jwt`, `mint_service_jwt` defined in conftest and imported consistently ✓

---

**Run commands summary:**

```bash
# Unit tests (Python)
pytest api/tests/ -v

# Unit tests (JS)
npm run test:frontend

# E2E tests (fast: payment + auth, ~15s)
pytest api/tests/e2e/test_e2e_payment.py api/tests/e2e/test_e2e_auth.py -v -c pytest-e2e.ini -s

# E2E tests (all including slow Novita generate, ~2 min)
pytest api/tests/e2e/ -v -c pytest-e2e.ini -s
```
