# QR Scannability Score — Prototype Design

**Date:** 2026-06-22
**Status:** Approved (design), pending implementation plan
**Author:** Christoph + Claude

## Problem

Q-Art produces AI-styled QR codes. The styling can make a code pretty but hard
to scan: some codes decode instantly, others "scan but take a beat" before a
phone camera locks on, and some fail. Today there is no way to measure this.

We want a **0–100 scannability score** that distinguishes "instant" from
"scannable but slow" from "won't scan", so we can later use it as a quality
signal (e.g. a gate before unlock/download, or a badge in the UI).

This spec covers a **standalone prototype only** — no changes to the live app.
Its job is to validate that the scoring approach produces sensible, useful
numbers before we decide whether/how to integrate it.

## Core insight

Scannability is not binary. Every QR code has Reed–Solomon error correction;
Q-Art generates at level **H** (`ERROR_CORRECT_H`, ~30% of the code can be
obscured and it still decodes — see `api/controllers/generate_controller.py:111`).
The AI styling "spends" some of that budget. Scannability ≈ **how much robustness
budget survives the styling**. That maps cleanly onto 0–100.

## Scope

### In scope
- A self-contained Python CLI that scores styled QR PNGs from a local folder.
- Self-decoding the payload from each image (no need to supply the URL).
- A blended 0–100 score with a plain-English band and a per-image breakdown.
- Deterministic self-tests on generated fixtures.

### Out of scope (YAGNI for the prototype)
- Any change to `api/`, the generation pipeline, or the frontend.
- Fetching images from S3 / the live site (user supplies a folder).
- Generating test images via the Novita pipeline.
- Exact ISO/IEC 15415 conformance grading (we use a documented approximation).
- Replicating any specific phone's proprietary detector.

## Architecture

A self-contained prototype, isolated from the app's dependencies:

```
prototypes/qr-scannability/
├── score_qr.py        # CLI entry: scores one image or a whole folder
├── scorer.py          # scoring logic (importable, pure, testable)
├── requirements.txt   # pillow, numpy, qrcode, opencv-python, zxing-cpp
├── samples/           # user drops PNGs here (gitignored except .gitkeep)
└── test_scorer.py     # deterministic sanity checks
```

- **`scorer.py`** holds the logic as pure functions returning a result object —
  no I/O, no printing — so it can be unit-tested and later lifted into
  `api/utils/` if we integrate.
- **`score_qr.py`** is a thin CLI: resolve paths → call scorer → format output.
- Its own `requirements.txt` keeps `opencv-python` / `zxing-cpp` out of the
  app's `requirements.txt`. All deps are pip wheels (incl. macOS arm64); no
  system libraries (`brew`) required. `pyzbar` is intentionally **not** used so
  we avoid the `zbar` system dependency.

### Decoder battery

Two decoders, run together at every step:

1. **OpenCV** `cv2.QRCodeDetector().detectAndDecode()` — also provides corner
   localization used by Method A.
2. **`zxing-cpp`** (`zxingcpp.read_barcodes`) — robust ZXing-lineage decoder, a
   good proxy for real camera decoders.

Decoder *disagreement* is signal: if only the most tolerant decoder reads a
degraded image, the code is fragile.

## Scoring math

Headline score is a blend of two methods.

### Method B — robustness sweep (primary, drives the headline)

Degrade the image along axes that mirror real camera conditions, each on a
**fixed severity ladder**, and find the **breaking point** per axis (the
harshest level still decodable by the battery). No randomness; ladders are
fixed and normalized to image size so results are deterministic.

| Axis | Simulates | Weight |
|---|---|---|
| Downscale | Distance / small print | high |
| Gaussian blur | Out of focus | high |
| Contrast reduction | Poor lighting / muddy styling | high |
| Rotation | Tilted phone | medium |
| Perspective warp | Held at an angle | medium |
| JPEG + noise | Compression / sensor noise | low |

Each axis → sub-score in [0,1] = how far up its ladder the code survived,
relative to that of a clean reference QR (so the ladders are calibrated, not
arbitrary). Weighted average → **Method B score (0–100)**.

Exact ladder steps and weights are an implementation/tuning detail to be set in
the plan and calibrated against the fixtures and the user's samples.

### Method A — error-correction margin (secondary diagnostic)

1. Decode the styled image to recover the payload.
2. Re-encode it with `qrcode` at `ECC=H`, `fit=True` → the **ideal** module
   matrix.
3. Localize the QR in the styled image (OpenCV corners → perspective-correct to
   a square → sample each module center → Otsu threshold → observed matrix).
4. Count module mismatches vs. ideal; express as a fraction of the ~30% budget
   level H can absorb → **headroom %**.
5. **Method A score** = `(1 − budget_used) × 100`, clamped to [0,100].

**Honesty note (carried into output):** this is an *approximation*. True ISO/IEC
15415 "unused error correction" works at the Reed–Solomon codeword level (8-module
blocks), not raw module counts. Raw module-error rate is a transparent,
good-enough proxy for a prototype.

**Graceful degradation:** if localization/decoding fails, Method A is skipped
and the headline falls back to 100% Method B.

### Headline blend

```
score = 0.70 * methodB + 0.30 * methodA     # if Method A available
score = methodB                              # if Method A unavailable
score = 0                                    # if no decoder reads the clean image
```

Rationale for weighting B over A: Method B directly models real scanning and is
reliable to implement; Method A's module-sampling is the fiddly part, so it
corroborates rather than drives.

### Bands

| Range | Band |
|---|---|
| 0 | Won't scan |
| 1–39 | Risky |
| 40–59 | Fragile (scans slowly) |
| 60–79 | Good |
| 80–100 | Excellent |

## Output

Per image, printed to stdout:
- Filename, headline score, band.
- Baseline decode: which decoders read the **clean** image (+ decoded URL).
- Per-axis breaking points (the robustness profile).
- Method A margin estimate (or "n/a — localization failed").

Then a **summary table** across the folder (filename · score · band), sorted
ascending so the weakest codes surface first.

## Verification

`test_scorer.py` (pytest) generates deterministic fixtures in-memory:
- A **plain unstyled QR** → must score in the Excellent band (~100).
- A **heavily corrupted QR** (e.g. clean QR with a large fraction of modules
  randomly flipped / heavy noise overlay) → must score low (Risky or 0).
- A **non-QR / pure-noise image** → must score 0 (no decode).

These pin the scorer's calibration at both ends so it's actually checked, not
assumed. Manual validation: run against the user's `samples/` folder and confirm
known-easy codes outrank known-hard ones.

## Open questions / future work (not this prototype)

- Calibration of exact ladder steps/weights against a larger real sample.
- Whether to upgrade Method A to true codeword-level (ISO 15415) grading.
- Integration target if validated: post-generation gate vs. on-demand check vs.
  UI badge (decide after seeing the prototype's numbers).
