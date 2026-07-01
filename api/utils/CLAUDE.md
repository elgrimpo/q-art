# `api/utils/` — pure helpers

Stateless helpers used by the controllers. No DB/network clients here.

- `utils.py` — `prepare_img2img_request()`, `create_watermark()`, `prepare_doc()`, `calculate_credits()`, `sufficient_credit()`, `createImagesFilterQuery()`, `parse_seed()`.
- `payload_config.py` — static config for request payloads.
- `watermark.png` — the watermark asset pasted bottom-right by `create_watermark()`.

## The img2img request (`prepare_img2img_request`) — handle with care

This function encodes hard-won Novita quirks. The inline comments are load-bearing; read them before changing values.

- **`preprocessor=None` is required** on both ControlNet units (raw QR fed directly). Sending the string `"none"` breaks with "Failed to exec"; omitting the kwarg may serialize back to `"none"`. Keep explicit `None`.
- **The init image is a flat neutral-gray 768×768 with `strength=1.0`** — this makes img2img behave like txt2img so the model paints freely while the QR is enforced purely via ControlNet. Don't "fix" the gray image.
- **Two units, both driven by `qr_weight + style_modifier` (QRAI-135/136):** `qr_weight` (-2..2, from the frontend slider) and `style_modifier` (-2..2, a per-style tunable from `ImageStyles.js`, not persisted on the image) are summed and fed into every strength/guidance formula below. There used to be a separate dead `qr_weight` (0..1) input that had no effect on the request — removed.
- **`control_v1p_sd15_brightness` strength:** `0.4 + (qr_weight + style_modifier) * 0.025`.
- **`control_v1p_sd15_qrcode_monster_v2`:** strength `1.40 + (qr_weight + style_modifier) * 0.05`, guidance_start `0.4 - (qr_weight + style_modifier) * 0.025`, guidance_end `0.925 + (qr_weight + style_modifier) * 0.0125`.
- **Top-level img2img `strength`:** `0.925 + (qr_weight + style_modifier) * 0.0125`. Higher combined value = more scannable/QR-faithful, lower = more artistic.

## Other notes

- **`calculate_credits()` mirrors the frontend `src/_utils/utils.js`.** Pricing lives in **two places** — keep them in sync if you change credit costs.
- **`prepare_doc()` sets `query_type="img2img"`** to match the actual pipeline (fixed in QRAI-50; the field is metadata-only and not read anywhere). It also has large commented-out `controlnet1`/control-mode blocks (dead code, SCRUM-47).
- **`create_watermark()` builds an unused `BytesIO`** before returning the PIL image (leftover, SCRUM-51). It returns `None` on failure — callers should handle that.
