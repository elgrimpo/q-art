# QRAI-110: QR Scannability Score — Production Integration Design

**Date:** 2026-06-22
**Status:** Design approved, pending implementation
**Author:** Christoph + Claude
**Builds on:** `docs/superpowers/specs/2026-06-22-qr-structural-score-design.md` (structural scorer prototype)

---

## Problem

Q-Art generates AI-styled QR codes, some of which are harder to scan than others.
The structural scannability scorer has been validated in a prototype and is ready
to be integrated into the production app. Users have no current way to know whether
their generated code will scan easily or struggle.

---

## Scope

### In scope

- Copy the validated `structural_score.py` into `api/utils/`
- Call the scorer on every newly generated image; store the score in MongoDB
- Display the score in the image detail sidebar (`ImageSidebar.js`)
- One-off backfill script to score all existing images

### Out of scope

- Displaying the score on gallery cards (`ImagesCard.js`) — sidebar only for now
- Storing sub-metrics (finder, contrast, margin, min_modules) — score only
- Using the score as a generation gate or download condition
- Score-based retries or regeneration suggestions
- Calibration tuning of blend weights

---

## Category thresholds

| Category | Score range | Display color |
|---|---|---|
| Excellent | ≥ 85 | #4A8C5C (dark green) |
| Good | 70–84 | #8BC989 (light green) |
| Fair | 50–69 | #D4B44A (yellow/gold) |
| Poor | 20–49 | #D97B7B (salmon) |
| Unscannable | < 20 | #8B2020 (dark red) |

---

## Architecture

### 1. Backend — scorer utility

Copy `prototypes/qr-scannability/structural_score.py` verbatim into
`api/utils/structural_score.py`. No dependency changes — numpy, qrcode, and
Pillow are already in `requirements.txt`.

### 2. Backend — ImageDoc schema

Add one optional field to `ImageDoc` in `api/schemas/schemas.py`:

```python
scannability_score: Optional[float] = None
```

No sub-metrics stored. `None` means "not yet scored" (legacy images).

### 3. Backend — generate pipeline hook

In `api/controllers/generate_controller.py`, inside `predict()`, after:

```python
generated_image = Image.open(BytesIO(image_bytes))
```

Add:

```python
try:
    score_result = await asyncio.to_thread(
        structural_score, generated_image, website
    )
    scannability_score = score_result.score
except Exception:
    logger.warning("Scannability scoring failed", exc_info=True)
    scannability_score = None
```

Then include `scannability_score` in the existing `updated_data` dict that is
passed to `update_image()` alongside the S3 URLs. No extra DB round-trip.

Scoring failure is non-fatal — a warning is logged and `scannability_score`
stays `None`. Image delivery is never blocked.

### 4. Backfill script

`api/scripts/backfill_scannability.py` — a standalone async script:

1. Query MongoDB `images` collection for all docs where `scannability_score`
   field does not exist: `{"scannability_score": {"$exists": False}}`
2. For each doc, download the original image from `doc["image_url"]` using
   `httpx` (with a reasonable timeout)
3. Run `structural_score(image, doc["content"])` — `content` is the QR payload
   already stored in every `ImageDoc`
4. Update the doc: `$set: {"scannability_score": result.score}`
5. Log progress per image (index, image id, score or error); skip and continue
   on download or scoring failure

Run from the repo root: `python -m api.scripts.backfill_scannability`

Sequential processing is fine — the image set is small.

### 5. Frontend — ScannabilityBadge component

New shared component `src/_components/ScannabilityBadge.js`:

**Props:** `score` (number | null)

**Renders:**
- A row of 5 squares — N filled in the category color, remainder gray
- Category label as a text caption below the squares, in the same color
- Level mapping: Unscannable=1 filled, Poor=2, Fair=3, Good=4, Excellent=5
- If `score` is `null` (legacy image), renders nothing

Category resolution and color mapping are defined as constants inside the
component, keyed on the thresholds table above.

### 6. Frontend — ImageSidebar integration

In `src/app/images/[imageId]/ImageSidebar.js`, add a dedicated "Scannability"
section above the existing "Image Details" section.

Layout (within the sidebar's scrollable Box):

```
[Scannability heading — Typography variant="h5"]
[ScannabilityBadge score={currentImage?.scannability_score} ]

[Image Details heading — Typography variant="h5"]   ← existing
[List of metadata rows]                             ← existing
```

The section is only visible when `currentImage?.scannability_score != null`,
so legacy images without a score show no section (no "not scored" placeholder).

---

## Data flow summary

```
predict() call
  → QR generated, image downloaded from Novita
  → structural_score(image, website) via asyncio.to_thread
  → scannability_score stored in updated_data
  → update_image() writes score + S3 URLs to MongoDB in one call
  → updated_image returned to frontend (includes scannability_score)

ImageSidebar
  → receives image object (already has scannability_score)
  → renders ScannabilityBadge above Image Details
```

---

## Testing

- `ScannabilityBadge` renders each of the 5 categories correctly and renders
  nothing for `null`
- Category threshold function is a pure function — unit-testable
- Backfill script: verify against one known image manually after running

No changes to existing generate-flow tests are required (scorer failure is
swallowed and does not alter the response shape).
