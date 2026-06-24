# QRAI-111 — Move LoRAs from prompt text into the structured `loras` field

- **Ticket:** QRAI-111 ("Add Loras as additional value")
- **Date:** 2026-06-24
- **Status:** Design approved, pending implementation plan

## Problem

Each art style in `src/_utils/ImageStyles.js` embeds its LoRA(s) directly in the
prompt text using AUTOMATIC1111-style syntax, e.g.:

```js
prompt: "digital painting, … HQ, 4K, <lora:LAS_17554:0.7>"
```

That string is sent to the backend as `style_prompt`, where
`prepare_img2img_request()` concatenates it into `full_prompt = prompt + style_prompt`
and passes it to Novita's `img2img_v3`. In `img2img_v3` the `<lora:…>` syntax is
**inert** — it is treated as ordinary prompt text and silently ignored. LoRAs only
apply when passed via the dedicated `loras` field:

```python
loras=[Img2V3ImgLoRA(model_name="…", strength=0.8)]
```

So every style that relies on a LoRA is currently rendering **without** it.

The Novita type (`novita_client/proto.py`) is minimal:

```python
class Img2V3ImgLoRA(JSONe):
    model_name: str
    strength: Optional[float] = 1.0
```

This maps 1:1 to the `<lora:NAME:WEIGHT>` syntax (`model_name=NAME`, `strength=WEIGHT`).

## Goal

Relocate each style's LoRA(s) out of the prompt string into a structured `loras`
field that is threaded through to the Novita request, so LoRAs actually apply.

## Non-goals

- **No change to which styles use which LoRAs** — we relocate the existing 8
  lora-bearing styles' LoRAs as-is; we do not curate or add new ones.
- **No new `ImageDoc` field** — LoRAs are not persisted on generated images.
  Remix re-derives them from `style_title` (see below).
- **No brightness/scannability work.** An unrelated uncommitted tweak in
  `utils.py` (brightness ControlNet strength `0.35 → 0.6`) is reverted to `0.35`
  to keep this ticket focused.

## Current LoRA inventory (in `ImageStyles.js`)

8 of the 14 styles carry embedded LoRAs:

| Style | LoRA(s) `<name:weight>` |
|---|---|
| Dreamy (4) | `LAS_17554:0.7` |
| Low Poly Art (5) | `ral-polygon-sd15_205894:0.8` |
| Vector Art (12) | `0mib3(gut auf 1)_47645:0.7` |
| Doodle Art (10) | `TUYA5_129115:0.8` |
| Ink (7) | `zyd232_InkStyle_v1_0_53697:1` |
| Oil Painting (9) | `bichu-v0612_65240:0.6` |
| Chinese art (11) | `wuxia2_62008:0.8`, `MoXinV1_12781:0.4` |
| Watercolor (11) | `Colorwater_v4:0.5` |

The remaining 6 (Random, Ukiyo-e, Expressionism, Photography, Sticker, Color blend)
have no LoRA and get `loras: []`.

> Note: LoRA names may contain spaces and parentheses (`0mib3(gut auf 1)_47645`),
> so any text parser must not assume a simple `\w+` name. We avoid prompt parsing
> entirely (see Approach), so this is only a caution for the inventory step.

## Approach

**Chosen:** structured `loras` field in the styles, threaded through the request
(frontend owns the styles, LoRAs are first-class data). Rejected alternatives:
backend regex extraction from `style_prompt` (leaves frontend prompts messy) and a
backend `style_title → loras` map (splits each style's definition across two files,
couples on the title string).

### Data model — `src/_utils/ImageStyles.js`

Each style gains a `loras` array using Novita's exact field names, and its `prompt`
loses the embedded tags:

```js
// before
{ id: 4, title: "Dreamy",
  prompt: "digital painting, …, HQ, 4K, <lora:LAS_17554:0.7>", … }

// after
{ id: 4, title: "Dreamy",
  prompt: "digital painting, …, HQ, 4K",
  loras: [{ model_name: "LAS_17554", strength: 0.7 }], … }
```

Every style gets an explicit `loras` key (`[]` when none) for shape consistency.
Using `model_name`/`strength` (not `name`/`weight`) means no renaming anywhere
downstream.

### Threading through (frontend)

- **`src/store.js`** — add `loras: []` to the `generateFormValues` default and to
  the `resetGenerateFormValues` shape.
- **`StylesModal.js`** (`handleStyleClick`) — set `loras: item.loras ?? []`
  alongside the existing `style_prompt`/`style_title`/`sd_model`.
- **`GenerateForm.js`** (`selectRandomStyle`) — set `loras: randomStyle.loras ?? []`.
- **`RemixCard.js`** (`handleRemix`) — stored images carry no structured loras, so
  import `styles`, find the entry whose `title === image.style_title`, and set
  `loras: matched?.loras ?? []`. This also means remix benefits from any later
  name corrections.
- **`src/_utils/ImagesUtils.js`** (`generateImage`) — `URLSearchParams` cannot
  serialize an array of objects, so destructure `loras` out and send it as one JSON
  string param:

  ```js
  const { loras, ...rest } = generateFormValues;
  const payload = {
    ...rest,
    qr_weight: sliderToQrWeight(generateFormValues.qr_weight),
    style_loras: JSON.stringify(loras ?? []),
  };
  ```

  (Unknown query params such as the existing `style_id` are ignored by FastAPI, so
  no other cleanup is required.)

### Backend — validate + build

- **`api/main.py`** (`generate_endpoint`) — add
  `style_loras: Annotated[str, Query(max_length=2000)] = "[]"` and pass it to
  `predict()`.
- **`api/controllers/generate_controller.py`** (`predict`) — accept `style_loras: str`,
  resolve it via the new helper, and pass the resulting list to
  `prepare_img2img_request()`.
- **New helper `parse_style_loras(raw: str) -> List[Img2V3ImgLoRA]` in
  `api/utils/utils.py`** — treats the param as untrusted (per the backend's
  security posture):
  - `json.loads` inside try/except; **any** error returns `[]` (never raises).
  - Expects a list; a non-list returns `[]`.
  - Per entry: require a non-empty string `model_name` (length-capped, e.g. ≤ 200);
    coerce `strength` to float, default `1.0`, clamp to `[0.0, 1.5]`. Drop entries
    that fail.
  - Cap the list length (≤ 6; our max real usage is 2).
  - Returns `List[Img2V3ImgLoRA]`.
- **`prepare_img2img_request`** — add a `loras` parameter (default `None` → `[]`)
  and use it for the request's `loras=` value. **Remove** the hardcoded
  `Img2V3ImgLoRA("0mib3(gut auf 1)_47645", 0.8)` stub and **revert** the brightness
  ControlNet strength from `0.6` back to `0.35`.

### Data flow (end to end)

```
ImageStyles.js (loras: [{model_name, strength}])
  → form selection sets generateFormValues.loras
  → generateImage(): style_loras = JSON.stringify(loras)
  → GET /api/generate?…&style_loras=[…]
  → generate_endpoint(style_loras) → predict(style_loras)
  → parse_style_loras() → List[Img2V3ImgLoRA]
  → prepare_img2img_request(loras=…) → Novita img2img_v3
```

## LoRA-name validity (verification step in implementation)

Only `0mib3(gut auf 1)_47645` is confirmed to resolve on Novita. 8 of the 9 names
carry the `_NNNNN` Novita-model-id suffix and will probably work; **`Colorwater_v4`
(Watercolor) is the suspect** — it has no id suffix. Implementation must therefore
include a verification pass:

1. Generate once per lora-bearing style.
2. Confirm no Novita error and a visible LoRA effect.
3. For any name that fails: correct it via Novita's model lookup, or — if it cannot
   be resolved quickly — drop that style's LoRA (with a code comment) so we never
   ship a style that errors.

## Testing

- **Unit (`api/tests/`):**
  - `parse_style_loras`: valid single/multi, empty `"[]"`, malformed JSON,
    non-list JSON, over-cap truncation, strength clamping, missing/blank
    `model_name` dropped.
  - `prepare_img2img_request`: the passed `loras` appear in the returned request
    dict; empty list yields no LoRAs.
- **Manual:** the per-style generation/validity pass above.

## Risks & mitigations

- **Stale LoRA names (mainly `Colorwater_v4`)** → verification pass corrects/drops.
- **Untrusted `style_loras` param** → `parse_style_loras` validates, clamps, caps,
  and never raises.
- **Remix losing LoRAs** → re-derived from `style_title` against the canonical
  styles list.

## Acceptance criteria

- Selecting a lora-bearing style and generating applies its LoRA(s) via the Novita
  `loras` field (verified visually + no error), for every style whose name resolves.
- `ImageStyles.js` prompts contain no `<lora:…>` tags; each style has a `loras`
  array.
- Malformed/empty/oversized `style_loras` input degrades to no LoRAs rather than
  erroring the request.
- The hardcoded LoRA stub is gone and brightness strength is back to `0.35`.
- Unit tests for `parse_style_loras` and the request builder pass in CI.

## Files touched

`src/_utils/ImageStyles.js`, `src/store.js`,
`src/app/(main_pages)/generate/(formComponents)/StylesModal.js`,
`src/app/(main_pages)/generate/GenerateForm.js`,
`src/app/images/[imageId]/RemixCard.js`, `src/_utils/ImagesUtils.js`,
`api/main.py`, `api/controllers/generate_controller.py`, `api/utils/utils.py`,
`api/tests/` (new tests).
