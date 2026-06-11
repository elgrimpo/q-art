# `api/utils/` — pure helpers

Stateless helpers used by the controllers. No DB/network clients here.

- `utils.py` — `prepare_img2img_request()`, `create_watermark()`, `prepare_doc()`, `calculate_credits()`, `sufficient_credit()`, `createImagesFilterQuery()`, `parse_seed()`.
- `payload_config.py` — static config for request payloads.
- `watermark.png` — the watermark asset pasted bottom-right by `create_watermark()`.

## The img2img request (`prepare_img2img_request`) — handle with care

This function encodes hard-won Novita quirks. The inline comments are load-bearing; read them before changing values.

- **`preprocessor=None` is required** on both ControlNet units (raw QR fed directly). Sending the string `"none"` breaks with "Failed to exec"; omitting the kwarg may serialize back to `"none"`. Keep explicit `None`.
- **The init image is a flat neutral-gray 768×768 with `strength=1.0`** — this makes img2img behave like txt2img so the model paints freely while the QR is enforced purely via ControlNet. Don't "fix" the gray image.
- **Two units:** `control_v1p_sd15_brightness` (fixed strength 0.35) + `control_v1p_sd15_qrcode_monster_v2` (strength scales with `qr_weight`).
- **`qr_weight` (0..1) mapping:** weight `0.85 → 1.05`, guidance_start `0.40 → 0.37`. Higher = more scannable, lower = more artistic.

## Other notes

- **`calculate_credits()` mirrors the frontend `src/_utils/utils.js`.** Pricing lives in **two places** — keep them in sync if you change credit costs.
- **`prepare_doc()` sets `query_type="img2img"`** to match the actual pipeline (fixed in QRAI-50; the field is metadata-only and not read anywhere). It also has large commented-out `controlnet1`/control-mode blocks (dead code, SCRUM-47).
- **`create_watermark()` builds an unused `BytesIO`** before returning the PIL image (leftover, SCRUM-51). It returns `None` on failure — callers should handle that.
