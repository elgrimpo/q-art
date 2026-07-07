# Explore Page Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Explore page's automatic hero-tile heuristic with an admin-curated `is_hero` flag, render non-square images at their true aspect ratio instead of forcing them into square crops, and fix stale scannability scores left over from before the scorer was made aspect-ratio-aware.

**Architecture:** Two new small, independently testable frontend modules (`imageAspect.js` for aspect-ratio classification, `gridLayout.js` for per-tile grid sizing) get consumed by the Explore page and by the two existing admin action menus (`ImageTopBar.js`, `ImagesCard.js`). On the backend, a new `is_hero` field and `toggle_hero` endpoint follow the exact shape of the existing `featured`/`toggle_featured` pair, with a cascade so un-featuring an image always clears its hero flag too. A one-off maintenance script is updated to rescore every image and then run once against production.

**Tech Stack:** Next.js 14 (App Router) / React 18 / MUI v5 / Zustand frontend; FastAPI / Motor (async MongoDB) backend; Jest (`npm run test:frontend`) and pytest (`pytest api/tests/ -v`, `asyncio_mode = auto`, no decorator needed).

## Global Constraints

- Spec: [docs/superpowers/specs/2026-07-07-explore-page-improvements-design.md](../specs/2026-07-07-explore-page-improvements-design.md) — every task below implements one numbered section of it.
- Hero requires Featured: an image can only be `is_hero: true` if `featured: true`; un-featuring cascades `is_hero` back to `false`.
- Hero tiles stay square-only: the Hero toggle is only offered (frontend) / only succeeds in a meaningful way (backend still just guards on `featured`) for images whose aspect ratio classifies as `"square"`.
- The Explore grid never opens on a hero tile: index `0` always renders as a normal tile regardless of `is_hero`.
- Aspect ratio thresholds are the existing ones from `explore/page.js`: ratio `> 1.2` → landscape, `< 0.8` → portrait, otherwise square.
- Follow existing patterns exactly: admin routes gated with `Depends(require_admin)`; controller functions do the work, `main.py` routes stay a 2-line passthrough; optimistic-update-with-rollback for toggle buttons (see `handleBookmark` in `ImageTopBar.js`/`ImagesCard.js`).
- New Jest mocks referencing outer variables must be named starting with `mock` (Jest's hoisting rule for `jest.mock` factories).

---

### Task 1: Shared image-aspect-ratio helper

**Files:**
- Create: `src/_utils/imageAspect.js`
- Test: `src/__tests__/imageAspect.test.js`

**Interfaces:**
- Produces: `getImageAspect(image: {width?, height?}): "square" | "landscape" | "portrait"`, `isSquareImage(image: {width?, height?}): boolean`. Later tasks (2, 8, 9) import both.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/imageAspect.test.js`:

```js
import { getImageAspect, isSquareImage } from '../_utils/imageAspect'

describe('getImageAspect', () => {
  test('square for equal width/height', () => {
    expect(getImageAspect({ width: 768, height: 768 })).toBe('square')
  })

  test('square for missing width/height', () => {
    expect(getImageAspect({})).toBe('square')
  })

  test('landscape for a 3:2 image', () => {
    expect(getImageAspect({ width: 1152, height: 768 })).toBe('landscape')
  })

  test('portrait for a 2:3 image', () => {
    expect(getImageAspect({ width: 768, height: 1152 })).toBe('portrait')
  })

  test('square for ratios within the 0.8-1.2 tolerance band', () => {
    expect(getImageAspect({ width: 900, height: 800 })).toBe('square')
  })
})

describe('isSquareImage', () => {
  test('true for a square image', () => {
    expect(isSquareImage({ width: 768, height: 768 })).toBe(true)
  })

  test('false for a landscape image', () => {
    expect(isSquareImage({ width: 1152, height: 768 })).toBe(false)
  })

  test('false for a portrait image', () => {
    expect(isSquareImage({ width: 768, height: 1152 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- imageAspect.test.js`
Expected: FAIL with "Cannot find module '../_utils/imageAspect'"

- [ ] **Step 3: Write minimal implementation**

Create `src/_utils/imageAspect.js`:

```js
export function getImageAspect(image) {
  if (!image?.width || !image?.height) return "square";
  const ratio = image.width / image.height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

export function isSquareImage(image) {
  return getImageAspect(image) === "square";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- imageAspect.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/imageAspect.js src/__tests__/imageAspect.test.js
git commit -m "feat: add shared getImageAspect/isSquareImage helper"
```

---

### Task 2: Explore grid layout helper (hero flag + true aspect ratio)

**Files:**
- Create: `src/app/(main_pages)/explore/gridLayout.js`
- Test: `src/__tests__/exploreGridLayout.test.js`

**Interfaces:**
- Consumes: `getImageAspect` from Task 1 (`src/_utils/imageAspect.js`).
- Produces: `isHeroTile(image, index): boolean`, `itemLayout(image, index): { gridColumn: string, gridRow?: string, aspectRatio: string }`. Task 3 imports `itemLayout`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/exploreGridLayout.test.js`:

```js
import { isHeroTile, itemLayout } from '../app/(main_pages)/explore/gridLayout'

describe('isHeroTile', () => {
  test('true for an is_hero image past index 0', () => {
    expect(isHeroTile({ is_hero: true }, 3)).toBe(true)
  })

  test('false at index 0 even when is_hero is true', () => {
    expect(isHeroTile({ is_hero: true }, 0)).toBe(false)
  })

  test('false when is_hero is not set', () => {
    expect(isHeroTile({}, 3)).toBe(false)
  })
})

describe('itemLayout', () => {
  test('hero tile spans 2 columns and 2 rows as a square', () => {
    const layout = itemLayout({ is_hero: true, width: 768, height: 768 }, 5)
    expect(layout).toEqual({ gridColumn: 'span 2', gridRow: 'span 2', aspectRatio: '1 / 1' })
  })

  test('square image is 1x1', () => {
    const layout = itemLayout({ width: 768, height: 768 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })

  test('landscape image spans 2 columns at its real ratio', () => {
    const layout = itemLayout({ width: 1152, height: 768 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 2', aspectRatio: '1152 / 768' })
  })

  test('portrait image spans 2 rows at its real ratio', () => {
    const layout = itemLayout({ width: 768, height: 1152 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', gridRow: 'span 2', aspectRatio: '768 / 1152' })
  })

  test('is_hero image at index 0 renders as a normal square tile, not a hero', () => {
    const layout = itemLayout({ is_hero: true, width: 768, height: 768 }, 0)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })

  test('missing width/height falls back to a square tile', () => {
    const layout = itemLayout({}, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- exploreGridLayout.test.js`
Expected: FAIL with "Cannot find module '../app/(main_pages)/explore/gridLayout'"

- [ ] **Step 3: Write minimal implementation**

Create `src/app/(main_pages)/explore/gridLayout.js`:

```js
import { getImageAspect } from "@/_utils/imageAspect";

// A 2x2 "hero" tile for images explicitly curated via the admin Hero toggle.
// Index 0 never renders as a hero, so the grid never opens on one.
export function isHeroTile(image, index) {
  return !!image?.is_hero && index !== 0;
}

export function itemLayout(image, index) {
  if (isHeroTile(image, index)) {
    return { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1 / 1" };
  }

  const aspect = getImageAspect(image);
  const ratio =
    image?.width && image?.height ? `${image.width} / ${image.height}` : "1 / 1";

  if (aspect === "landscape") return { gridColumn: "span 2", aspectRatio: ratio };
  if (aspect === "portrait") return { gridColumn: "span 1", gridRow: "span 2", aspectRatio: ratio };
  return { gridColumn: "span 1", aspectRatio: "1 / 1" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- exploreGridLayout.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main_pages)/explore/gridLayout.js" src/__tests__/exploreGridLayout.test.js
git commit -m "feat: add explore grid layout helper for hero flag + true aspect ratio"
```

---

### Task 3: Wire the new layout helper into the Explore page

**Files:**
- Modify: `src/app/(main_pages)/explore/page.js:1-49` (imports and the `getImageAspect`/`isHero`/`itemLayout`/`GRID_SX` definitions)

**Interfaces:**
- Consumes: `itemLayout` from Task 2 (`./gridLayout`).

- [ ] **Step 1: Remove the old aspect/hero/layout functions and `GRID_SX`**

In `src/app/(main_pages)/explore/page.js`, delete lines 21-49 (the `getImageAspect`, `isHero`, `itemLayout` functions and the `GRID_SX` constant):

```js
function getImageAspect(image) {
  if (!image.width || !image.height) return "square";
  const r = image.width / image.height;
  if (r > 1.2) return "landscape";
  if (r < 0.8) return "portrait";
  return "square";
}

// Every 7th image (index 0, 7, 14, …) that is square becomes a 2×2 hero.
function isHero(image, index) {
  return getImageAspect(image) === "square" && index % 7 === 0;
}

function itemLayout(image, index) {
  if (isHero(image, index)) {
    return { gridColumn: "span 2", gridRow: "span 2", aspectRatio: "1/1" };
  }
  const aspect = getImageAspect(image);
  // Landscape spans 2 columns but keeps square height so rows stay consistent.
  if (aspect === "landscape") return { gridColumn: "span 2", aspectRatio: "1/1" };
  // Portrait and square both render as 1×1 — objectFit cover handles cropping.
  return { gridColumn: "span 1", aspectRatio: "1/1" };
}

const GRID_SX = {
  display: "grid",
  gridAutoFlow: "row dense",
  gap: "8px",
};
```

Replace with:

```js
import { itemLayout } from "./gridLayout";

const GRID_SX = {
  display: "grid",
  gridAutoFlow: "row dense",
  // `start` (not the grid default `stretch`) so a tile's own aspect-ratio
  // height wins instead of being stretched to match the tallest tile sharing
  // its row track — required now that tiles have genuinely different heights.
  alignItems: "start",
  gap: "8px",
};
```

Add the `itemLayout` import to the top import block (after the existing `theme` import, around line 17):

```js
import theme from "@/_styles/theme";
import { itemLayout } from "./gridLayout";
```

- [ ] **Step 2: Run the existing test suite to confirm nothing else references the removed functions**

Run: `npm run test:frontend`
Expected: PASS, no failures (there is no existing test file for `explore/page.js`, so this just confirms no other file imported the removed functions)

Run: `grep -rn "getImageAspect\|isHero(" "src/app/(main_pages)/explore/page.js"`
Expected: no matches (confirms full removal; `itemLayout(` calls in the JSX body still reference the imported function, which is expected)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main_pages)/explore/page.js"
git commit -m "refactor: move Explore grid layout logic into gridLayout.js"
```

---

### Task 4: Backend `is_hero` schema field

**Files:**
- Modify: `api/schemas/schemas.py:118-123`
- Test: `api/tests/test_schema.py`

**Interfaces:**
- Produces: `ImageDoc.is_hero: Optional[bool] = False`. Task 5/6 controller code and Task 13's rescoring script rely on this field existing on documents.

- [ ] **Step 1: Write the failing test**

Add to `api/tests/test_schema.py` (after `test_image_doc_has_unlocked_not_downloaded`):

```python
def test_image_doc_has_is_hero():
    fields = ImageDoc.model_fields
    assert "is_hero" in fields
    assert fields["is_hero"].default is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest api/tests/test_schema.py::test_image_doc_has_is_hero -v`
Expected: FAIL with `AssertionError: assert 'is_hero' in {...}`

- [ ] **Step 3: Write minimal implementation**

In `api/schemas/schemas.py`, change:

```python
    unlocked: Optional[bool] = False
    unlock_pending: Optional[bool] = False
    featured: Optional[bool] = False
    scannability_score: Optional[float] = None
```

to:

```python
    unlocked: Optional[bool] = False
    unlock_pending: Optional[bool] = False
    featured: Optional[bool] = False
    is_hero: Optional[bool] = False
    scannability_score: Optional[float] = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest api/tests/test_schema.py -v`
Expected: PASS (all tests in the file, including the new one)

- [ ] **Step 5: Commit**

```bash
git add api/schemas/schemas.py api/tests/test_schema.py
git commit -m "feat: add is_hero field to ImageDoc"
```

---

### Task 5: `toggle_hero` controller + route

**Files:**
- Modify: `api/controllers/images_controller.py` (add after the existing `toggle_featured` function, ~line 322)
- Modify: `api/main.py:24` (import) and `api/main.py:188-190` (route, add directly after `toggle_featured_endpoint`)
- Test: `api/tests/test_images.py` (add after the existing `TOGGLE FEATURED` test block, ~line 338)

**Interfaces:**
- Consumes: `is_hero` field from Task 4.
- Produces: `async def toggle_hero(id) -> {"message": str, "is_hero": bool}` (raises `HTTPException(404)` if not found, `HTTPException(400)` if not featured); route `PUT /api/images/hero/{id}` gated by `Depends(require_admin)`. Task 7's `bookmarkHero` frontend call targets this route.

- [ ] **Step 1: Write the failing tests**

Add to `api/tests/test_images.py` (after the existing `test_toggle_featured_not_found_404` test, before end of file):

```python
# ---------------------------------------------------------------------------- #
#                                TOGGLE HERO                                    #
# ---------------------------------------------------------------------------- #

from api.controllers.images_controller import toggle_hero


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_sets_true_when_featured_and_not_hero(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True, "is_hero": False}
    )
    mock_images.update_one = AsyncMock()

    result = await toggle_hero(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"is_hero": True}}
    )
    assert result == {"message": "Hero toggled successfully", "is_hero": True}


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_sets_false_when_true(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True, "is_hero": True}
    )
    mock_images.update_one = AsyncMock()

    result = await toggle_hero(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"is_hero": False}}
    )
    assert result == {"message": "Hero toggled successfully", "is_hero": False}


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_rejects_when_not_featured(mock_images):
    mock_images.find_one = AsyncMock(
        return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": False, "is_hero": False}
    )
    with pytest.raises(HTTPException) as exc:
        await toggle_hero(FAKE_IMAGE_ID)
    assert exc.value.status_code == 400


@patch("api.controllers.images_controller.images")
async def test_toggle_hero_not_found_404(mock_images):
    mock_images.find_one = AsyncMock(return_value=None)
    with pytest.raises(HTTPException) as exc:
        await toggle_hero(FAKE_IMAGE_ID)
    assert exc.value.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest api/tests/test_images.py -k toggle_hero -v`
Expected: FAIL with `ImportError: cannot import name 'toggle_hero'`

- [ ] **Step 3: Write minimal implementation**

In `api/controllers/images_controller.py`, add directly after the existing `toggle_featured` function:

```python
# ---------------------------------------------------------------------------- #
#                                TOGGLE HERO                                    #
# ---------------------------------------------------------------------------- #


async def toggle_hero(id):
    try:
        image = await images.find_one({"_id": ObjectId(id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        if not image.get("featured", False):
            raise HTTPException(status_code=400, detail="Image must be featured before it can be a hero")

        new_value = not image.get("is_hero", False)
        await images.update_one({"_id": ObjectId(id)}, {"$set": {"is_hero": new_value}})

        return {"message": "Hero toggled successfully", "is_hero": new_value}

    except HTTPException:
        raise
    except Exception:
        logger.error("Unexpected error in toggle_hero", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
```

In `api/main.py`, change the import on line 24:

```python
from api.controllers.images_controller import get_images, get_image, toggle_like, delete_image, toggle_featured
```

to:

```python
from api.controllers.images_controller import get_images, get_image, toggle_like, delete_image, toggle_featured, toggle_hero
```

And add the route directly after `toggle_featured_endpoint` (~line 190):

```python
# BOOKMARK / FEATURE IMAGE (admin only)
@app.put("/api/images/bookmark/{id}")
async def toggle_featured_endpoint(id: str, _: dict = Depends(require_admin)):
    return await toggle_featured(id)

# HERO IMAGE (admin only) — requires the image to already be featured
@app.put("/api/images/hero/{id}")
async def toggle_hero_endpoint(id: str, _: dict = Depends(require_admin)):
    return await toggle_hero(id)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest api/tests/test_images.py -k toggle_hero -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/images_controller.py api/main.py api/tests/test_images.py
git commit -m "feat: add toggle_hero controller and PUT /api/images/hero/:id route"
```

---

### Task 6: `toggle_featured` cascades `is_hero: False` on un-feature

**Files:**
- Modify: `api/controllers/images_controller.py` (the `toggle_featured` function, ~line 313-322)
- Modify: `api/tests/test_images.py:319-329` (`test_toggle_featured_sets_false_when_true`)

**Interfaces:**
- Consumes: `toggle_hero`'s reliance on `featured` from Task 5 (this task guarantees that reliance stays consistent — an unfeatured image can never carry a stale `is_hero: true`).

- [ ] **Step 1: Update the existing test to assert the cascade (write the failing assertion)**

In `api/tests/test_images.py`, change `test_toggle_featured_sets_false_when_true`:

```python
@patch("api.controllers.images_controller.images")
async def test_toggle_featured_sets_false_when_true(mock_images):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True})
    mock_images.update_one = AsyncMock()

    result = await toggle_featured(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"featured": False}}
    )
    assert result == {"message": "Featured toggled successfully", "featured": False}
```

to:

```python
@patch("api.controllers.images_controller.images")
async def test_toggle_featured_sets_false_when_true(mock_images):
    mock_images.find_one = AsyncMock(return_value={"_id": ObjectId(FAKE_IMAGE_ID), "featured": True})
    mock_images.update_one = AsyncMock()

    result = await toggle_featured(FAKE_IMAGE_ID)

    mock_images.update_one.assert_called_once_with(
        {"_id": ObjectId(FAKE_IMAGE_ID)}, {"$set": {"featured": False, "is_hero": False}}
    )
    assert result == {"message": "Featured toggled successfully", "featured": False}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest api/tests/test_images.py::test_toggle_featured_sets_false_when_true -v`
Expected: FAIL — `update_one` was called with `{"$set": {"featured": False}}`, not the expected dict with `is_hero`

- [ ] **Step 3: Write minimal implementation**

In `api/controllers/images_controller.py`, change `toggle_featured`:

```python
async def toggle_featured(id):
    try:
        image = await images.find_one({"_id": ObjectId(id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        new_value = not image.get("featured", False)
        await images.update_one({"_id": ObjectId(id)}, {"$set": {"featured": new_value}})

        return {"message": "Featured toggled successfully", "featured": new_value}

    except HTTPException:
        raise
    except Exception:
        logger.error("Unexpected error in toggle_featured", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
```

to:

```python
async def toggle_featured(id):
    try:
        image = await images.find_one({"_id": ObjectId(id)})
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")

        new_value = not image.get("featured", False)
        update = {"featured": new_value}
        if not new_value:
            # An image can't be a hero without being featured — clear it so a
            # de-featured image never lingers as a stale hero tile.
            update["is_hero"] = False
        await images.update_one({"_id": ObjectId(id)}, {"$set": update})

        return {"message": "Featured toggled successfully", "featured": new_value}

    except HTTPException:
        raise
    except Exception:
        logger.error("Unexpected error in toggle_featured", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest api/tests/test_images.py -k toggle_featured -v`
Expected: PASS (3 tests — the updated one plus the unchanged `sets_true_when_false` and `not_found_404`, confirming the `True` branch still omits `is_hero`)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/images_controller.py api/tests/test_images.py
git commit -m "fix: clear is_hero when an image is removed from Explore"
```

---

### Task 7: `bookmarkHero` frontend util

**Files:**
- Modify: `src/_utils/ImagesUtils.js` (add after the existing `bookmarkImage` function, ~line 222)
- Test: `src/__tests__/images.test.js` (add after the existing `bookmarkImage` describe block, ~line 270)

**Interfaces:**
- Consumes: `PUT /api/images/hero/{id}` route from Task 5.
- Produces: `bookmarkHero(id: string): Promise<{is_hero: boolean}>`. Tasks 8 and 9 call this.

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/images.test.js` (after the closing `})` of the `bookmarkImage` describe block, before the `adminDownloadImage` section comment):

```js
// --------------------------------------------------------------------------
// bookmarkHero
// --------------------------------------------------------------------------

describe('bookmarkHero', () => {
  test('PUTs to /api/images/hero/:id with auth header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_hero: true }),
    })
    await bookmarkHero('img_hero1')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/api/images/hero/img_hero1')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('resolves with response JSON on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_hero: true }),
    })
    const result = await bookmarkHero('img_hero1')
    expect(result).toEqual({ is_hero: true })
  })

  test('throws when response is not ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400 })
    await expect(bookmarkHero('img_hero1')).rejects.toThrow('Failed to toggle hero')
  })
})
```

Update the top import line of `src/__tests__/images.test.js` to include `bookmarkHero`:

```js
import { generateImage, deleteImage, likeImage, unlockImage, getImages, getImageById, bookmarkImage, bookmarkHero, adminDownloadImage, getGenerationProgress } from '../_utils/ImagesUtils'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- images.test.js -t bookmarkHero`
Expected: FAIL — `bookmarkHero` is not a function (undefined import)

- [ ] **Step 3: Write minimal implementation**

In `src/_utils/ImagesUtils.js`, add directly after the existing `bookmarkImage` function:

```js
/* -------------------------------------------------------------------------- */
/*                             BOOKMARK HERO (admin)                          */
/* -------------------------------------------------------------------------- */

export const bookmarkHero = async (id) => {
  const token = await getBackendToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/hero/${id}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error("Failed to toggle hero");
  return res.json();
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- images.test.js -t bookmarkHero`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/ImagesUtils.js src/__tests__/images.test.js
git commit -m "feat: add bookmarkHero frontend util"
```

---

### Task 8: Hero menu item in `ImageTopBar.js`

**Files:**
- Modify: `src/app/images/[imageId]/ImageTopBar.js`
- Test: Create `src/__tests__/ImageTopBar.test.js` (no prior test file exists for this component)

**Interfaces:**
- Consumes: `isSquareImage` from Task 1, `bookmarkHero` from Task 7.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ImageTopBar.test.js`:

```js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  bookmarkHero: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }))
jest.mock('@/store', () => ({
  useStore: () => ({ openAlert: jest.fn() }),
}))
jest.mock('@/_components/actions/LikeButton', () => ({
  __esModule: true,
  default: () => <div data-testid="like-button" />,
}))
jest.mock('@/_components/actions/ShareButton', () => ({
  __esModule: true,
  default: () => <div data-testid="share-button" />,
}))
jest.mock('@/_components/actions/DeleteButton', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-button" />,
}))
jest.mock('../app/images/[imageId]/AdminImageInfoDialog', () => ({
  __esModule: true,
  default: () => null,
}))

import ImageTopBar from '../app/images/[imageId]/ImageTopBar'
import { bookmarkHero } from '@/_utils/ImagesUtils'

const SQUARE_IMAGE = { _id: 'img1', user_id: 'owner1', width: 768, height: 768, featured: true, is_hero: false }
const ADMIN_USER = { _id: 'admin1', is_admin: true }

test('non-admin users do not see the admin menu', () => {
  render(<ImageTopBar image={SQUARE_IMAGE} user={{ _id: 'someone', is_admin: false }} />)
  expect(screen.queryByLabelText('Admin actions')).not.toBeInTheDocument()
})

test('admin sees Set as Hero for a featured square image', () => {
  render(<ImageTopBar image={SQUARE_IMAGE} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Set as Hero')).toBeInTheDocument()
})

test('admin does not see the Hero option for a non-square image', () => {
  const landscapeImage = { ...SQUARE_IMAGE, width: 1152, height: 768 }
  render(<ImageTopBar image={landscapeImage} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('admin does not see the Hero option when the image is not featured', () => {
  const notFeatured = { ...SQUARE_IMAGE, featured: false }
  render(<ImageTopBar image={notFeatured} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('clicking Set as Hero calls bookmarkHero with the image id', () => {
  bookmarkHero.mockResolvedValueOnce({ is_hero: true })
  render(<ImageTopBar image={SQUARE_IMAGE} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  fireEvent.click(screen.getByText('Set as Hero'))
  expect(bookmarkHero).toHaveBeenCalledWith('img1')
})

test('shows Remove as Hero for an image already marked as hero', () => {
  const heroImage = { ...SQUARE_IMAGE, is_hero: true }
  render(<ImageTopBar image={heroImage} user={ADMIN_USER} />)
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Remove as Hero')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- ImageTopBar.test.js`
Expected: FAIL — "Set as Hero" text not found (menu item doesn't exist yet)

- [ ] **Step 3: Write minimal implementation**

In `src/app/images/[imageId]/ImageTopBar.js`, change:

```js
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CloseIcon from "@mui/icons-material/Close";
```

to:

```js
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
```

Update the utils/imports line:

```js
import { bookmarkImage, bookmarkHero, deleteImage } from "@/_utils/ImagesUtils";
import { useStore } from "@/store";
import { isSquareImage } from "@/_utils/imageAspect";
```

Add hero state next to the existing `featured` state:

```js
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [featured, setFeatured] = useState(!!image?.featured);
  const [isHero, setIsHero] = useState(!!image?.is_hero);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
```

Add a `handleHero` function directly after `handleBookmark`:

```js
  const handleHero = async () => {
    handleMenuClose();
    const prev = isHero;
    setIsHero(!prev);
    try {
      await bookmarkHero(image._id);
    } catch {
      setIsHero(prev);
      openAlert("error", "Could not update hero.");
    }
  };
```

Insert the Hero menu item directly after the existing Bookmark `MenuItem` and before the `<Divider />` that precedes the download items:

```jsx
              <MenuItem onClick={handleBookmark}>
                <ListItemIcon sx={{ color: featured ? "warning.main" : "primary.main" }}>
                  {featured ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </ListItemIcon>
                <Typography variant="body2">{featured ? "Remove from Explore" : "Add to Explore"}</Typography>
              </MenuItem>
              {featured && isSquareImage(image) && (
                <MenuItem onClick={handleHero}>
                  <ListItemIcon sx={{ color: isHero ? "warning.main" : "primary.main" }}>
                    {isHero ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </ListItemIcon>
                  <Typography variant="body2">{isHero ? "Remove as Hero" : "Set as Hero"}</Typography>
                </MenuItem>
              )}
              <Divider />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- ImageTopBar.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/images/[imageId]/ImageTopBar.js" src/__tests__/ImageTopBar.test.js
git commit -m "feat: add Hero toggle to ImageTopBar admin menu"
```

---

### Task 9: Hero menu item in `ImagesCard.js`

**Files:**
- Modify: `src/app/(main_pages)/mycodes/ImagesCard.js`
- Modify: `src/__tests__/ImagesCard.test.js`

**Interfaces:**
- Consumes: `isSquareImage` from Task 1, `bookmarkHero` from Task 7.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/ImagesCard.test.js`, change the top mocks and imports:

```js
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

jest.mock('@/store.js', () => ({
  useStore: () => ({ user: { _id: 'u1', is_guest: false }, openAlert: jest.fn() }),
}))
```

to:

```js
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/_utils/ImagesUtils', () => ({
  bookmarkImage: jest.fn(),
  bookmarkHero: jest.fn(),
  deleteImage: jest.fn(),
}))
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

let mockUser = { _id: 'u1', is_guest: false, is_admin: false }
jest.mock('@/store.js', () => ({
  useStore: () => ({ user: mockUser, openAlert: jest.fn() }),
}))
```

Update the `BASE` fixture to include aspect-ratio and hero fields:

```js
const BASE = {
  _id: 'img1',
  watermarked_image_url: 'http://example.com/img.jpg',
  content: 'loremipsum.com',
  style_title: 'Doodle Art',
  unlocked: false,
  scannability_score: null,
  likes: [],
  width: 768,
  height: 768,
  featured: false,
  is_hero: false,
}
```

Add `import { bookmarkHero } from '@/_utils/ImagesUtils'` after the `ImageCard` import, and add these tests at the end of the file (before the final closing, after the existing `renders like button overlay` test):

```js
afterEach(() => {
  mockUser = { _id: 'u1', is_guest: false, is_admin: false }
})

test('non-admin users do not see the admin menu', () => {
  renderCard()
  expect(screen.queryByLabelText('Admin actions')).not.toBeInTheDocument()
})

test('admin sees Set as Hero for a featured square image', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Set as Hero')).toBeInTheDocument()
})

test('admin does not see the Hero option for a non-square image', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true, width: 1152, height: 768 })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('admin does not see the Hero option when the image is not featured', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: false })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.queryByText('Set as Hero')).not.toBeInTheDocument()
})

test('clicking Set as Hero calls bookmarkHero with the image id', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  bookmarkHero.mockResolvedValueOnce({ is_hero: true })
  renderCard({ featured: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  fireEvent.click(screen.getByText('Set as Hero'))
  expect(bookmarkHero).toHaveBeenCalledWith('img1')
})

test('shows Remove as Hero for an image already marked as hero', () => {
  mockUser = { _id: 'admin1', is_guest: false, is_admin: true }
  renderCard({ featured: true, is_hero: true })
  fireEvent.click(screen.getByLabelText('Admin actions'))
  expect(screen.getByText('Remove as Hero')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- ImagesCard.test.js`
Expected: FAIL — "Set as Hero" text not found

- [ ] **Step 3: Write minimal implementation**

In `src/app/(main_pages)/mycodes/ImagesCard.js`, change:

```js
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
```

to:

```js
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
```

Update the utils import and add the aspect helper import:

```js
import { bookmarkImage, bookmarkHero, deleteImage } from "@/_utils/ImagesUtils";
import { isSquareImage } from "@/_utils/imageAspect";
```

Add hero state next to `featured`:

```js
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [featured, setFeatured] = useState(!!image?.featured);
  const [isHero, setIsHero] = useState(!!image?.is_hero);
```

Add `handleHero` directly after `handleBookmark`:

```js
  const handleHero = async () => {
    handleMenuClose();
    const prev = isHero;
    setIsHero(!prev);
    try {
      await bookmarkHero(image._id);
    } catch {
      setIsHero(prev);
      openAlert("error", "Could not update hero.");
    }
  };
```

Insert the Hero menu item after the Bookmark `MenuItem`, before the `<Divider />`:

```jsx
                  <MenuItem onClick={handleBookmark}>
                    <ListItemIcon sx={{ color: featured ? "warning.main" : "primary.main" }}>
                      {featured ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                    </ListItemIcon>
                    <Typography variant="body2">{featured ? "Remove from Explore" : "Add to Explore"}</Typography>
                  </MenuItem>
                  {featured && isSquareImage(image) && (
                    <MenuItem onClick={handleHero}>
                      <ListItemIcon sx={{ color: isHero ? "warning.main" : "primary.main" }}>
                        {isHero ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                      </ListItemIcon>
                      <Typography variant="body2">{isHero ? "Remove as Hero" : "Set as Hero"}</Typography>
                    </MenuItem>
                  )}
                  <Divider />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- ImagesCard.test.js`
Expected: PASS (all tests, including the pre-existing ones)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main_pages)/mycodes/ImagesCard.js" src/__tests__/ImagesCard.test.js
git commit -m "feat: add Hero toggle to mycodes admin menu"
```

---

### Task 10: Rescore every image in the backfill script

**Files:**
- Modify: `api/scripts/backfill_scannability.py`

**Interfaces:**
- None (standalone maintenance script, not imported by app code or tests — matches existing convention for `api/scripts/`).

- [ ] **Step 1: Update the docstring and query**

In `api/scripts/backfill_scannability.py`, change:

```python
"""One-off script: compute and store scannability_score for all images that
don't have one yet.

Run from the repo root:
    python -m api.scripts.backfill_scannability

Requires MONGO_URL in the environment (sourced from .env automatically).
Skips docs where image_url is missing or the download fails.
"""
```

to:

```python
"""One-off script: (re)compute and store scannability_score for every image,
overwriting any existing score.

Run from the repo root:
    python -m api.scripts.backfill_scannability

Requires MONGO_URL in the environment (sourced from .env automatically).
Skips docs where image_url is missing or the download fails.

Rescores everything (not just docs missing a score) because the structural
scorer was upgraded after the original backfill ran (QRAI-110: center-square
localization so portrait/landscape renders align correctly) — images scored
before that fix carry stale scores from the old, aspect-ratio-blind scorer.
"""
```

Change:

```python
    query = {"scannability_score": {"$exists": False}}
    total = await images.count_documents(query)
    logger.info("Found %d images to backfill", total)
```

to:

```python
    query = {}
    total = await images.count_documents(query)
    logger.info("Found %d images to rescore", total)
```

- [ ] **Step 2: Verify the script's logic is otherwise unchanged**

Run: `grep -n "scannability_score" api/scripts/backfill_scannability.py`
Expected: the `$set` update line still reads `{"$set": {"scannability_score": result.score}}` — only the selection query and log/docstring text changed, the per-doc scoring and skip-on-missing-`image_url`/`content` logic is untouched.

- [ ] **Step 3: Commit**

```bash
git add api/scripts/backfill_scannability.py
git commit -m "fix: rescore every image in backfill_scannability, not just unscored ones"
```

---

### Task 11: Run full test suites

**Files:** None — verification checkpoint before manual/production steps.

- [ ] **Step 1: Run the full backend suite**

Run: `pytest api/tests/ -v`
Expected: PASS, no failures or errors (ignore any pre-existing skipped `e2e`/`novita`-marked tests if your local env lacks those credentials — that's expected and unrelated to this work)

- [ ] **Step 2: Run the full frontend suite**

Run: `npm run test:frontend`
Expected: PASS, no failures

- [ ] **Step 3: If anything fails, fix it before proceeding**

Do not continue to Task 12/13 with a red test suite. Any failure here means a mistake in Tasks 1-10 — go back to the relevant task and fix it, re-running that task's own test command first, then re-run Steps 1-2 of this task.

---

### Task 12: Manual browser verification of the Explore page

**Files:** None — this task uses the running app, not new code.

- [ ] **Step 1: Start the dev server**

Use `preview_start` (per this session's tooling) to start the `npm run dev` configuration, or run `npm run dev` directly if working outside that tooling. Wait for both Next.js (3000) and FastAPI (8000) to be ready.

- [ ] **Step 2: Verify true aspect ratio rendering**

Navigate to `/explore` in the browser preview. Take a screenshot. Confirm:
- Square images still render as clean 1x1 tiles.
- Any portrait (e.g. 2:3) images in the current featured set render taller than wide, without visible cropping or stretching of neighboring tiles.
- Any landscape (e.g. 3:2) images render wider than tall, without visible cropping or stretching of neighboring tiles.

If the current database has no non-square featured images to check against, use `preview_eval` to temporarily patch one rendered tile's underlying data in the React DevTools/DOM for a visual spot-check, or ask the project owner to point at a known non-square featured image. Do not skip this check silently — if you cannot find or simulate a non-square example, say so explicitly rather than declaring the aspect-ratio fix verified.

- [ ] **Step 3: Fix any visual issues found**

If tiles are stretched, cropped, or leave large unexpected gaps, the likely cause is the `alignItems: "start"` interaction with `grid-auto-flow: row dense` in `GRID_SX` (`src/app/(main_pages)/explore/page.js`) or the row/column spans in `itemLayout` (`src/app/(main_pages)/explore/gridLayout.js`). Adjust and re-screenshot until square/landscape/portrait tiles all render at their true ratio with no visible distortion. Re-run Task 2's Jest tests after any `gridLayout.js` change to confirm the pure-logic assertions still pass.

- [ ] **Step 4: Verify hero placement and the admin Hero toggle end-to-end**

As an admin user, open a square, currently-featured image's detail view and confirm the "Set as Hero" option appears in the admin menu (both from `/explore` and from `/mycodes`). Toggle it on. Reload `/explore` and confirm:
- That image renders as a 2x2 hero tile if it isn't the very first item in the grid.
- If it happens to be the very first item, it renders as a normal tile instead (never a hero at index 0).

Toggle "Remove from Explore" (un-feature) on that same image via the admin menu, then re-fetch it (e.g. via `/api/images/get/{id}`) and confirm `is_hero` came back `false` — i.e. the Task 6 cascade actually happened against a real document, not just in the mocked test.

---

### Task 13: Rescore all images in production

**Files:** None — running the Task 10 script against production data.

- [ ] **Step 1: Confirm you're pointed at the intended database**

Run: `grep MONGO_URL .env | sed -E 's/(mongodb\+srv:\/\/[^:]+:).*(@.*)/\1***\2/'`

Confirm with the project owner that this is the production connection string before proceeding — this script overwrites `scannability_score` on every image document.

- [ ] **Step 2: Run the updated backfill script**

Run: `python -m api.scripts.backfill_scannability`

This downloads and rescores every image; expect it to take a while proportional to the total image count. Watch for a steady stream of `[n/total] <id> → <score>` INFO lines.

- [ ] **Step 3: Report the outcome**

When the script finishes, it prints `Done. processed=<n> failed=<n>`. Report both numbers. If `failed` is non-zero, check the WARNING log lines above the summary — they name the doc id and reason (missing `image_url`/`content`, or a download/scoring exception) for each failure, consistent with the script's existing skip behavior.
