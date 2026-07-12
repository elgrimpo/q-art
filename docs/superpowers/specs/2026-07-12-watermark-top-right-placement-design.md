# Watermark: move badge to top-right finder-square position

## Problem

The current watermark (`api/utils/watermark.png`, a 146×36 text logo) is pasted
in the bottom-right corner of every generated image by `create_watermark()`
(`api/utils/utils.py:182`). A new badge asset has been designed
(`design/QR_Watermark.png`, 151×152, rounded square with "QR-AI.CO") that's
meant to sit where a real QR code's top-right finder square would be, so it
reads as part of the QR's visual structure rather than a bolted-on logo.

## Scope

- Replace the watermark asset.
- Reposition the badge to the top-right finder-square location.
- This only affects `create_watermark()`, which is called exactly once, on
  the 768×1152 image returned by generation (`generate_controller.py:392`),
  before the watermarked copy is uploaded to S3. It is never called on the
  2048px unlocked/upscaled image (unlock delivers a clean image with no
  watermark), so no other call site needs to be touched.

## Design

### 1. Asset swap

Overwrite `api/utils/watermark.png` in place with the contents of
`design/QR_Watermark.png`. Same path, same filename — `create_watermark()`
doesn't need to change how it loads the file, only where it pastes it.

### 2. Position derivation

The badge should approximate where the QR's real top-right finder pattern
would land once the QR is fitted onto the 768×1152 canvas, without literally
computing per-request QR geometry (see options considered below).

Known geometry:
- The QR is always fitted onto a centered 768×768 square within the
  768×1152 canvas: `x:[0, 768]`, `y:[192, 960]` (`fit_qr_to_canvas`,
  `utils.py:59`).
- Real QR generation uses `box_size=10`, `border=4`,
  `error_correction=ERROR_CORRECT_H` (`generate_controller.py:230`).
- A QR's top-right finder pattern is always a 7×7-module block sitting
  `border` modules in from the top and right edges of the QR matrix
  (a fixed property of the QR spec, independent of matrix size).

Because `box_size` is fixed but the QR's module count grows with URL length,
the finder pattern's size *as a fraction of the 768×768 square* shrinks as
URLs get longer (short URL → fewer modules → more upscaling → bigger finder
square on canvas; long URL → more modules → less upscaling → smaller finder
square). Using a real 37-module example (`"instagram.com/some_business_name"`,
a representative business-URL length):

```
modules = 37
qr_px   = (modules + 2*border) * box_size = (37 + 8) * 10 = 450
scale   = 768 / qr_px = 1.7067
finder_inset = border * box_size * scale ≈ 68.3px
finder_size  = 7 * box_size * scale ≈ 119.5px
```

Mapped into canvas coordinates (QR square origin at `(0, 192)`):

```
finder_region = x:[768 - inset - size, 768 - inset] = [580, 700]
                y:[192 + inset, 192 + inset + size]  = [260, 380]
finder_center = (640, 320)
```

The badge (151×152, kept at its native/designed size per product decision —
see "Options considered") is centered on `finder_center`:

```
badge_x = round(640 - 151/2) = 564
badge_y = round(320 - 152/2) = 244
```

These are computed once as named constants in `utils.py` (not inline magic
numbers), with a comment explaining the derivation and its "representative
37-module URL, 768×1152 canvas" assumption, so a future reader can recompute
if the canvas size or QR constants change.

### 3. `create_watermark()` changes

- Drop the `width, height = watermarked_image.size` + bottom-right
  `position` calc.
- Paste at the fixed `(BADGE_X, BADGE_Y)` constants instead.
- Everything else (copy-before-paste, alpha-composited paste via the third
  `watermark` arg, try/except returning `None` on failure) stays as-is.

## Options considered

**Pixel-exact per-request placement** (compute real QR module count during
generation, resize/reposition the badge to match exactly) was considered and
rejected: it requires threading QR geometry from `generate_controller.py`
into `create_watermark()`, and the badge would visibly grow/shrink ~2x
between a short and a long URL (~83px–~185px), which reads as inconsistent
branding. Fixed size/position at a representative URL length was chosen
instead — it's very close for most real URLs and never jarring.

## Testing

- Existing `TestCreateWatermark` tests (`api/tests/test_utils.py:301`) use a
  generic 512×512 stand-in image and only assert dimensions-preserved,
  no-mutation, and `None`-on-missing-file — unaffected by the position
  change (the fixed coordinates land outside a 512×512 canvas, so `paste`
  is a silent no-op there, which is fine since these tests don't inspect
  pixels).
- Add one test using the real 768×1152 canvas size that asserts the badge
  lands in the top-right region (e.g. checks a pixel inside the expected
  badge bounds is non-white/non-background) rather than the old
  bottom-right position.

## Out of scope

- The pre-existing uncommitted `fit_qr_to_canvas` changes in `utils.py` /
  `test_utils.py` are unrelated leftover WIP and untouched by this change.
- No change to the old `watermark.png`-adjacent scripts
  (`api/scripts/add_watermark_script.py` etc.) — not part of the request
  path per `api/CLAUDE.md`.
