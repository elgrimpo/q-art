# Scannability review tool — design

**Date:** 2026-06-23
**Status:** Approved (chat), pending build
**Goal:** Collect Christoph's own human ratings of QR-art images alongside the
algorithm's `scannability_score`, offline, so we can iterate on the structural
scoring algorithm (QRAI-110) by comparing human judgment vs algo output.

## Overview

Two parts: a one-off Python generator script and the self-contained HTML page it
produces. No server, no backend writes — the page runs entirely in the browser
and exports the collected ratings as JSON.

## 1. Generator script — `api/scripts/build_scannability_review.py`

- Mirrors `api/scripts/backfill_scannability.py` for the Mongo connection:
  `load_dotenv()`, `MONGO_URL`, TLS via `certifi` (skipped for localhost),
  `client.get_database("QART").get_collection("images")`.
- Query: `{"scannability_score": {"$exists": True}}`.
- Projection: `_id`, `image_url`, `scannability_score`, `prompt`.
- Sort: `scannability_score` ascending, so the algo's low→high spread is visible
  while scrolling.
- Serializes each doc to `{ image_id, image_url, algo_score, prompt }` and embeds
  the array as JSON into an HTML template.
- Writes the result to `api/scripts/scannability_review.html`.
- Run with: `python -m api.scripts.build_scannability_review`.
- Logs the count written; exits cleanly if zero scored images found.

## 2. The HTML page — `api/scripts/scannability_review.html` (generated)

Self-contained: one HTML file, inline CSS + JS, embedded data array. No build
step, no network except loading the images from S3.

- **Per image card:** the original image (`image_url`, not watermarked), an
  **algo-score badge**, and the prompt as a caption.
- **Rating control:** 1–5 buttons under each image; the selected value
  highlights.
- **Persistence:** ratings auto-save to `localStorage` keyed by `image_id`, so a
  refresh or tab close doesn't lose work. On load, previously saved ratings
  rehydrate the buttons.
- **Sticky header:** progress counter (`N / total rated`) and a **Download JSON**
  button.
- **Export:** `Download JSON` downloads an array of
  `{ image_id, algo_score, my_rating, prompt }` for the rated images only,
  filename `scannability-ratings.json`.

## Out of scope (YAGNI)

- No scan-test/decode toggle — 1–5 visual guess only.
- No CSV export — JSON only.
- No backend persistence of ratings — export-only, fully offline.

## Notes / constraints

- Page must be online to load images from S3.
- Uses `image_url` (original), since watermark doesn't affect a scannability
  judgment.
- Generator is a one-off maintenance script under `api/scripts/`; not wired into
  the request path (per `api/CLAUDE.md`).
