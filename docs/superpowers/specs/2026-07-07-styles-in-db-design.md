# Styles move to the DB

## Problem

Style presets (prompt, LoRAs, style_modifier, sd_model, plus an unused `keywords`
field) live hardcoded in `src/_utils/ImageStyles.js` and are sent from the
client to `/api/generate/start` as query params. The backend already flags
`style_loras` as an untrusted client input it has to clamp/cap defensively
(`api/utils/utils.py`). `keywords` was meant for future filtering/search but
is never read anywhere.

## Goal

Move everything except `image_url` into a new Mongo `styles` collection,
resolved server-side by `style_id` during generation. The frontend keeps only
`{ id, title, image_url }` per style. Remove `keywords` entirely, and remove
any now-dead code that referenced it.

## Data model

New collection `styles` in the `QART` DB:

```
{
  _id: ObjectId,
  style_key: str,       # stable slug shared by every version of this style, e.g. "ukiyo-e"
  version: int,         # 1, 2, 3... increments per style_key
  is_active: bool,      # true for the version currently live on the frontend
  title: str,
  prompt: str,
  loras: [{ model_name: str, strength: float }],
  style_modifier: float,
  sd_model: str,
}
```

No `keywords`, no `image_url`. Document `_id`s are Mongo-generated `ObjectId`s
(stringified on the way out, same convention as `images`/`users`) — that's
still what the frontend holds and what generation resolves by. `style_key` +
`version` exist purely to link a style's versions together for
querying/history; they are never looked up directly during generation.

**Creating a new version:** insert a new doc with the same `style_key`,
`version` incremented, `is_active: true`, and the tweaked
prompt/loras/style_modifier/sd_model. Flip the prior version's `is_active` to
`false`. Update the frontend's `ImageStyles.js` entry to point its `id` at the
new doc's `_id` when ready to roll it out — until then, the frontend keeps
generating against the old version. `is_active` is informational only and is
**not** enforced by the generate endpoint — an inactive version's `_id` still
resolves fine, so a browser tab open before a rollout (or an old `ImageDoc`
being iterated on) keeps working against the exact version it was using.

The current "Random" entry (`id: 1` today, empty prompt, never actually used
for generation — it's always swapped client-side for a concrete style before
submit) is **not** migrated into the DB. It stays a frontend-only UI sentinel
and has no `style_key`/version history.

## Backend changes

- **New `Style` schema** in `api/schemas/schemas.py` (id via `PyObjectId`
  alias, style_key, version, is_active, title, prompt, loras, style_modifier,
  sd_model).
- **New lookup helper** (e.g. `api/controllers/styles_controller.py`):
  `get_style(style_id) -> Style`, raises if not found. Internal use only — no
  public list/read endpoint, since the frontend never fetches styles from the
  backend (see below).
- **`/api/generate/start`** (`api/main.py`): replace the `sd_model`,
  `style_prompt`, `style_title`, `style_loras`, `style_modifier` query params
  with a single `style_id: str` param. The endpoint resolves the style from
  Mongo *before* creating the background job, so an invalid/missing id fails
  fast with a `400`/`404` instead of surfacing only as an async job failure.
- **`predict()` / `start_generation()`** (`api/controllers/generate_controller.py`):
  take the resolved `style_id`, `style_title`, `style_prompt`, `loras`,
  `style_modifier`, `sd_model` (already-resolved values, not raw client
  input) instead of parsing `style_loras` from a query string.
- **Remove `parse_style_loras`** (`api/utils/utils.py`) and its "untrusted
  input" clamping — the DB is now the trusted source, so no defensive
  clamping is needed on read. `loras` comes back as already-validated data
  via the `Style` schema.
- **`create_image_doc`** (`api/controllers/images_controller.py`): accepts and
  persists a new `style_id` field.
- **`ImageDoc`** (`api/schemas/schemas.py`): add `style_id: Optional[str] = None`.
  Optional so existing documents (created before this change) remain valid.

## Frontend changes

- **`src/_utils/ImageStyles.js`**: trimmed to `{ id, title, image_url }` per
  style (`id` = the Mongo id produced by the seed script below), plus the
  synthetic `{ id: "random", title: "Random", image_url: ... }` sentinel
  entry. Export a `RANDOM_STYLE_ID = "random"` constant. `selectRandomStyle()`
  filters on `id !== RANDOM_STYLE_ID` instead of `id !== 1`.
- **`src/store.js`**: `generateFormValues` (both the initial state and
  `resetGenerateFormValues`) drop `style_prompt`, `loras`, `style_modifier`,
  `sd_model`; `style_id` defaults to `RANDOM_STYLE_ID`.
- **`StylesModal.js`**: `handleStyleClick` only sets `style_id`/`style_title`.
- **`GenerateForm.js`**: `handleStyleChipClick` only sets
  `style_id`/`style_title`. The random-style-swap block in `handleGenerate`
  only reassigns `style_id`/`style_title` from `selectRandomStyle()`.
- **`IteratePanel.js`**: `initFormValues` resolves the active style by
  `img.style_id` first, falling back to the current `img.style_title` match,
  falling back to `styles[0]`, for images created before this change. Drops
  `style_prompt`, `loras`, `sd_model`, `style_modifier` from form
  state/payloads entirely. `buildPayload`'s random-swap check uses
  `RANDOM_STYLE_ID` instead of `=== 1`.
- **`src/_utils/ImagesUtils.js`**: `startGeneration` drops the
  `loras`/`style_loras` JSON-stringify handling and `style_modifier`
  coercion; the query payload becomes `website, prompt, style_id, qr_weight,
  negative_prompt, seed` (no `style_title`/`sd_model` — the backend derives
  the canonical title from the DB and no longer needs the client's `sd_model`
  at all).
- **No new frontend API call.** The frontend never fetches the styles list
  from the backend — it keeps its own hardcoded `{id, title, image_url}`
  array, kept in sync by hand.

## Migration (one-time, manual)

A one-off script (`api/scripts/seed_styles.py`, following the existing
`api/scripts/` convention of not being part of the request path) inserts the
current styles' `title, prompt, loras, style_modifier, sd_model` (source: the
current contents of `ImageStyles.js`, minus `keywords`/`image_url`/`id`) into
the new `styles` collection as `version: 1`, `is_active: true`, with a
`style_key` slugified from each title (e.g. "Ukiyo-e" → `"ukiyo-e"`), then
prints the resulting `{_id, title}` pairs. Those ids get pasted into the
trimmed `ImageStyles.js` by hand, paired with each style's existing
`image_url`. **Running this script writes to the live Mongo Atlas DB — it
will be run only with explicit confirmation at implementation time, not
automatically.**

Any future new style (not a new version of an existing one) requires
manually inserting a doc with a new `style_key` into `styles` and adding the
matching `{id, title, image_url}` entry to the frontend file — no tooling for
this is being built now (out of scope). Publishing a new *version* of an
existing style is the insert-and-swap-the-id workflow described above.

## Removing `keywords` / dead code

- Delete the `keywords` array from every entry in `ImageStyles.js` (moot once
  the file is trimmed to `id`/`title`/`image_url` per the above).
- Confirmed by grep: `style.keywords` is never read anywhere in the app — the
  only other `keywords` hits in the codebase are the unrelated
  `promptKeywords` random-prompt-word feature in `PromptGenerator.js`
  (used by `CustomStyleModal.js`/`PromptKeywords.js`), which is untouched.

## Testing

- **Frontend (Jest):** rewrite `src/__tests__/imageStyles.test.js` — the
  LoRA-shape/prompt assertions move to a backend test against the seed data;
  the frontend test only needs to check the `{id, title, image_url}` shape
  and `selectRandomStyle`'s sentinel-exclusion behavior. Update
  `GenerateForm.test.js`, `IteratePanel.test.js`, `SettingsModal.test.js`,
  `images.test.js` wherever they assert on `style_prompt`/`loras`/
  `style_modifier`/`sd_model` in form values or generate payloads.
- **Backend (pytest):** update `test_generate.py`, `test_utils.py`,
  `test_http.py`, and the e2e generate test for the new `style_id`-only
  `/api/generate/start` signature; add coverage for the DB-backed style
  lookup (found / not-found) and for the seed script's data shape.

## Out of scope

- No admin UI for managing styles or publishing versions — it's a manual
  insert-doc-then-edit-frontend-file workflow.
- No public `GET /api/styles` endpoint.
- No backfill of `style_id` onto pre-existing `ImageDoc`s.
- No enforcement of `is_active` at generation time (see Data model).
- No endpoint to list a style's version history — `style_key`/`version` are
  stored for future querying directly against Mongo, not surfaced via API.
