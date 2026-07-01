# Per-style generation parameter tuning pipeline — design

**Date:** 2026-07-01
**Status:** Design approved, pending implementation
**Author:** Christoph + Claude

---

## Problem

Q-Art applies one global formula (`prepare_img2img_request` in `api/utils/utils.py`)
to translate the `qr_weight` slider into ControlNet/img2img parameters for every
style. A busy style ("Doodle Art") likely needs different ControlNet strength
than a clean one ("Photography") to reach comparable scan reliability without
over-distorting the art. There's currently no repeatable way to discover good
per-style parameters, gated on real QR scannability and refined for visual
quality.

## Goal

Produce tuned, per-style generation parameters that reliably clear a QR
scan-score threshold while preserving/improving each style's aesthetic, stored
so production can look them up per style instead of using the one global
formula. **Wiring `generate_controller.py` to read these tuned params is a
separate follow-up ticket** — this ticket only produces and stores them.

---

## Scope

### In scope

- A standalone tuning tool, independent of the production generate flow, that:
  - Runs an Optuna-driven parameter search (Stage 1) per style/checkpoint,
    scored by the existing `structural_score` scannability scorer.
  - Re-confirms the best candidates on a fuller prompt/seed grid and selects a
    diverse shortlist.
  - Provides a static-HTML review tool (Stage 2) for Christoph to rate
    shortlisted candidates.
  - Promotes approved candidates into a `style_configs` collection.
- Pilot validation on 2–3 styles (Doodle Art, Photography, +1 optional) before
  running across the full style list.

### Out of scope

- Wiring `generate_controller.py`/`predict()` to read from `style_configs` in
  production (separate follow-up ticket).
- Polish of the review interface beyond basic functionality.
- An automated aesthetic-quality proxy (e.g. CLIP-based scoring) — Stage 1
  stays scannability-only; all aesthetic judgment happens in Stage 2 manual
  review (per discussion: clearing the score threshold is easy, so the
  interesting trade-off is distortion vs. looks, which a human judges best).
- LoRA-weight-via-prompt-templating — investigated and dropped: LoRA strength
  is already a structured, tunable number (`loras: [{model_name, strength}]`
  in `ImageStyles.js`, parsed by `parse_style_loras`), not embedded in the
  prompt string. The tuning search just adds `lora_strength` as one more
  continuous dimension.

---

## Architecture

New self-contained module, sibling to the existing one-off scripts:

```
api/scripts/styletuning/
├── config.py            # per-style pilot config: test prompts, checkpoint candidates, param bounds
├── request_builder.py   # own img2img_v3 request construction (full param control, no qr_weight formula)
├── search.py             # CLI entrypoint: runs one Optuna study for one style+checkpoint
├── shortlist.py          # confirmation grid + diverse shortlist selection, writes tuning_candidates
├── build_review.py       # generates static review HTML (mirrors build_scannability_review.py)
├── review.html           # generated output (gitignored)
├── import_ratings.py     # reads downloaded ratings JSON, writes ratings + promotes to style_configs
└── samples/              # locally saved trial + candidate images (gitignored)
```

- **Independent Novita client**: its own `NovitaClient(os.environ["NOVITA_KEY"])`
  instance, entirely separate from `generate_controller.py`'s `client`.
- **Local image storage only** — no new S3 bucket/prefix. Trial and candidate
  images are saved to `samples/` on disk (gitignored).
- **Reuses** two pure, already-decoupled helpers: `normalize_qr_url()` and
  `structural_score()` from `api/utils/` (stateless utils, not the `predict()`
  path). Has its **own request-builder function** — not
  `prepare_img2img_request()` — so every ControlNet/LoRA/checkpoint param is
  independently controllable instead of driven by the collapsed `qr_weight`
  formula.
- **Mongo**: same `QART` database, same connection pattern as the existing
  scripts (`load_dotenv`, `certifi` TLS for non-localhost). Three new
  collections: `tuning_runs`, `tuning_candidates`, `style_configs`.
- **Optuna runs in-process**, no persistent Optuna storage backend — every
  trial is mirrored into `tuning_runs` as it happens, which is the actual
  audit trail. If a run crashes mid-study, restart that style+checkpoint's
  study fresh (acceptable at this scale).

---

## Storage schemas

### `tuning_runs` — one doc per trial (full audit history)

```
{
  _id,
  style_id, style_title,
  checkpoint,                    # sd_model under test
  trial_number,                  # Optuna trial index within this style+checkpoint study
  params: {
    cfg_scale, steps,             # steps fixed at 30, not tuned
    brightness_weight,
    monster_weight, monster_guidance_start, monster_guidance_end,
    img2img_strength,
    lora_strength,                 # null if style has no LoRA
  },
  prompts_used: [str],            # reduced set used during search
  seed,
  per_prompt_scores: [{ prompt, seed, score, image_path }],
  min_score,                       # worst score across prompts_used
  distortion_cost,                 # normalized monster_weight + normalized img2img_strength
  feasible: bool,                  # min_score >= threshold (85, configurable)
  created_at,
}
```

### `tuning_candidates` — shortlisted trials awaiting/holding review

```
{
  _id,
  run_ref: { style_id, checkpoint, trial_number },  # points back to the tuning_runs doc
  params: {...},                    # denormalized copy so this doc is self-contained
  min_score, distortion_cost,
  confirmation_grid_scores: [{ prompt, seed, score, image_path }],  # fuller grid re-check
  sample_image_paths: [str],
  status: "pending" | "approved" | "rejected",
  rating: null | 1-5,
  notes: str | null,
  reviewed_at: datetime | null,
  created_at,
}
```

### `style_configs` — production-ready tuned params (write-only in this ticket)

```
{
  _id,
  style_id, style_title,
  checkpoint,
  params: {...},                    # final approved param set
  source_candidate_id,               # ref to tuning_candidates._id
  promoted_at,
}
```

One doc per `style_id` — promoting a new candidate for an already-tuned style
upserts (overwrites), since only one config is "current" per style.

---

## Stage 1 — automated search

**Loop:** for each pilot style → for each checkpoint candidate (Christoph
specifies the candidate list per style in `config.py`) → run one Optuna study.

**Search space:**

| Param | Type | Bounds |
|---|---|---|
| `cfg_scale` | float | 6–9 |
| `steps` | fixed | 30 (not tuned) |
| `brightness_weight` | float | 0.15–0.6 |
| `monster_weight` | float | 1.0–2.0 |
| `monster_guidance_start` | float | 0.2–0.5 |
| `monster_guidance_end` | float | 0.8–1.0 |
| `img2img_strength` | float | 0.5–1.0 |
| `lora_strength` | float (only if style has a LoRA) | 0.3–1.2 |

Bounds are configurable per style/checkpoint in `config.py` if a checkpoint
needs a different range.

**Objective (single value Optuna minimizes):**

1. Generate against the reduced prompt set (Christoph-authored, per style) ×
   1 seed each.
2. Score each generation with `structural_score`; `min_score` = worst score
   across prompts (targets generalization, not a lucky prompt).
3. `distortion_cost` = normalized `monster_weight` + normalized
   `img2img_strength` (the two params that most directly force the QR
   pattern over the art). Each is min-max normalized to 0–1 using its search
   bound range from the table above (e.g. `monster_weight` 1.0–2.0 →
   `(monster_weight - 1.0) / 1.0`), so `distortion_cost` ranges 0–2.
4. Objective:
   - if `min_score < 85`: `objective = 85 - min_score` (penalty pulling the
     search toward the threshold).
   - if `min_score >= 85`: `objective = distortion_cost` (once feasible,
     purely reward the least-mangled params).

This makes Optuna spend early trials finding the feasible region, then
converge toward the lowest-distortion point inside that region — directly
targeting "scannable but not visually mangled" rather than "most scannable."

**Trial budget (defaults, configurable):** ~40 trials per style+checkpoint
combination, 2 test prompts × 1 seed = 80 Novita calls per combination. Every
trial (feasible or not) is written to `tuning_runs` regardless of outcome.

---

## Stage 1.5 — confirmation grid + diverse shortlist

Run by `shortlist.py` once **all** checkpoint studies for a style have
finished (confirmation and shortlisting both operate at the *style* level,
pooling across that style's checkpoint candidates — checkpoint choice is one
more axis of diversity a style's shortlist can span):

1. **Confirmation:** pool feasible trials (`min_score >= 85`) across every
   checkpoint study run for the style, ranked by `distortion_cost` ascending.
   Re-run the best ~10 (across all checkpoints combined, not 10 per
   checkpoint) against the fuller prompt/seed grid (all test prompts × 2
   seeds). Only trials whose `min_score` still clears 85 on the fuller grid
   survive; their `confirmation_grid_scores` are written back to the source
   `tuning_runs` doc.
2. **Diverse shortlist:** from the confirmed set (still pooled across
   checkpoints), greedily build one shortlist of up to 5 candidates per style
   (configurable):
   - Sort by `distortion_cost` ascending.
   - Walk the sorted list, adding a candidate only if it's at least a minimum
     normalized-parameter distance (Euclidean over `cfg_scale`,
     `brightness_weight`, `lora_strength`, guidance start/end — checkpoint
     counted as an automatic difference, distance = infinite across
     checkpoints) from every candidate already picked.
   - This spans a few genuinely different aesthetic trade-offs — and
     potentially different checkpoints — instead of 5 near-identical
     low-distortion points on the same checkpoint.

Each selected candidate becomes one `tuning_candidates` doc
(`status: "pending"`), with confirmation-grid images copied into
`samples/<style>/candidates/`.

If fewer than 5 trials are feasible at all (across all of a style's
checkpoints combined), the shortlist contains what's available —
`shortlist.py` logs how many styles came up short so nothing is silently
dropped.

---

## Stage 2 — review UI + promotion

**`build_review.py`** (mirrors the existing `build_scannability_review.py`
pattern):

- Queries `tuning_candidates` where `status: "pending"`, grouped by style.
- Embeds each candidate as **one card**: the confirmation-grid images shown
  side-by-side (same params, different prompts), the params table, and
  `min_score`/`distortion_cost` badges.
- **One rating control per card** (1–5 buttons) — a single rating judges the
  whole param set across its prompt images, not each image individually.
- Ratings auto-save to `localStorage` keyed by candidate `_id` (survives
  refresh/tab close).
- Sticky header: progress counter + "Download JSON" button.
- Export: `[{ candidate_id, style_id, rating, approve: bool }]` for all rated
  candidates → `styletuning-ratings.json`.

**`import_ratings.py`** (one-off script, run after rating is done):

- Reads the downloaded JSON.
- For each entry: writes `rating`, sets `status` to `"approved"` or
  `"rejected"`, sets `reviewed_at`.
- For every `"approved"` candidate, upserts a `style_configs` doc for that
  `style_id` (overwriting any prior config for that style) with `params`,
  `checkpoint`, and `source_candidate_id`.
- If a style has more than one approved candidate in the same import, the
  script picks the lowest `distortion_cost` among them and logs a warning
  that the others were skipped.

---

## Testing

Pure-function unit tests only — no live Novita/Mongo in CI:

- `distortion_cost` calculation.
- The Optuna objective function (threshold-penalty vs. distortion-reward
  branches).
- The greedy diverse-shortlist selection algorithm.
- `import_ratings.py`'s approve/upsert logic against a stubbed Mongo
  collection.

No integration test hits the real Novita API or writes to the real Mongo
instance.

---

## Open items intentionally left for Christoph to fill in before running

- `config.py` per pilot style: test prompts (2 for search, fuller set for
  confirmation) and checkpoint candidate list. Not pre-populated by this
  design — Christoph authors these before the first run.
- Exact trial/prompt/seed counts can be dialed down further once real Novita
  latency/cost per call is observed during the first pilot run.
