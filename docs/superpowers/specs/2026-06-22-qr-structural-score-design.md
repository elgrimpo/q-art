# QR Structural Scannability Score — Design

**Date:** 2026-06-22
**Status:** Implemented (37 tests pass). Validation outcome below.
**Author:** Christoph + Claude

## Validation outcome (after build)

- **Resolution: solved.** Composite score spreads continuously over 88 decodable
  codes — min 48, median 82, max 92, std 8.3 (vs the Vision scorer's bimodal
  0/100). Clean QR = 100.
- **Scannable-vs-not: validated** via the finder term — AUC 0.75 on the full 45
  phone-labelled residuals (the hard set, including the genuinely-bad codes the
  full composite can't be tested on, since they have no recoverable payload).
- **Fine-grained ordering within the scannable range: not yet validated** — needs
  human "felt scanning effort" ratings on a sample of decodable codes to tune the
  weights. (The composite-vs-phone test on decodable residuals was inconclusive:
  only n=3 phone-"no" decode, and those 3 are codes a quick phone wave missed but
  Vision read — structurally fine, so a high score is arguably correct.)

## Why a second scorer

The first scorer (`scorer.py`) answers "how robustly can a phone-grade *decoder*
read this styled image?" using Apple Vision. Two limits make it unfit for
production:

1. **macOS-only.** Vision can't run on the Linux (Heroku) backend, where every
   generated code needs a score.
2. **Saturated resolution.** With a strong decoder driving the robustness sweep,
   most readable codes pile up at ~100 (bimodal: Excellent or 0). It can't
   separate "instant" from "merely fine."

This scorer answers a different, production-friendly question: **given the QR we
just generated (known payload + known module grid), how structurally sound is
the styled rendering?** It is decoder-independent, runs natively on Linux, and
its sub-metrics are continuous, so the score spreads out.

## What we validated first (before building)

On the 113 real samples:
- **Full-frame alignment holds:** the QR spans the whole image at the known grid
  (offset ≈ 0, scale ≈ 1.0). We can sample modules *without* localizing.
- **Raw module-match does NOT discriminate** — it sits at ~0.80 for every code.
  Dropped it.
- **Finder-pattern strength DOES** — it separates phone-scannable from
  non-scannable residuals at **AUC 0.75** (on the hardest, decoder-failed
  subset), payload-free and decoder-free. This is the spine of the score.

Finder integrity also maps directly to Christoph's lived signals: strong finders
= fast camera lock-on ("time to detect"); the finder's minimum detectable size =
"do I need to zoom out".

## Inputs

`structural_score(styled_image: PIL.Image, payload: str) -> StructuralResult`

Production always has both (it generated the code). For offline validation we
recover `payload` with the decoder battery; in prod it is passed in directly.

The ideal grid is `qrcode.QRCode(error_correction=H, border=4); add_data(payload);
make(fit=True).get_matrix()` → `N×N` bool (True = dark, includes the 4-module
quiet-zone border). The styled image is assumed full-frame: module `(r,c)` center
is at `((c+0.5)·W/N, (r+0.5)·H/N)`.

## Sub-metrics (each normalized 0–1, all decoder-independent)

1. **Finder integrity** *(primary — the validated discriminator).* The 3 finder
   patterns sit at known grid positions (top-left, top-right, bottom-left, each a
   7×7 module concentric square inset by the 4-module border). Sample each finder
   region and correlate against the ideal finder template, **polarity-agnostic**
   (compare against the template and its inverse, take the better). Combine the
   three with **min** (a QR needs all three to be found — the weakest is the
   bottleneck).

2. **Module contrast / modulation.** Using the known ideal labels, the luminance
   separation between should-be-dark and should-be-light modules,
   `(mean_light − mean_dark)/255`, clamped to [0,1]. High separation = readable.
   Determines polarity for metric 3.

3. **Module-error margin (ECC headroom).** Threshold each sampled module to the
   detected polarity, count mismatches vs the ideal, express as a fraction of
   level-H's ~30% budget: `margin = 1 − min(1, module_error_rate / 0.30)`. This
   is the old Method A done right — no localization needed because we know the
   grid.

4. **Minimum scannable size** *(reported sub-metric → "zoom out").* Progressively
   downscale and recompute finder integrity; the smallest pixels-per-module at
   which finder integrity stays above a floor = how small/distant the code can be
   and still be found. Reported in px/module; optionally a soft contributor.

## Headline blend

```
score = 100 · (0.45·finder + 0.25·contrast + 0.30·margin)
```

Weights start here (finder leads because it is the validated signal) and are
calibration parameters, tuned against the phone labels. Continuous by
construction — no decode cliff.

Bands reuse `scorer.band()` for consistency.

## Verification

`test_structural_score.py` (deterministic, synthetic fixtures):
- Clean QR → high score (finder ≈ 1, contrast high, margin ≈ 1).
- Finders painted over (data intact) → finder integrity collapses, score drops.
- Faded/low-contrast QR → contrast term drops.
- Data region corrupted beyond ECC (finders intact) → margin drops, finder stays.
- Inverted-polarity QR (light on dark) → still scored correctly.

**Calibration validation** (script, not a unit test): compute the composite on
the 113 samples (payload via decoder battery) and confirm (a) it separates the
phone-labelled residual set at AUC ≥ 0.75, and (b) the score distribution is
continuous, not bimodal. Vision-based `scorer.py` is the local oracle.

## Out of scope (YAGNI)

- Integrating into the live `api/` generation pipeline — that is a follow-up once
  the score is calibrated. This prototype proves the score works decoder-free.
- Sub-module-precise localization / homography — full-frame sampling is validated
  as sufficient for these centered, full-frame Q-Art renders.
- ISO/IEC 15415 conformance grading — we use a documented approximation.

## Production path (the point of this scorer)

Pure NumPy + a synthetic template; no Vision, no `opencv-contrib` decoder, no
network. It can run inline in the FastAPI generate flow at score time, where the
payload and the control-image grid are already in hand — giving every generated
code a score. Decide the integration trigger after calibration.
