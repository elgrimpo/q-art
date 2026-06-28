# Brightness Weight Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded brightness ControlNet strength (0.35) with a user-controlled slider (-2..+2) in the Iterate form, showing a preview image while dragging.

**Architecture:** The existing QR weight slider in `GenerationFormFields.js` is repurposed to control brightness. The frontend sends the raw integer (-2..+2) as `brightness_weight`; the backend computes `0.35 + brightness_weight * 0.1` in `utils.py`. A 250×250 image popup appears while the user presses/drags the slider.

**Tech Stack:** Next.js 14 / React 18 / MUI v5 (frontend), FastAPI / Python (backend), Jest / pytest (tests)

## Global Constraints

- Slider range: -2 to +2, step 1 (integer only)
- Default brightness weight: 0 → strength 0.35
- Image popup: 250×250px, visible only while pointer is held down on slider
- `brightness_weight` formula lives exclusively in `api/utils/utils.py`
- QR Monster ControlNet strength stays fixed (no change to that unit)
- `qr_weight` backend param and its QR Monster mapping are left untouched

---

## File Map

| File | Change |
|---|---|
| `public/slider-images/` (new dir) | 5 static PNGs served by Next.js |
| `src/_utils/qrWeight.js` | `QR_SLIDER_MIN/MAX` → ±2 |
| `src/__tests__/qrWeight.test.js` | Update range expectations |
| `src/app/(main_pages)/generate/(formComponents)/GenerationFormFields.js` | Add preview state + image map + popup + step=1 |
| `src/app/(main_pages)/generate/(formComponents)/SettingsModal.js` | Use `QR_SLIDER_MIN/MAX` constants (remove hardcoded ±3) |
| `src/app/images/[imageId]/IteratePanel.js` | Init `qr_weight: 0` (not from image doc) |
| `src/_utils/ImagesUtils.js` | Add `brightness_weight` to generate payload |
| `api/main.py` | Add `brightness_weight: int` query param |
| `api/controllers/generate_controller.py` | Thread `brightness_weight` through `predict()` |
| `api/utils/utils.py` | Accept `brightness_weight`, compute strength formula |
| `api/tests/test_utils.py` | Replace fixed-strength test with formula tests |

---

### Task 1: Copy slider images to public/

**Files:**
- Create: `public/slider-images/Weight_minus_2.png`
- Create: `public/slider-images/Weight_minus_1.png`
- Create: `public/slider-images/Weight_0.png`
- Create: `public/slider-images/Weight_plus_1.png`
- Create: `public/slider-images/Weight_plus_2.png`

**Interfaces:**
- Produces: Static PNG files at `/slider-images/<name>.png` (served by Next.js from `public/`)

- [ ] **Step 1: Resize and copy images**

Run from `codebase/`. `sips` is macOS built-in — no extra tooling needed. Resizes each source from 2048×2048 to 500×500 (2x retina for 250px display size). The +2 source has a typo in its filename (`plua`) — corrected on output.

```bash
mkdir -p public/slider-images
for src in "Weight_minus_2.png" "Weight_minus_1.png" "Weight_0.png" "Weight_plus_1.png"; do
  sips -z 500 500 "../design/slider images/$src" --out "public/slider-images/$src"
done
sips -z 500 500 "../design/slider images/Weight_plua_2.png" --out "public/slider-images/Weight_plus_2.png"
```

- [ ] **Step 2: Verify files exist**

```bash
ls public/slider-images/
```

Expected output:
```
Weight_0.png  Weight_minus_1.png  Weight_minus_2.png  Weight_plus_1.png  Weight_plus_2.png
```

- [ ] **Step 3: Commit**

```bash
git add public/slider-images/
git commit -m "feat: add brightness slider preview images to public/"
```

---

### Task 2: Update slider range constants and fix tests

**Files:**
- Modify: `src/_utils/qrWeight.js`
- Modify: `src/__tests__/qrWeight.test.js`

**Interfaces:**
- Produces: `QR_SLIDER_MIN = -2`, `QR_SLIDER_MAX = 2` exported from `qrWeight.js`
- Produces: `sliderToQrWeight(v)` maps -2..+2 → 0..1; `qrWeightToSlider(v)` maps 0..1 → -2..+2

- [ ] **Step 1: Update the tests first (they should fail)**

Replace the entire contents of `src/__tests__/qrWeight.test.js`:

```js
/**
 * sliderToQrWeight — the slider (-2..+2) -> backend qr_weight (0..1) mapping.
 *
 * The backend (api/main.py) validates qr_weight with Query(ge=0.0, le=1.0);
 * anything outside [0, 1] is rejected with HTTP 422. These tests pin the contract.
 */

import { sliderToQrWeight, qrWeightToSlider } from '../_utils/qrWeight'

describe('sliderToQrWeight', () => {
  test('maps the slider endpoints and center to [0, 1]', () => {
    expect(sliderToQrWeight(-2)).toBe(0)   // Weak -> most artistic
    expect(sliderToQrWeight(0)).toBe(0.5)  // center
    expect(sliderToQrWeight(2)).toBe(1)    // Strong -> most scannable
  })

  test('keeps every in-range slider step within the backend [0, 1] contract', () => {
    for (let v = -2; v <= 2.0001; v += 1) {
      const w = sliderToQrWeight(v)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
    }
  })

  test('clamps out-of-range and non-finite values to [0, 1]', () => {
    expect(sliderToQrWeight(-99)).toBe(0)
    expect(sliderToQrWeight(99)).toBe(1)
    expect(sliderToQrWeight(NaN)).toBe(0.5)      // 0 maps to center with ±2 range
    expect(sliderToQrWeight(undefined)).toBe(0.5)
  })

  test('accepts numeric strings (slider/store may stringify)', () => {
    expect(sliderToQrWeight('0')).toBe(0.5)
    expect(sliderToQrWeight('2')).toBe(1)
  })
})

describe('qrWeightToSlider', () => {
  test('maps backend endpoints and center back to slider range', () => {
    expect(qrWeightToSlider(0)).toBe(-2)
    expect(qrWeightToSlider(0.5)).toBe(0)
    expect(qrWeightToSlider(1)).toBe(2)
  })

  test('round-trips with sliderToQrWeight', () => {
    for (let v = -2; v <= 2.0001; v += 1) {
      expect(qrWeightToSlider(sliderToQrWeight(v))).toBeCloseTo(v, 3)
    }
  })

  test('clamps out-of-range backend values', () => {
    expect(qrWeightToSlider(-1)).toBe(-2)
    expect(qrWeightToSlider(2)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:frontend -- --testPathPattern=qrWeight
```

Expected: FAIL — tests check `-2`/`2` but constants still say `-3`/`3`.

- [ ] **Step 3: Update the constants in qrWeight.js**

In `src/_utils/qrWeight.js`, change lines 13–14:

```js
export const QR_SLIDER_MIN = -2;
export const QR_SLIDER_MAX = 2;
```

The `sliderToQrWeight` and `qrWeightToSlider` bodies are parametrized on these constants — no other changes needed in that file.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:frontend -- --testPathPattern=qrWeight
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/_utils/qrWeight.js src/__tests__/qrWeight.test.js
git commit -m "feat: update QR slider range from ±3 to ±2"
```

---

### Task 3: Frontend UI — preview popup, slider step, SettingsModal constants, IteratePanel init

**Files:**
- Modify: `src/app/(main_pages)/generate/(formComponents)/GenerationFormFields.js`
- Modify: `src/app/(main_pages)/generate/(formComponents)/SettingsModal.js`
- Modify: `src/app/images/[imageId]/IteratePanel.js`

**Interfaces:**
- Consumes: `QR_SLIDER_MIN`, `QR_SLIDER_MAX` from `src/_utils/qrWeight.js` (now -2/+2)
- Consumes: `/slider-images/Weight_<value>.png` static files from Task 1
- Produces: `GenerationFormFields` renders a 250×250 image above the slider while pointer is held down

- [ ] **Step 1: Update GenerationFormFields.js**

In `src/app/(main_pages)/generate/(formComponents)/GenerationFormFields.js`:

`useState` is already imported on line 1 of that file — no import change needed.

Add `SLIDER_IMAGES` as a module-level constant (outside the component function, before the `SectionLabel` definition):

```js
const SLIDER_IMAGES = {
  '-2': '/slider-images/Weight_minus_2.png',
  '-1': '/slider-images/Weight_minus_1.png',
  '0':  '/slider-images/Weight_0.png',
  '1':  '/slider-images/Weight_plus_1.png',
  '2':  '/slider-images/Weight_plus_2.png',
};
```

Add `showWeightPreview` state inside `GenerationFormFields` component body, after the existing `const [styleModalOpen, setStyleModalOpen] = useState(false)` line:

```js
const [showWeightPreview, setShowWeightPreview] = useState(false);
```

Replace the entire `{showQrWeight && (...)}` block with:

```jsx
{/* QR Weight — only when showQrWeight */}
{showQrWeight && (
  <Box sx={{ px: 1 }}>
    {showWeightPreview && (
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
        <Box
          component="img"
          src={SLIDER_IMAGES[String(Math.round(values.qr_weight))]}
          alt={`Brightness weight ${values.qr_weight}`}
          sx={{ width: 250, height: 250, borderRadius: 2, objectFit: 'cover', display: 'block' }}
        />
      </Box>
    )}
    <SectionLabel icon={TuneIcon} label="QR Code Weight" />
    <Box onPointerDown={() => setShowWeightPreview(true)}>
      <Slider
        min={QR_SLIDER_MIN}
        max={QR_SLIDER_MAX}
        step={1}
        value={values.qr_weight}
        onChange={(_, val) => onQrWeightChange(val)}
        onChangeCommitted={() => setShowWeightPreview(false)}
        marks={[
          { value: QR_SLIDER_MIN, label: 'Artistic' },
          { value: QR_SLIDER_MAX, label: 'Scannable' },
        ]}
        sx={{ '& .MuiSlider-markLabel': { color: 'text.muted' } }}
      />
    </Box>
  </Box>
)}
```

- [ ] **Step 2: Update SettingsModal.js to use constants**

In `src/app/(main_pages)/generate/(formComponents)/SettingsModal.js`:

Add the import at the top (with other app imports):

```js
import { QR_SLIDER_MIN, QR_SLIDER_MAX } from '@/_utils/qrWeight';
```

Replace the hardcoded marks array (line ~42):

```js
// Before:
const qrWeight = [{ value: -3 }, { value: 3 }];

// After:
const qrWeight = [{ value: QR_SLIDER_MIN }, { value: QR_SLIDER_MAX }];
```

Replace the hardcoded `min`/`max` on the Slider element (lines ~139-140):

```jsx
// Before:
min={-3.0}
max={3.0}

// After:
min={QR_SLIDER_MIN}
max={QR_SLIDER_MAX}
```

- [ ] **Step 3: Update IteratePanel.js — init brightness slider at 0**

In `src/app/images/[imageId]/IteratePanel.js`, update `initFormValues` (lines 31–44).

The `qr_weight` field was previously derived from the stored image's `img.qr_weight` via `qrWeightToSlider`. Since brightness weight is not persisted, always start at 0.

```js
function initFormValues(image, isOwner = true) {
  const img = image ?? {};
  const sourceStyle = styles.find((s) => s.title === img.style_title) ?? styles[0];
  return {
    website: isOwner ? (img.content ?? "") : "",
    prompt: img.prompt ?? "",
    style_id: sourceStyle.id,
    style_title: sourceStyle.title,
    style_prompt: sourceStyle.prompt,
    loras: sourceStyle.loras ?? [],
    sd_model: img.sd_model ?? "cyberrealistic_v40_151857.safetensors",
    qr_weight: 0,
  };
}
```

Also remove the unused `qrWeightToSlider` import from the top of `IteratePanel.js` (line ~20):

```js
// Remove this line:
import { qrWeightToSlider } from "@/_utils/qrWeight";
```

- [ ] **Step 4: Run the frontend tests to verify nothing broke**

```bash
npm run test:frontend
```

Expected: All tests pass. The IteratePanel tests mock `qrWeightToSlider` but don't assert on the initial `qr_weight` form value, so removing it is safe.

- [ ] **Step 5: Commit**

```bash
git add src/app/(main_pages)/generate/(formComponents)/GenerationFormFields.js \
        src/app/(main_pages)/generate/(formComponents)/SettingsModal.js \
        src/app/images/[imageId]/IteratePanel.js
git commit -m "feat: add brightness weight slider preview image and update slider range"
```

---

### Task 4: Add brightness_weight to frontend generate payload

**Files:**
- Modify: `src/_utils/ImagesUtils.js`

**Interfaces:**
- Consumes: `generateFormValues.qr_weight` (raw integer -2..+2 from the slider)
- Produces: `brightness_weight` integer added to the URL query params sent to `/api/generate/`

- [ ] **Step 1: Update the payload in generateImage**

In `src/_utils/ImagesUtils.js`, find the `generateImage` function (~line 78). The payload block currently reads:

```js
const payload = {
  ...rest,
  qr_weight: sliderToQrWeight(generateFormValues.qr_weight),
  style_loras: JSON.stringify(loras ?? []),
};
```

Add `brightness_weight`:

```js
const payload = {
  ...rest,
  qr_weight: sliderToQrWeight(generateFormValues.qr_weight),
  brightness_weight: Math.round(generateFormValues.qr_weight),
  style_loras: JSON.stringify(loras ?? []),
};
```

`Math.round` is defensive — the slider step is 1 so values are already integers, but this guards against any stored float.

- [ ] **Step 2: Run frontend tests**

```bash
npm run test:frontend
```

Expected: All tests pass. `GenerateForm.test.js` checks `formArg.website` and `formArg.prompt` but not the full payload, so adding `brightness_weight` is non-breaking.

- [ ] **Step 3: Commit**

```bash
git add src/_utils/ImagesUtils.js
git commit -m "feat: send brightness_weight integer to backend in generate payload"
```

---

### Task 5: Backend — brightness_weight parameter and formula

**Files:**
- Modify: `api/utils/utils.py`
- Modify: `api/controllers/generate_controller.py`
- Modify: `api/main.py`
- Modify: `api/tests/test_utils.py`

**Interfaces:**
- Consumes: `brightness_weight: int` (range -2..+2, default 0) from the generate endpoint
- Produces: brightness ControlNet unit with `strength = round(0.35 + brightness_weight * 0.1, 2)`

- [ ] **Step 1: Write the failing tests first**

In `api/tests/test_utils.py`, make these targeted changes:

**a) Update `TestPrepareImg2ImgRequest._req` helper** to accept `brightness_weight`:

```python
def _req(self, qr_weight, brightness_weight=0):
    return prepare_img2img_request(**self.BASE, qr_weight=qr_weight, brightness_weight=brightness_weight)
```

**b) Replace `test_brightness_unit_strength_is_fixed`** (lines 92–95) with formula tests:

```python
def test_brightness_unit_strength_default(self):
    # brightness_weight=0 (default) → strength 0.35
    assert self._req(0.5, brightness_weight=0)["controlnet_units"][0].strength == 0.35

def test_brightness_unit_strength_formula(self):
    assert self._req(0.5, brightness_weight=-2)["controlnet_units"][0].strength == 0.15
    assert self._req(0.5, brightness_weight=-1)["controlnet_units"][0].strength == 0.25
    assert self._req(0.5, brightness_weight=1)["controlnet_units"][0].strength == 0.45
    assert self._req(0.5, brightness_weight=2)["controlnet_units"][0].strength == 0.55
```

**c) Update `TestShortPromptSuffix.BASE`** to include `brightness_weight` (line ~112):

```python
BASE = dict(
    negative_prompt="ugly",
    sd_model="sd-v1-5",
    seed=42,
    image_base64_str="base64string==",
    style_prompt="",
    qr_weight=0.5,
    brightness_weight=0,
)
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
cd /path/to/codebase && python -m pytest api/tests/test_utils.py -v -k "brightness"
```

Expected: FAIL — `prepare_img2img_request` doesn't accept `brightness_weight` yet.

- [ ] **Step 3: Update prepare_img2img_request in utils.py**

In `api/utils/utils.py`, update the function signature (line ~114) to add `brightness_weight`:

```python
def prepare_img2img_request(
    prompt,
    negative_prompt,
    sd_model,
    seed,
    image_base64_str,
    qr_weight,
    style_prompt,
    loras=None,
    brightness_weight: int = 0,
):
```

Then replace the hardcoded `strength=0.35` on the brightness ControlNet unit (~line 158):

```python
        controlnet_units=[
            # Brightness ControlNet — blends the QR's light/dark structure into
            # the art. The QR is fed directly: NO preprocessor.
            # strength = 0.35 (default) + brightness_weight * 0.1; range 0.15..0.55
            Img2ImgV3ControlNetUnit(
                image_base64=image_base64_str,
                model_name="control_v1p_sd15_brightness",
                strength=round(0.35 + brightness_weight * 0.1, 2),
                preprocessor=None,
                guidance_start=0.3,
                guidance_end=0.7,
            ),
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python -m pytest api/tests/test_utils.py -v
```

Expected: All tests pass including the new formula tests.

- [ ] **Step 5: Thread brightness_weight through generate_controller.py**

In `api/controllers/generate_controller.py`, update the `predict` function signature (line ~85) to add `brightness_weight`:

```python
async def predict(
    prompt: str,
    website: str,
    negative_prompt: str,
    seed: int,
    qr_weight: float,
    sd_model: str,
    user_id: str,
    style_prompt: str,
    style_title: str,
    style_loras: str = "[]",
    brightness_weight: int = 0,
):
```

Then update the `prepare_img2img_request` call inside `predict` (~line 151) to pass `brightness_weight`:

```python
req = prepare_img2img_request(
    prompt,
    negative_prompt,
    sd_model,
    seed,
    image_base64_str,
    qr_weight,
    style_prompt,
    loras=loras,
    brightness_weight=brightness_weight,
)
```

- [ ] **Step 6: Add brightness_weight query param to main.py**

In `api/main.py`, add `brightness_weight` to the `generate_endpoint` function signature (after `qr_weight`):

```python
async def generate_endpoint(
    request: Request,
    website: Annotated[str, Query(min_length=1, max_length=2048)],
    sd_model: Annotated[str, Query(min_length=1, max_length=200)],
    prompt: Annotated[str, Query(max_length=500)] = "",
    negative_prompt: Annotated[str, Query(max_length=500)] = "",
    style_prompt: Annotated[str, Query(max_length=1000)] = "",
    style_title: Annotated[str, Query(max_length=100)] = "",
    style_loras: Annotated[str, Query(max_length=2000)] = "[]",
    seed: Annotated[int, Query(ge=-1)] = -1,
    qr_weight: Annotated[float, Query(ge=0.0, le=1.0)] = 0.5,
    brightness_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
    current_user: dict = Depends(get_current_user),
):
    return await predict(
        prompt,
        website,
        negative_prompt,
        seed,
        qr_weight,
        sd_model,
        current_user["user_id"],
        style_prompt,
        style_title,
        style_loras,
        brightness_weight,
    )
```

- [ ] **Step 7: Run the full backend test suite**

```bash
python -m pytest api/tests/ -v
```

Expected: All tests pass. The existing `test_http.py` test for the generate endpoint doesn't send `brightness_weight`, which is fine — it defaults to `0`.

- [ ] **Step 8: Commit**

```bash
git add api/utils/utils.py api/controllers/generate_controller.py api/main.py api/tests/test_utils.py
git commit -m "feat: add brightness_weight param — formula lives in utils.py"
```
