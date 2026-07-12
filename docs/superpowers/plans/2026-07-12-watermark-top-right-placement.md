# Watermark Top-Right Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-right text-logo watermark with the new `design/QR_Watermark.png` badge, positioned to approximate the QR's top-right finder square on the 768×1152 generated canvas.

**Architecture:** Single-file change to `api/utils/utils.py`'s `create_watermark()` — swap the asset it loads (via file replacement, no code change needed for that part) and replace its bottom-right position math with a fixed `BADGE_CENTER` constant derived from QR geometry.

**Tech Stack:** Python, Pillow (`PIL.Image`), pytest.

## Global Constraints

- `create_watermark()` is only ever called on the 768×1152 image produced by generation (`generate_controller.py:392`) — the position math only needs to be correct for that canvas size (per spec: `docs/superpowers/specs/2026-07-12-watermark-top-right-placement-design.md`).
- Badge stays at its native 151×152 size — no per-request resizing (product decision, see spec's "Options considered").
- `BADGE_CENTER = (640, 320)`, derived from a representative 37-module QR (`box_size=10`, `border=4`) — see spec for the full derivation; copy the derivation comment into the code so it's traceable.

---

### Task 1: Replace the watermark asset

**Files:**
- Modify (binary replace): `codebase/api/utils/watermark.png`
- Source: `design/QR_Watermark.png` (repo root, sibling to `codebase/`)

**Interfaces:**
- Consumes: nothing.
- Produces: `api/utils/watermark.png` now contains the 151×152 badge instead of the old 146×36 text logo. `create_watermark()` (Task 2) loads this same path unchanged.

- [ ] **Step 1: Copy the new asset over the old one**

```bash
cp "design/QR_Watermark.png" "codebase/api/utils/watermark.png"
```

- [ ] **Step 2: Verify the file was replaced correctly**

```bash
cd codebase && python3 -c "
from PIL import Image
im = Image.open('api/utils/watermark.png')
print(im.size, im.mode)
"
```

Expected output: `(151, 152) RGBA`

- [ ] **Step 3: Commit**

```bash
cd codebase && git add api/utils/watermark.png
git commit -m "feat: replace watermark asset with top-right finder-square badge"
```

---

### Task 2: Reposition the badge in `create_watermark()`

**Files:**
- Modify: `codebase/api/utils/utils.py:182-205` (the `create_watermark` function)
- Test: `codebase/api/tests/test_utils.py:301-323` (the `TestCreateWatermark` class)

**Interfaces:**
- Consumes: `api/utils/watermark.png` (Task 1's replaced asset, 151×152).
- Produces: `create_watermark(image: PIL.Image.Image) -> PIL.Image.Image | None` — same signature as before, only the paste position changes. No other file calls this differently.

- [ ] **Step 1: Write the failing tests**

Add these two tests inside `TestCreateWatermark` in `codebase/api/tests/test_utils.py`, right after the existing `test_returns_none_when_watermark_file_missing` test (which stays as-is):

```python
    def test_places_badge_near_qr_top_right_finder_square(self):
        img = self._img((768, 1152))
        result = create_watermark(img)
        # BADGE_CENTER in utils.py is (640, 320) on this canvas size — a
        # white pixel there means the badge didn't land where expected.
        assert result.getpixel((640, 320)) != (255, 255, 255)

    def test_no_longer_watermarks_bottom_right(self):
        img = self._img((768, 1152))
        result = create_watermark(img)
        # Old behavior pasted the watermark flush into the bottom-right
        # corner; confirm that area is untouched now.
        assert result.getpixel((767, 1151)) == (255, 255, 255)
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd codebase && python -m pytest api/tests/test_utils.py::TestCreateWatermark -v
```

Expected: `test_places_badge_near_qr_top_right_finder_square` FAILS (badge is still bottom-right, so `(640, 320)` is still pure white). `test_no_longer_watermarks_bottom_right` PASSES already (old watermark is 146×36, doesn't reach `(767, 1151)` — that's fine, it becomes a real regression guard once Task 2 Step 3 lands).

- [ ] **Step 3: Replace the position logic in `create_watermark()`**

In `codebase/api/utils/utils.py`, replace the whole block from the `# CREATE WATERMARKED B64 IMAGE` header through the end of `create_watermark()` (currently lines 177-205) with:

```python
# ---------------------------------------------------------------------------- #
#                            CREATE WATERMARKED B64 IMAGE                            #
# ---------------------------------------------------------------------------- #

# Where the badge lands: approximates the top-right finder square of the QR
# once it's fitted onto generate_controller's 768x1152 output canvas (the QR
# occupies x:[0,768], y:[192,960] there — see fit_qr_to_canvas). Derived from
# a representative 37-module QR (~35-char URL, e.g.
# "instagram.com/some_business_name") using the same box_size=10/border=4
# constants real QR generation uses:
#   qr_px = (37 + 2*4) * 10 = 450; scale = 768 / qr_px = 1.7067
#   finder_inset = 4 * 10 * scale = 68.3px; finder_size = 7 * 10 * scale = 119.5px
#   finder_center = (768 - 68.3 - 119.5/2, 192 + 68.3 + 119.5/2) = (640, 320)
# The badge is kept at its native size and centered on that point rather than
# resized per-request — shorter/longer URLs shift the real finder square by
# roughly +/-40px from here, but a fixed placement avoids the badge visibly
# growing/shrinking between generations (see the design spec, "Options
# considered"). Only valid for the 768x1152 canvas create_watermark() is
# actually called on.
BADGE_CENTER = (640, 320)


def create_watermark(image):
    try:
        watermark_image_path = "api/utils/watermark.png"
        watermark = Image.open(watermark_image_path)

        # Create a copy of the original image
        watermarked_image = image.copy()

        # Place the badge over the QR's top-right finder-square area
        watermark_size = watermark.size
        position = (
            round(BADGE_CENTER[0] - watermark_size[0] / 2),
            round(BADGE_CENTER[1] - watermark_size[1] / 2),
        )

        watermarked_image.paste(watermark, position, watermark)

        # Convert to base64
        buffered = BytesIO()
        watermarked_image.save(buffered, format="PNG")

        return watermarked_image

    except Exception as e:
        print(f"Error creating watermarked base64: {str(e)}")
        return None
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd codebase && python -m pytest api/tests/test_utils.py::TestCreateWatermark -v
```

Expected: all 6 tests in `TestCreateWatermark` PASS (the 4 pre-existing ones plus the 2 new ones).

- [ ] **Step 5: Run the full test file to check for regressions**

```bash
cd codebase && python -m pytest api/tests/test_utils.py -v
```

Expected: all tests PASS (no unrelated breakage).

- [ ] **Step 6: Commit**

```bash
cd codebase && git add api/utils/utils.py api/tests/test_utils.py
git commit -m "feat: place watermark badge at QR's top-right finder-square position"
```

---

## Manual Verification (post-implementation)

Not covered by unit tests — generate one real image end-to-end (`npm run dev`, generate flow) and visually confirm the badge sits near the top-right of the artwork where the QR's finder square would be, at a reasonable size relative to the art, rather than in the old bottom-right spot.
