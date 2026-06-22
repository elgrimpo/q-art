# QR Scannability Score — Prototype Design

**Date:** 2026-06-22 (rev. 2026-06-22 — decoder rebuilt on Apple Vision after real-sample validation)
**Status:** Implemented. Decoder battery rebuilt Vision → WeChat → zxing after a
real-sample phone-check exposed the original decoders as the bottleneck (see
"Decoder battery").
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
├── decoders.py        # QR decoder battery: Apple Vision → WeChat → zxing
├── models/            # bundled WeChat CNN detector weights (~1 MB)
├── requirements.txt   # pillow, numpy, qrcode, opencv-contrib-python, zxing-cpp, pyobjc (macOS)
├── samples/           # user drops PNGs here (gitignored except .gitkeep)
├── test_scorer.py     # deterministic sanity checks
└── test_decoders.py   # decoder-battery coverage
```

- **`scorer.py`** holds the scoring logic as pure functions returning a result
  object — no I/O, no printing — so it can be unit-tested and later lifted into
  `api/utils/` if we integrate.
- **`decoders.py`** holds the decoder battery (see below), separated so the
  "can a phone read this?" question has one clear home.
- **`score_qr.py`** is a thin CLI: resolve paths → call scorer → format output.
- Its own `requirements.txt` keeps the heavy CV deps out of the app's
  `requirements.txt`. All deps are pip wheels (incl. macOS arm64); no system
  libraries (`brew`) required. `pyzbar` is intentionally **not** used so we
  avoid the `zbar` system dependency.

### Decoder battery

**The scorer is only as accurate as the decoder it is built on.** A score of 0
means "no decoder could read it" — so a weak decoder manufactures false zeros.
Validated against 113 real Q-Art codes: the original zxing + OpenCV pair read
only **16/113**, while the user's phone reads **~95/113**. Every "won't scan" the
old battery reported for the other ~79 was a lie told by a weak reader.

The battery therefore layers the strongest decoders available and treats
"decodable" as "any of them reads the expected payload", in priority order:

1. **Apple Vision** (`VNDetectBarcodesRequest`, macOS only) — the iPhone
   camera's own detector lineage and by far the best phone proxy.
   **83/113** on real samples. Decodes in-memory from PNG bytes (~13 ms/call),
   so it can drive the robustness sweep.
2. **WeChat** (`cv2.wechat_qrcode`, OpenCV-contrib CNN detector + super-
   resolution, weights bundled in `models/`) — catches a few codes Vision
   misses; also the primary on non-macOS. **60/113** alone.
3. **zxing-cpp** (`zxingcpp.read_barcodes`) — fast ZXing-lineage final fallback.
   **16/113** alone.

Combined, the battery reads **89/113 (78%)** — within ~6 points of the phone.

`decode_text` returns the first hit in priority order. `primary_decoder` picks
the single strongest decoder that reads a given clean image; the robustness
sweep then uses that **one** decoder consistently for both the styled image and
its clean reference, so breaking points reflect a phone-grade reader rather than
the weakest one. `decode_battery` reports per-decoder results — decoder
*disagreement* is itself signal (only the strongest reads it ⇒ fragile).

**macOS dependency (accepted tradeoff):** Apple Vision is macOS-only. That is
fine for a prototype run on the user's Mac; on the Linux backend the battery
degrades to WeChat + zxing (60% decode). Re-examine at integration time.

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

`test_scorer.py` + `test_decoders.py` (pytest) generate deterministic fixtures
in-memory:
- A **plain unstyled QR** → must score in the Excellent band (~100).
- A **decodable-but-degraded QR** (blur 4 + contrast 0.4) → mid-band, with both
  methods registering real intermediate values. This is the product's core
  "scannable but slow" case the extreme fixtures miss.
- A **module-level-corrupted QR** (a contiguous region blanked beyond level-H's
  ~30% budget, destroying a finder pattern) → must score low (< 40). **Note:**
  per-*pixel* noise does **not** corrupt the code — each 10 px module stays
  mostly intact and a phone-grade decoder reads it fine. The original fixture
  flipped 18% of pixels and only scored low because the *weak* decoder failed;
  the rebuilt decoder correctly scores it ~100. Corruption must be at the module
  level to be real. (This was the clearest single confirmation of the thesis.)
- A **non-QR / pure-noise image** → must score 0 (no decode).
- Decoder coverage: each decoder round-trips a clean QR; the battery exposes
  `{vision, wechat, zxing}`; noise is rejected by all. Vision/WeChat tests skip
  when unavailable so the suite still passes on non-macOS.

These pin the scorer's calibration so it's actually checked, not assumed. Manual
validation: run against the user's `samples/` folder and confirm known-easy
codes outrank known-hard ones.

## Real-sample findings (113 real Q-Art codes)

| Decoder | Decodes | Note |
|---|---|---|
| Original (zxing + OpenCV) | 16 (14%) | the false-0 bug |
| WeChat kitchen-sink (all offline) | 68 (60%) | offline ceiling |
| Apple Vision alone | 83 (73%) | phone-grade |
| **Battery (Vision+WeChat+zxing)** | **89 (78%)** | shipped |
| User's phone (ground truth) | ~95 (84%) | — |

The residual gap is small and well-understood: ~8 codes the phone reads that even
Vision+WeChat miss (irreducible without the phone in the loop), and ~15 the phone
*also* can't read — those are legitimately unscannable (the art overrode the data
past ECC recovery), so a low score for them is correct.

## Open questions / future work (not this prototype)

- **Method A localization (top follow-up):** `cv2.QRCodeDetector.detect()` fails
  to localize nearly all *styled* QRs, so Method A returns `n/a` and the headline
  falls back to 100% Method B for most real codes. Vision and WeChat already
  return corner points during decode — feeding those into Method A (instead of
  the weak cv2 detector) would make the EC-margin estimate actually fire. Do this
  before any further Method A work.
- **Method A polarity-robustness:** Method A assumes dark-on-light polarity
  (Otsu + `dark = binar < 128`); a dark/colored-background QR could invert this.
  A polarity-agnostic match (compare the sampled grid against the ideal matrix
  *and its inverse*, take the better) fixes it cheaply. Lower priority than
  localization, since localization gates Method A entirely.
- Calibration of exact ladder steps/weights against a larger real sample now
  that the decoder is trustworthy. Open question: a Vision-robust code can still
  feel "slow" to a human (e.g. the bird-guitar code scores ~98 but was a
  phone-only recover) — worth checking whether the bands match felt effort.
- Whether to upgrade Method A to true codeword-level (ISO 15415) grading.
- Integration target if validated: post-generation gate vs. on-demand check vs.
  UI badge. Note the macOS/Vision dependency — the Linux backend would decode at
  ~60% (WeChat) unless a phone-grade detector is sourced for Linux.
