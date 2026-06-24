# QRAI-111 — Structured LoRA Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relocate each art style's LoRA(s) out of the prompt text into a structured `loras` field threaded through to Novita `img2img_v3`, so LoRAs actually apply (the `<lora:…>` prompt syntax is currently silently dropped).

**Architecture:** Frontend styles own LoRAs as structured `{model_name, strength}` data; `generateImage` serializes them into a single JSON `style_loras` query param; the backend validates that untrusted param into `List[Img2V3ImgLoRA]` and passes it to the request builder. No `ImageDoc` schema change — remix re-derives LoRAs from `style_title`.

**Tech Stack:** Next.js 14 / React 18 / Zustand (frontend), FastAPI + `novita_client` (backend), pytest (backend tests), Jest (frontend tests).

## Global Constraints

- **LoRA object shape is Novita's exact field names:** `model_name` (string) + `strength` (number). Use these names everywhere (JS objects, JSON param, Python) — no renaming.
- **Wire param name is `style_loras`**, a JSON-encoded list of `{model_name, strength}`.
- **`parse_style_loras` must never raise** — any malformed/empty input degrades to `[]` (a bad value must not 500 a generation).
- **Validation bounds:** at most `MAX_STYLE_LORAS = 6` entries; `model_name` a non-empty string ≤ 200 chars; `strength` coerced to float, default `1.0`, clamped to `[0.0, 1.5]`.
- **Brightness ControlNet strength stays `0.35`.** This reverts the uncommitted experiment (`0.6`).
- **Do NOT touch the QR-monster unit `strength=1.0`.** It is a pre-existing, committed bug (the computed `weight` is dead code) — out of scope for this ticket; flag separately. Its 3 failing tests (`test_qr_weight_0/1/half_controlnet_strength`) are expected to remain red.
- **No `ImageDoc` / schema changes.**
- **Branch:** `qr-scannability-prototype` (already checked out; QRAI-111 stays here because `RemixCard.js` and the generate-pipeline integration don't exist on `master`).
- **Commit trailer:** every commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Pre-existing failures (out of scope — do not "fix")

Running `pytest api/tests/test_utils.py::TestPrepareImg2ImgRequest` on the baseline shows 3 failures from the committed QR-monster `strength=1.0` hardcode (`test_qr_weight_0/1/half_controlnet_strength`). Leave them. After Task 2, `test_brightness_unit_strength_is_fixed` passes again. Scope each test-run verification to the relevant tests, not the whole class.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `api/utils/utils.py` | `parse_style_loras()` + `prepare_img2img_request(loras=…)` | Modify |
| `api/tests/test_utils.py` | unit tests for both | Modify |
| `api/main.py` | `style_loras` query param on `/api/generate` | Modify |
| `api/controllers/generate_controller.py` | `predict(style_loras=…)` → parse → builder | Modify |
| `api/tests/test_generate.py` | controller threading test | Modify |
| `src/_utils/ImageStyles.js` | structured `loras` per style; clean prompts | Modify |
| `src/store.js` | `loras: []` in form default + reset | Modify |
| `src/app/(main_pages)/generate/(formComponents)/StylesModal.js` | set `loras` on style pick | Modify |
| `src/app/(main_pages)/generate/GenerateForm.js` | set `loras` on random style | Modify |
| `src/app/images/[imageId]/RemixCard.js` | derive `loras` by `style_title` | Modify |
| `src/_utils/ImagesUtils.js` | serialize `loras` → `style_loras` JSON | Modify |
| `src/__tests__/imageStyles.test.js` | data-integrity test | Create |
| `src/__tests__/images.test.js` | serialization test | Modify |

---

## Task 1: Backend — `parse_style_loras()` helper

**Files:**
- Modify: `api/utils/utils.py` (imports + new helper near top, after `parse_seed`)
- Test: `api/tests/test_utils.py`

**Interfaces:**
- Produces: `parse_style_loras(raw: str | None) -> List[Img2V3ImgLoRA]` — parses the untrusted `style_loras` JSON param into validated Novita LoRA objects. Constants `MAX_STYLE_LORAS = 6`, `LORA_STRENGTH_MIN = 0.0`, `LORA_STRENGTH_MAX = 1.5`, `MAX_LORA_NAME_LEN = 200`.

- [ ] **Step 1: Establish a clean `utils.py` baseline**

The main working tree has an uncommitted experiment in `api/utils/utils.py` (brightness `0.6` + a hardcoded LoRA stub) that we are intentionally discarding (Christoph approved reverting brightness to `0.35`). Reset the file to HEAD so all edits start from the committed version. (No-op in a fresh worktree, which already starts at HEAD.)

Run:
```bash
git checkout -- api/utils/utils.py
```

- [ ] **Step 2: Write the failing tests**

Add to `api/tests/test_utils.py`. First extend the existing import block:

```python
from api.utils.utils import (
    parse_seed,
    prepare_img2img_request,
    createImagesFilterQuery,
    create_watermark,
    parse_style_loras,
)
from novita_client import Img2V3ImgLoRA
```

Then add this test class (place it after `TestPrepareImg2ImgRequest`):

```python
class TestParseStyleLoras:
    def test_empty_string_returns_empty(self):
        assert parse_style_loras("") == []

    def test_none_returns_empty(self):
        assert parse_style_loras(None) == []

    def test_empty_json_array_returns_empty(self):
        assert parse_style_loras("[]") == []

    def test_malformed_json_returns_empty(self):
        assert parse_style_loras("not json") == []

    def test_non_list_json_returns_empty(self):
        assert parse_style_loras('{"model_name": "x"}') == []

    def test_single_valid_lora(self):
        result = parse_style_loras('[{"model_name": "LAS_17554", "strength": 0.7}]')
        assert result == [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]

    def test_two_valid_loras(self):
        result = parse_style_loras(
            '[{"model_name": "wuxia2_62008", "strength": 0.8},'
            ' {"model_name": "MoXinV1_12781", "strength": 0.4}]'
        )
        assert result == [
            Img2V3ImgLoRA(model_name="wuxia2_62008", strength=0.8),
            Img2V3ImgLoRA(model_name="MoXinV1_12781", strength=0.4),
        ]

    def test_name_with_spaces_and_parens_preserved(self):
        result = parse_style_loras('[{"model_name": "0mib3(gut auf 1)_47645", "strength": 0.7}]')
        assert result[0].model_name == "0mib3(gut auf 1)_47645"

    def test_missing_model_name_dropped(self):
        assert parse_style_loras('[{"strength": 0.5}]') == []

    def test_blank_model_name_dropped(self):
        assert parse_style_loras('[{"model_name": "   ", "strength": 0.5}]') == []

    def test_missing_strength_defaults_to_one(self):
        result = parse_style_loras('[{"model_name": "x"}]')
        assert result[0].strength == 1.0

    def test_non_numeric_strength_defaults_to_one(self):
        result = parse_style_loras('[{"model_name": "x", "strength": "abc"}]')
        assert result[0].strength == 1.0

    def test_strength_clamped_high(self):
        result = parse_style_loras('[{"model_name": "x", "strength": 5}]')
        assert result[0].strength == 1.5

    def test_strength_clamped_low(self):
        result = parse_style_loras('[{"model_name": "x", "strength": -2}]')
        assert result[0].strength == 0.0

    def test_caps_at_six_loras(self):
        entries = ",".join(f'{{"model_name": "m{i}", "strength": 0.5}}' for i in range(10))
        result = parse_style_loras(f"[{entries}]")
        assert len(result) == 6

    def test_non_dict_entries_skipped(self):
        result = parse_style_loras('["just a string", {"model_name": "ok", "strength": 0.5}]')
        assert result == [Img2V3ImgLoRA(model_name="ok", strength=0.5)]
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m pytest api/tests/test_utils.py::TestParseStyleLoras -v`
Expected: FAIL — `ImportError: cannot import name 'parse_style_loras'`

- [ ] **Step 4: Implement `parse_style_loras`**

In `api/utils/utils.py`, add `import json` to the imports and extend the typing import:

```python
import json
from typing import Optional, List
```

`Img2V3ImgLoRA` is already available via the existing `from novita_client import *` (line 10).

Add the helper after `parse_seed` (before `prepare_img2img_request`):

```python
# ---------------------------------------------------------------------------- #
#                            PARSE STYLE LORAS                                 #
# ---------------------------------------------------------------------------- #

# A style's LoRAs arrive as an untrusted JSON query param (style_loras). Our
# styles use at most 2; cap and clamp so a bad client value can't push extreme
# or oversized input to Novita.
MAX_STYLE_LORAS = 6
LORA_STRENGTH_MIN = 0.0
LORA_STRENGTH_MAX = 1.5
MAX_LORA_NAME_LEN = 200


def parse_style_loras(raw):
    """Parse the client-supplied ``style_loras`` JSON into Novita LoRA objects.

    ``raw`` is a JSON-encoded list of ``{"model_name": str, "strength": number}``.
    This must NEVER raise: any malformed, empty, or non-list input returns ``[]``
    so a bad value can't 500 a generation. Entries without a non-empty string
    ``model_name`` are dropped; ``strength`` is coerced to float, defaulted to
    1.0, and clamped to [LORA_STRENGTH_MIN, LORA_STRENGTH_MAX]. At most
    MAX_STYLE_LORAS valid entries are returned.
    """
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return []
    if not isinstance(data, list):
        return []

    loras = []
    for entry in data:
        if len(loras) >= MAX_STYLE_LORAS:
            break
        if not isinstance(entry, dict):
            continue
        model_name = entry.get("model_name")
        if not isinstance(model_name, str):
            continue
        model_name = model_name.strip()
        if not model_name or len(model_name) > MAX_LORA_NAME_LEN:
            continue
        try:
            strength = float(entry.get("strength", 1.0))
        except (ValueError, TypeError):
            strength = 1.0
        strength = max(LORA_STRENGTH_MIN, min(LORA_STRENGTH_MAX, strength))
        loras.append(Img2V3ImgLoRA(model_name=model_name, strength=strength))
    return loras
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `python -m pytest api/tests/test_utils.py::TestParseStyleLoras -v`
Expected: PASS (16 passed)

- [ ] **Step 6: Commit**

```bash
git add api/utils/utils.py api/tests/test_utils.py
git commit -m "feat(qrai-111): add parse_style_loras helper for untrusted style_loras param

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Backend — `prepare_img2img_request` accepts `loras`

**Files:**
- Modify: `api/utils/utils.py` (`prepare_img2img_request`)
- Test: `api/tests/test_utils.py`

**Interfaces:**
- Consumes: `Img2V3ImgLoRA` list from `parse_style_loras` (Task 1).
- Produces: `prepare_img2img_request(prompt, negative_prompt, sd_model, seed, image_base64_str, qr_weight, style_prompt, loras=None) -> dict` — the returned request dict now has a `loras` key (an empty list when `loras` is `None`).

- [ ] **Step 1: Write the failing tests**

Add to the `TestPrepareImg2ImgRequest` class in `api/tests/test_utils.py`:

```python
    def test_loras_default_to_empty_list(self):
        assert self._req(0.5)["loras"] == []

    def test_loras_passed_through(self):
        from novita_client import Img2V3ImgLoRA
        loras = [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]
        req = prepare_img2img_request(**self.BASE, qr_weight=0.5, loras=loras)
        assert req["loras"] == loras
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest api/tests/test_utils.py::TestPrepareImg2ImgRequest::test_loras_default_to_empty_list api/tests/test_utils.py::TestPrepareImg2ImgRequest::test_loras_passed_through -v`
Expected: FAIL — `KeyError: 'loras'` (the request dict has no `loras` key yet)

- [ ] **Step 3: Add the `loras` parameter and request key**

In `api/utils/utils.py`, change the `prepare_img2img_request` signature to add a `loras` keyword param at the end:

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
):
```

Inside the `req = dict(...)`, add a `loras` entry right after `strength=1.0,` and before `controlnet_units=[`:

```python
        strength=1.0,
        loras=loras or [],
        controlnet_units=[
```

Do NOT change the brightness unit (`strength=0.35`, already correct after the Task 1 baseline reset) or the QR-monster unit (`strength=1.0`, out of scope).

- [ ] **Step 4: Run the relevant tests to verify they pass**

Run: `python -m pytest "api/tests/test_utils.py::TestPrepareImg2ImgRequest::test_loras_default_to_empty_list" "api/tests/test_utils.py::TestPrepareImg2ImgRequest::test_loras_passed_through" "api/tests/test_utils.py::TestPrepareImg2ImgRequest::test_brightness_unit_strength_is_fixed" -v`
Expected: PASS (3 passed) — note `test_brightness_unit_strength_is_fixed` now passes because the baseline reset restored `0.35`.

- [ ] **Step 5: Commit**

```bash
git add api/utils/utils.py api/tests/test_utils.py
git commit -m "feat(qrai-111): prepare_img2img_request accepts structured loras

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Backend — thread `style_loras` through route + controller

**Files:**
- Modify: `api/main.py` (`generate_endpoint`)
- Modify: `api/controllers/generate_controller.py` (`predict`)
- Test: `api/tests/test_generate.py`

**Interfaces:**
- Consumes: `parse_style_loras` (Task 1), `prepare_img2img_request(loras=…)` (Task 2).
- Produces: `predict(..., style_loras: str = "[]")` — parses `style_loras` and passes the result to `prepare_img2img_request` as the `loras=` keyword. `GET /api/generate` accepts a `style_loras` query param.

- [ ] **Step 1: Write the failing test**

In `api/tests/test_generate.py`, add a test that the parsed LoRAs reach the request builder. Place it after `test_generate_returns_image_urls`:

```python
@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
@patch("api.controllers.generate_controller.prepare_img2img_request")
async def test_predict_passes_parsed_loras_to_request_builder(
    mock_prepare,
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """predict() must parse style_loras and pass the LoRA objects to the builder."""
    from novita_client import Img2V3ImgLoRA

    mock_prepare.return_value = {"model_name": "sd-v1-5"}  # trivial valid req dict
    img2img_result, task_result = _build_novita_mocks()
    mock_novita_client.img2img_v3.return_value = img2img_result
    mock_novita_client.wait_for_task_v3.return_value = task_result
    mock_download.return_value = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
    mock_create_doc.return_value = FAKE_IMAGE_ID
    mock_upload.side_effect = [ORIG_URL, WMARK_URL]
    mock_update.return_value = {"_id": FAKE_IMAGE_ID, "image_url": ORIG_URL, "watermarked_image_url": WMARK_URL}

    await predict(
        **{**PREDICT_KWARGS, "style_loras": '[{"model_name": "LAS_17554", "strength": 0.7}]'}
    )

    assert mock_prepare.call_args.kwargs["loras"] == [
        Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)
    ]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest "api/tests/test_generate.py::test_predict_passes_parsed_loras_to_request_builder" -v`
Expected: FAIL — `predict()` has no `style_loras` parameter (`TypeError: predict() got an unexpected keyword argument 'style_loras'`).

- [ ] **Step 3: Add `style_loras` to `predict` and parse it**

In `api/controllers/generate_controller.py`, extend the `prepare_img2img_request` import to also import the parser:

```python
from api.utils.utils import (
    prepare_img2img_request,
    create_watermark,
    parse_style_loras,
)
```

Add `style_loras` to the `predict` signature (after `style_title`):

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
):
```

Replace the `prepare_img2img_request(...)` call (currently positional, 7 args) with a version that parses and passes `loras`:

```python
        loras = parse_style_loras(style_loras)

        req = prepare_img2img_request(
                    prompt,
                    negative_prompt,
                    sd_model,
                    seed,
                    image_base64_str,
                    qr_weight,
                    style_prompt,
                    loras=loras,
                )
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest "api/tests/test_generate.py::test_predict_passes_parsed_loras_to_request_builder" -v`
Expected: PASS (1 passed)

- [ ] **Step 5: Add the `style_loras` query param to the route**

In `api/main.py`, add the param to `generate_endpoint` (after `style_title`) and forward it to `predict`:

```python
    style_title: Annotated[str, Query(max_length=100)] = "",
    style_loras: Annotated[str, Query(max_length=2000)] = "[]",
    seed: Annotated[int, Query(ge=-1)] = -1,
    qr_weight: Annotated[float, Query(ge=0.0, le=1.0)] = 0.5,
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
    )
```

- [ ] **Step 6: Run the full generate + utils suites to confirm no regressions**

Run: `python -m pytest api/tests/test_generate.py api/tests/test_utils.py::TestParseStyleLoras -v`
Expected: PASS for all `test_generate.py` tests and all `TestParseStyleLoras` tests. (The 3 `test_qr_weight_*_controlnet_strength` failures are pre-existing and out of scope — do not run/assert them here.)

- [ ] **Step 7: Commit**

```bash
git add api/main.py api/controllers/generate_controller.py api/tests/test_generate.py
git commit -m "feat(qrai-111): thread style_loras param through generate route and controller

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — structured `loras` in styles + store default

**Files:**
- Modify: `src/_utils/ImageStyles.js`
- Modify: `src/store.js`
- Create: `src/__tests__/imageStyles.test.js`

**Interfaces:**
- Produces: every `styles[]` entry has a `loras: [{model_name, strength}]` array (empty when none) and a `prompt` with no `<lora:…>` tags. `generateFormValues` includes `loras: []` by default.

- [ ] **Step 1: Write the failing data-integrity test**

Create `src/__tests__/imageStyles.test.js`:

```js
import { styles } from '../_utils/ImageStyles'

describe('ImageStyles LoRA structure', () => {
  test('no style embeds a <lora:> tag in its prompt', () => {
    for (const s of styles) {
      expect(s.prompt).not.toMatch(/<lora:/i)
    }
  })

  test('every style has a loras array', () => {
    for (const s of styles) {
      expect(Array.isArray(s.loras)).toBe(true)
    }
  })

  test('each lora entry has a non-empty model_name string and numeric strength', () => {
    for (const s of styles) {
      for (const l of s.loras) {
        expect(typeof l.model_name).toBe('string')
        expect(l.model_name.length).toBeGreaterThan(0)
        expect(typeof l.strength).toBe('number')
      }
    }
  })

  test('the 8 known lora-bearing styles still carry their loras', () => {
    const byTitle = Object.fromEntries(styles.map((s) => [s.title, s]))
    expect(byTitle['Dreamy'].loras).toEqual([{ model_name: 'LAS_17554', strength: 0.7 }])
    expect(byTitle['Chinese art'].loras).toEqual([
      { model_name: 'wuxia2_62008', strength: 0.8 },
      { model_name: 'MoXinV1_12781', strength: 0.4 },
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- imageStyles`
Expected: FAIL — styles have `<lora:>` tags in prompts and no `loras` arrays.

- [ ] **Step 3: Rewrite `src/_utils/ImageStyles.js`**

Replace the entire file with the cleaned styles (tags removed, `loras` added to every entry):

```js
export const styles = [
  {
    id: 1,
    title: "Random",
    prompt: "",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
    keywords: [],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 2,
    title: "Ukiyo-e",
    prompt:
      "Detailed, Graphic Novel, Cinematic, Ukiyo-e Flat Design, Dramatic, Scene, Establishing Shot, Proportion",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
    keywords: ["Flat Design", "Ukiyo-e"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 3,
    title: "Expressionism",
    prompt:
      "abstract expressionist painting, award-winning photo, energetic brushwork, bold colors, abstract forms, expressive",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/657c2de53be54bfd1a349401.png",
    keywords: ["Expressionism", "Bold colors"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 4,
    title: "Dreamy",
    prompt:
      "digital painting, extremely smooth, fluid, 3d fractals, light particles, dreamy, shimmering, dreamy glow, HQ, 4K",
    loras: [{ model_name: "LAS_17554", strength: 0.7 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6598392c55848e0542b40d0e.png",
    keywords: ["Dreamy glow", "Light particles"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 5,
    title: "Low Poly Art",
    prompt:
      "Low-Poly Art, Origami, Painting By Salvador Dali, Scene, Dramatic, Cinematic, Establishing Shot, 4k, UHD",
    loras: [{ model_name: "ral-polygon-sd15_205894", strength: 0.8 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
    keywords: ["Origami", "Low-Poly"],
    sd_model: "epicrealism_pureEvolutionV5_97793.safetensors",
  },
  {
    id: 6,
    title: "Photography",
    prompt:
      "Photography, Happy Colors, Epic Composition, Cinematic, Detailed, 4k",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/657c0f23c7e41120dabfeff7.png",
    keywords: ["Photography", "Cinematic"],
    sd_model: "cyberrealistic_v40_151857.safetensors",
  },
  {
    id: 12,
    title: "Vector Art",
    prompt: "Flat Design, Vector Art, illustrator",
    loras: [{ model_name: "0mib3(gut auf 1)_47645", strength: 0.7 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
    keywords: ["Flat Design", "Illustrator"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 10,
    title: "Doodle Art",
    prompt: "surrealistic, tuyawang, abstract, doodle art",
    loras: [{ model_name: "TUYA5_129115", strength: 0.8 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
    keywords: ["Doodle Art"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 7,
    title: "Ink",
    prompt: "monochrome, ink sketch, watercolors, brush strokes",
    loras: [{ model_name: "zyd232_InkStyle_v1_0_53697", strength: 1 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
    keywords: ["Ink sketch", "monochrome"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 9,
    title: "Oil Painting",
    prompt: "oil painting, masterpiece, best quality",
    loras: [{ model_name: "bichu-v0612_65240", strength: 0.6 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
    keywords: ["80s style", "CMYK Colors"],
    sd_model: "colorful_v31_62333.safetensors",
  },

  {
    id: 11,
    title: "Chinese art",
    prompt: "Chinese traditional art",
    loras: [
      { model_name: "wuxia2_62008", strength: 0.8 },
      { model_name: "MoXinV1_12781", strength: 0.4 },
    ],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
    keywords: ["Japonism", "Kitsch"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 11,
    title: "Watercolor",
    prompt: "Watercolor painting, soft colors, masterpiece, sharp",
    loras: [{ model_name: "Colorwater_v4", strength: 0.5 }],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65d79f889478a127106f32e0.png",
    keywords: ["Water color"],
    sd_model: "colorful_v31_62333.safetensors",
  },

  {
    id: 13,
    title: "Sticker",
    prompt: "Art Nouveau, Sticker, Turkish-Style, Miniature Faking",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6574e5ae9961d5a54e2ff525.png",
    keywords: ["Miniature Faking", "Art Nouveau"],
    sd_model: "colorful_v31_62333.safetensors",
  },
  {
    id: 16,
    title: "Color blend",
    prompt: "Synesthesia, Color Blend, streams of colored paint",
    loras: [],
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6599191455848e0542b40d14.png",
    keywords: ["Rainbow Core", "Color Blend"],
    sd_model: "colorful_v31_62333.safetensors",
  },
];
```

- [ ] **Step 4: Add `loras: []` to the store form shape**

In `src/store.js`, add `loras: []` to BOTH the `generateFormValues` default (after `style_prompt: ""`) and the identical block inside `resetGenerateFormValues`:

```js
    style_title: "Random",
    style_prompt: "",
    loras: [],
    qr_weight: 0.0,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:frontend -- imageStyles`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/_utils/ImageStyles.js src/store.js src/__tests__/imageStyles.test.js
git commit -m "feat(qrai-111): structured loras field on styles, drop <lora:> prompt tags

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — selection wiring + `style_loras` serialization

**Files:**
- Modify: `src/app/(main_pages)/generate/(formComponents)/StylesModal.js`
- Modify: `src/app/(main_pages)/generate/GenerateForm.js`
- Modify: `src/app/images/[imageId]/RemixCard.js`
- Modify: `src/_utils/ImagesUtils.js`
- Test: `src/__tests__/images.test.js`

**Interfaces:**
- Consumes: `styles[].loras` (Task 4), `generateFormValues.loras` (Task 4).
- Produces: `generateImage` sends `style_loras` = `JSON.stringify(loras ?? [])` and does not send a raw `loras` query param.

- [ ] **Step 1: Write the failing serialization test**

Add to the `describe('generateImage', …)` block in `src/__tests__/images.test.js`:

```js
  test('serializes loras into a style_loras JSON query param', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ _id: 'img_1' }) })
    const form = { ...FAKE_FORM, loras: [{ model_name: 'LAS_17554', strength: 0.7 }] }
    await generateImage(form, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const params = new URL(url).searchParams
    expect(JSON.parse(params.get('style_loras'))).toEqual([
      { model_name: 'LAS_17554', strength: 0.7 },
    ])
    // The raw array must not be sent as its own param.
    expect(params.has('loras')).toBe(false)
  })

  test('sends style_loras="[]" when the form has no loras', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ _id: 'img_1' }) })
    await generateImage(FAKE_FORM, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    expect(new URL(url).searchParams.get('style_loras')).toBe('[]')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:frontend -- images`
Expected: FAIL — `style_loras` is absent (and/or a `loras` param appears as `[object Object]`).

- [ ] **Step 3: Serialize loras in `generateImage`**

In `src/_utils/ImagesUtils.js`, replace the payload construction inside `generateImage`:

```js
    // The slider lives on a -3..+3 UI scale; the backend only accepts qr_weight
    // in [0, 1]. Translate before sending so the request passes validation.
    // loras is an array of objects, which URLSearchParams can't serialize — send
    // it as a single JSON string param (style_loras) the backend decodes.
    const { loras, ...rest } = generateFormValues;
    const payload = {
      ...rest,
      qr_weight: sliderToQrWeight(generateFormValues.qr_weight),
      style_loras: JSON.stringify(loras ?? []),
    };
    const queryParams = new URLSearchParams(payload);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:frontend -- images`
Expected: PASS

- [ ] **Step 5: Set `loras` at the style-selection sites**

In `src/app/(main_pages)/generate/(formComponents)/StylesModal.js`, add `loras` to `handleStyleClick`:

```js
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_prompt: item.prompt,
      style_title: item.title,
      sd_model: item.sd_model,
      loras: item.loras ?? [],
    });
```

In `src/app/(main_pages)/generate/GenerateForm.js`, add `loras` to the object returned by `selectRandomStyle`:

```js
    return {
      ...generateFormValues,
      style_id: randomStyle.id,
      style_prompt: randomStyle.prompt,
      style_title: randomStyle.title,
      sd_model: randomStyle.sd_model,
      loras: randomStyle.loras ?? [],
    };
```

In `src/app/images/[imageId]/RemixCard.js`, import `styles` and derive `loras` from the stored `style_title` (stored images carry no structured loras):

```js
import { useStore } from "@/store";
import { styles } from "@/_utils/ImageStyles";
```

```js
  const handleRemix = () => {
    if (!image) return;
    const matchedStyle = styles.find((s) => s.title === image.style_title);
    setGenerateFormValues({
      website: image.content,
      prompt: image.prompt,
      style_title: image.style_title,
      style_prompt: image.style_prompt,
      loras: matchedStyle?.loras ?? [],
      qr_weight: image.qr_weight,
      negative_prompt: image.negative_prompt,
      seed: image.seed,
      sd_model: image.sd_model,
    });
    router.push("/generate");
  };
```

- [ ] **Step 6: Run the full frontend suite to confirm no regressions**

Run: `npm run test:frontend`
Expected: PASS (all suites, including `GenerateForm`, `images`, `imageStyles`).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(main_pages)/generate/(formComponents)/StylesModal.js" "src/app/(main_pages)/generate/GenerateForm.js" "src/app/images/[imageId]/RemixCard.js" src/_utils/ImagesUtils.js src/__tests__/images.test.js
git commit -m "feat(qrai-111): carry loras through style selection, remix, and generate request

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Verification — LoRA-name validity pass

This task validates that the relocated LoRA names actually resolve on Novita (only `0mib3(gut auf 1)_47645` was previously confirmed; `Colorwater_v4` is the likely-stale suspect — no Novita id suffix). Requires a working `.env` with `NOVITA_KEY`. No code changes unless a name fails.

**Files (only if a name must be corrected/dropped):**
- Modify: `src/_utils/ImageStyles.js`

- [ ] **Step 1: Start the app**

Run: `npm run dev`
Expected: Next.js on :3000, FastAPI on :8000, no startup errors.

- [ ] **Step 2: Generate once per lora-bearing style**

In the generate UI, for each of the 8 lora-bearing styles (Dreamy, Low Poly Art, Vector Art, Doodle Art, Ink, Oil Painting, Chinese art, Watercolor): enter a URL, pick the style, generate. For each, confirm:
- The generation completes with no Novita error (watch the FastAPI logs for `Failed to generate image` / LoRA-not-found errors).
- The LoRA visibly affects the output (compare against the same prompt with `loras: []` if unsure).

- [ ] **Step 3: Correct or drop any failing LoRA name**

For any style whose generation errors on its LoRA, look up the correct Novita model name (Novita model search / the model's Novita page) and update its `model_name` in `src/_utils/ImageStyles.js`. If a name cannot be resolved quickly, drop that style's LoRA (`loras: []`) and add a code comment noting it (e.g. `// QRAI-111: <name> did not resolve on Novita; LoRA dropped`). A style must never ship in a state that errors on generation.

- [ ] **Step 4: Re-run the data-integrity test and commit any corrections**

Run: `npm run test:frontend -- imageStyles`
Expected: PASS

If `ImageStyles.js` changed:
```bash
git add src/_utils/ImageStyles.js
git commit -m "fix(qrai-111): correct/drop LoRA names that do not resolve on Novita

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
If nothing changed, record in the task notes that all 8 LoRA names resolved.

---

## Final verification (whole-ticket)

- [ ] `python -m pytest api/tests/test_utils.py::TestParseStyleLoras api/tests/test_generate.py -v` → PASS
- [ ] `npm run test:frontend` → PASS
- [ ] `npm run lint` → no new errors
- [ ] Manual: generating with a lora-bearing style applies the LoRA (Task 6).
- [ ] Confirm the 3 `test_qr_weight_*_controlnet_strength` failures are unchanged from baseline (pre-existing, out of scope).

## Out-of-scope follow-ups (flag, do not fix here)

- **QR-monster ControlNet strength is hardcoded `1.0`** in `prepare_img2img_request` and the computed `weight` (0.85–1.05) is dead — the `qr_weight` slider has no effect on QR-monster strength (it still affects `guidance_start`). This is committed on `master`, so it's a live production bug. Its 3 tests are red. Needs its own ticket.
