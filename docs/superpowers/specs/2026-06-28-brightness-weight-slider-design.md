# Brightness Weight Slider — Design Spec

**Date:** 2026-06-28
**Scope:** Create Iteration flow (IteratePanel / GenerationFormFields)

---

## Overview

The QR Code Weight slider in the Iterate form currently controls the QR Monster ControlNet (which is broken/hardcoded). This change repurposes the slider to control the **Brightness ControlNet weight** instead. The slider range shrinks from -3..+3 to -2..+2 (5 discrete integer steps). As the user drags, a 250×250 preview image appears showing the visual effect of that brightness weight. The raw integer is sent to the backend, which owns the weight formula.

---

## Slider Changes

- **Range:** -2 to +2 (was -3 to +3)
- **Step:** 1 (integer only — 5 discrete positions, one per preview image)
- **Constants:** `QR_SLIDER_MIN = -2`, `QR_SLIDER_MAX = 2` in `src/_utils/qrWeight.js`
- **SettingsModal:** Hardcoded `-3`/`3` updated to use the same constants
- **Marks:** "Artistic" at -2, "Scannable" at +2 (unchanged labels)

---

## Image Preview Popup

**Trigger:** Shows while user is pressing/dragging the slider; hides on release.
- Show: `onPointerDown` on the slider wrapper div
- Hide: MUI Slider's `onChangeCommitted` (fires on mouse/touch release, cross-device)

**Placement:** Above the slider section label, centered horizontally.

**Size:** 250×250px, `object-fit: cover`, rounded corners to match UI style.

**Image map** (integers → filenames in `public/slider-images/`):

| Slider value | File |
|---|---|
| -2 | `Weight_minus_2.png` |
| -1 | `Weight_minus_1.png` |
| 0 | `Weight_0.png` |
| +1 | `Weight_plus_1.png` |
| +2 | `Weight_plus_2.png` |

Source images live at `design/slider images/`. Note: the +2 source file has a typo (`Weight_plua_2.png`) — rename it to `Weight_plus_2.png` when copying to `public/`.

**State:** `showWeightPreview` boolean, local to `GenerationFormFields`. The image src resolves from `Math.round(values.qr_weight)` (defensive rounding; slider is already integer-stepped).

---

## Payload Change (Frontend)

In `src/_utils/ImagesUtils.js`, add `brightness_weight` to the generate payload:

```js
brightness_weight: Math.round(generateFormValues.qr_weight),
```

No conversion formula on the frontend. The raw integer (-2..+2) is sent as-is.

The existing `qr_weight` param continues to be sent (converted via `sliderToQrWeight` as before) for backward compat; the backend ignores it for QR Monster since that strength is now fixed.

---

## Backend Changes

### `api/main.py` — generate endpoint

Add new query param:

```python
brightness_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
```

Pass it through to `predict()`.

### `api/controllers/generate_controller.py` — `predict()`

Add `brightness_weight: int = 0` to the signature. Pass it to `prepare_img2img_request()`.

### `api/utils/utils.py` — `prepare_img2img_request()`

Add `brightness_weight: int = 0` to the signature. Replace the hardcoded `strength=0.35` on the brightness ControlNet unit:

```python
strength = 0.35 + brightness_weight * 0.1
```

Weight mapping:

| Slider | Brightness strength |
|---|---|
| -2 | 0.15 |
| -1 | 0.25 |
| 0 | 0.35 (default) |
| +1 | 0.45 |
| +2 | 0.55 |

The formula lives entirely in `utils.py` so future parameters (e.g. a second modifier) can be added there without any frontend changes.

---

## Files Touched

| File | Change |
|---|---|
| `design/slider images/` | Source only — copy to public, don't modify |
| `public/slider-images/` (new) | 5 PNG files copied + +2 file renamed |
| `src/_utils/qrWeight.js` | Update `QR_SLIDER_MIN/MAX` to ±2 |
| `src/app/(main_pages)/generate/(formComponents)/GenerationFormFields.js` | Add preview state + image popup + step=1 |
| `src/app/(main_pages)/generate/(formComponents)/SettingsModal.js` | Use `QR_SLIDER_MIN/MAX` constants instead of hardcoded ±3 |
| `src/_utils/ImagesUtils.js` | Add `brightness_weight` to payload |
| `api/main.py` | Add `brightness_weight` query param |
| `api/controllers/generate_controller.py` | Thread `brightness_weight` through `predict()` |
| `api/utils/utils.py` | Replace hardcoded `0.35` with formula |
| `src/__tests__/qrWeight.test.js` | Update range expectations to ±2 |

---

## Initialization

`IteratePanel.js` currently pre-fills `qr_weight` from the stored image's `img.qr_weight` via `qrWeightToSlider()`. Since brightness weight is not persisted in `ImageDoc`, this pre-fill is dropped: the brightness slider always initializes to `0` (default) when opening the iterate form. Update `initFormValues()` in `IteratePanel.js` to hard-code `qr_weight: 0` instead of deriving it from the image doc.

---

## Out of Scope

- Renaming the internal `qr_weight` store/form field (cosmetic; field meaning is dead already due to the QR Monster bug)
- Persisting `brightness_weight` in the MongoDB `ImageDoc`
- Changing the slider in the main generate form's Advanced Settings beyond updating the range constants
