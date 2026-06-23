# Scannability scorer v2 — design

**Date:** 2026-06-23
**Status:** Approved (chat), pending implementation plan
**Ticket:** QRAI-110 follow-up (production scorer calibration)
**Goal:** Raise the structural scannability scorer's agreement with real
decodability. Today it is near-random (AUC 0.617 vs a Vision/WeChat/zxing decoder
battery on 247 rated codes), driven by two diagnosed failure modes. Fix both with
pure-NumPy changes (no new dependencies), then recalibrate the blend weights on
the now-labeled dataset.

## Background — what the evidence showed

A 247-code offline rating session (`scannability-ratings.json`) was cross-checked
against a real decoder battery (Apple Vision + WeChat CNN + zxing) used as ground
truth. Predictor strength vs that truth:

| predictor | AUC |
|---|---|
| Christoph's 1–5 eyeball rating | 0.846 |
| `finder` component alone | 0.729 |
| **combined score (current)** | **0.617** |
| `contrast` component | 0.510 (≈ random) |
| `ecc_margin` component | 0.503 (≈ random) |

Two failure modes, both confirmed visually and numerically:

1. **Non-square / padded renders flatline (false "unscannable").** `sample_modules()`
   stretches an N×N grid across the whole frame; on a portrait/padded image every
   module samples the wrong pixels and all components collapse to ~0. The 13
   non-square codes averaged an algo score of 5.8 (finder 0.07) yet were 69%
   decodable. Tested fix: a center-square crop recovers finder integrity from
   ~0.08 to ~0.42 on portrait images and is a no-op on already-square images.
   `cv2.QRCodeDetector` was tested and fails to localize *every* styled code, so it
   is explicitly rejected.

2. **Blind to the data region (false "scannable").** 69 codes scored ≥55 but do
   not decode: finders pristine, `ecc_margin` healthy (0.68–0.98), but the artwork
   shreds interior modules. `ecc_margin` thresholds every module against one
   *global* midpoint; a phone binarizes *locally*, so localized damage is invisible
   to the current metric (hence its AUC 0.50).

Bonus finding (explicitly **deferred**, not in this iteration): WeChat's CNN
decoder runs on Linux and decoded 36% of codes; a successful decode is a
100%-precision "scannable" signal. Deferred because `opencv-contrib-python` + model
files add ~80MB to the Heroku slug, need system libs (libGL), and add dyno RAM —
not justified for a no-users app until the structural fixes are measured. It
remains a clean, independent short-circuit to add later.

## Scope

In: changes to `api/utils/structural_score.py` (and its prototype twin), new tests,
weight recalibration, and a re-backfill of existing scores.
Out: WeChat/decoder-in-prod; frontend display changes; any pipeline/route changes
beyond the scorer call already in `generate_controller.py`.

## Design

### Component 1 — `localize_qr(img) -> img`

A new pure function, applied before grid sampling in `structural_score()`.

- v1 behavior: crop to the centered `min(w, h) × min(w, h)` square.
- Rationale: the app composes the QR as a centered square; portrait/landscape
  renders pad it vertically/horizontally. Center-crop realigns the grid.
- Safety: on a square image this is an identity crop (verified no-op: control
  image stayed at finder 0.92).
- Explicitly NOT using `cv2.QRCodeDetector` (fails on all styled codes; also
  avoids adding the OpenCV dependency).
- Follow-up (not v1): a bounded scale/offset search that maximizes finder
  integrity, to close the residual 0.42-vs-0.92 gap. Documented as future work.

### Component 2 — local-threshold data-region error

Replace `ecc_margin`'s single global threshold with a **locally-adaptive**
module classification, mimicking a decoder's binarization.

- For each module, derive the dark/light decision from a *local* neighborhood
  threshold (e.g. per-module local mean over a window, or a block-adaptive
  threshold over the sampled module grid) rather than the one global midpoint.
- Compute the module-error rate against the known ideal grid under that local
  threshold; keep the polarity-agnostic handling (min of err, 1-err).
- Restrict to / weight the data region (exclude finder + quiet-zone modules,
  which Component-1 + the finder term already cover).
- Drop the `contrast` component (AUC 0.510, redundant with the above and the
  finder term). `min_modules` stays informational only (it currently returns inf
  on most images and is not in the blend).

### Component 3 — data-driven weight re-fit

- Build a labeled table from the existing artifacts: 247 codes × {finder,
  local-error, …} features, labelled by decoder-truth (and Christoph's 1–5 rating
  as a secondary reference).
- Fit a simple logistic regression / convex blend to set the weights, replacing
  the hand-picked `0.45 / 0.25 / 0.30`.
- Use cross-validation (small N) and report held-out AUC. Persist the chosen
  weights as named constants with a comment citing the fit.

## Testing

- Unit (extend `test_structural_score.py`): a synthetic/real non-square image must
  score sanely (localization), and a finders-intact/interior-shredded image must
  score low (local-error term).
- Dataset validation: recompute v2 score on the 247 labeled codes; **gate:** AUC
  must beat the current 0.617 on a held-out split, target ≥ 0.73 (finder-alone).
- Regression: square, clearly-good control codes must stay high.

## Rollout

- Mirror the change into `api/utils/structural_score.py` (production) and keep the
  prototype copy in sync.
- Re-run `python -m api.scripts.backfill_scannability` to re-score existing images
  (the script already recomputes for all docs).

## Risks / notes

- Center-square assumes the QR is centered; off-center compositions get partial
  benefit. Acceptable for v1; the scale/offset search is the mitigation if needed.
- Small labeled N (247) → use cross-validation and avoid over-parameterizing the
  blend (2–3 features max) to prevent overfit.
- Keep each component a separately-testable pure function; `structural_score()`
  stays the thin orchestrator.
