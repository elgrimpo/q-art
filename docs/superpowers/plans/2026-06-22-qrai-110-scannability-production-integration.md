# QRAI-110: QR Scannability Score — Production Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store a structural scannability score on every generated QR image and display it as a 5-level colored meter in the image detail sidebar.

**Architecture:** Copy the validated `structural_score.py` prototype into `api/utils/`, call it in the generate pipeline (non-fatal, via `asyncio.to_thread`), persist the score in MongoDB, backfill existing images via a one-off script, and render the score in `ImageSidebar` as a `ScannabilityBadge` component.

**Tech Stack:** Python / FastAPI / Motor (backend), React / MUI v5 / Next.js 14 (frontend), pytest / Jest + React Testing Library (tests).

## Global Constraints

- No new Python or npm dependencies — numpy, qrcode, Pillow already in `requirements.txt`; MUI already installed
- Scorer failure must never block image delivery — always non-fatal, log warning and continue with `None`
- `scannability_score` is `Optional[float]` — `None` means "not yet scored" (legacy images); no sentinel values
- Category thresholds: Excellent ≥ 85, Good 70–84, Fair 50–69, Poor 20–49, Unscannable < 20
- Category colors: Excellent `#4A8C5C`, Good `#8BC989`, Fair `#D4B44A`, Poor `#D97B7B`, Unscannable `#8B2020`
- Display: ImageSidebar only (not gallery cards)
- Run backend tests: `pytest api/tests/ -v` from `codebase/`
- Run frontend tests: `npm run test:frontend` from `codebase/`

---

### Task 1: Copy structural_score utility into api/utils/

**Files:**
- Create: `api/utils/structural_score.py` (copied verbatim from prototype)
- Modify: `api/tests/test_utils.py` (add smoke test)

**Interfaces:**
- Produces: `structural_score(img: PIL.Image.Image, payload: str) -> StructuralResult` where `StructuralResult.score: float` is the 0–100 headline score

- [ ] **Step 1: Copy the file**

```bash
cp "prototypes/qr-scannability/structural_score.py" "api/utils/structural_score.py"
```

- [ ] **Step 2: Write the smoke test**

Add to the bottom of `api/tests/test_utils.py`:

```python
# ---------------------------------------------------------------------------- #
#                          STRUCTURAL SCORE                                     #
# ---------------------------------------------------------------------------- #

from api.utils.structural_score import structural_score

class TestStructuralScore:
    def test_returns_score_for_plain_image(self):
        img = Image.new("RGB", (512, 512), "white")
        result = structural_score(img, "https://example.com")
        assert isinstance(result.score, float)
        assert 0.0 <= result.score <= 100.0

    def test_plain_qr_scores_high(self):
        import qrcode as qrcode_lib
        qr = qrcode_lib.QRCode(
            error_correction=qrcode_lib.constants.ERROR_CORRECT_H, border=4
        )
        qr.add_data("https://example.com")
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        result = structural_score(img, "https://example.com")
        assert result.score >= 80.0, f"Expected ≥80 for clean QR, got {result.score}"
```

- [ ] **Step 3: Run the tests**

```bash
pytest api/tests/test_utils.py -v -k "TestStructuralScore"
```

Expected: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add api/utils/structural_score.py api/tests/test_utils.py
git commit -m "feat(qrai-110): copy structural_score utility into api/utils"
```

---

### Task 2: Add scannability_score field to ImageDoc

**Files:**
- Modify: `api/schemas/schemas.py` (add one field)
- Modify: `api/tests/test_schema.py` (add assertion)

**Interfaces:**
- Consumes: `Optional` already imported from `typing` in `schemas.py`
- Produces: `ImageDoc.scannability_score: Optional[float]` defaulting to `None`

- [ ] **Step 1: Write the failing test**

Add to `api/tests/test_schema.py`:

```python
def test_image_doc_has_scannability_score():
    fields = ImageDoc.model_fields
    assert "scannability_score" in fields
    assert fields["scannability_score"].default is None
```

- [ ] **Step 2: Run to verify it fails**

```bash
pytest api/tests/test_schema.py::test_image_doc_has_scannability_score -v
```

Expected: FAIL with `AssertionError`.

- [ ] **Step 3: Add the field to ImageDoc**

In `api/schemas/schemas.py`, find the `ImageDoc` class. After the last field (`unlock_pending`), add:

```python
    scannability_score: Optional[float] = None
```

The full tail of `ImageDoc` will look like:

```python
    likes: Optional[List[Like]] = []
    unlocked: Optional[bool] = False
    unlock_pending: Optional[bool] = False
    scannability_score: Optional[float] = None
```

- [ ] **Step 4: Run all schema tests**

```bash
pytest api/tests/test_schema.py -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/schemas/schemas.py api/tests/test_schema.py
git commit -m "feat(qrai-110): add scannability_score field to ImageDoc"
```

---

### Task 3: Hook scorer into the generate pipeline

**Files:**
- Modify: `api/controllers/generate_controller.py`
- Modify: `api/tests/test_generate.py`

**Interfaces:**
- Consumes: `structural_score` from `api.utils.structural_score` (Task 1), `scannability_score` field in `ImageDoc` (Task 2)
- Produces: `predict()` now includes `scannability_score` in `updated_data` passed to `update_image()`

- [ ] **Step 1: Add autouse fixture and write two new failing tests**

In `api/tests/test_generate.py`, add a fixture and two new tests. Add the fixture immediately after the existing imports block (after line 14):

```python
import pytest
from unittest.mock import MagicMock

@pytest.fixture(autouse=True)
def mock_structural_score():
    """Patch the scorer for all generate tests. Tests can mutate the mock to
    test failure cases — e.g. mock_structural_score.side_effect = RuntimeError()."""
    result = MagicMock()
    result.score = 75.0
    with patch(
        "api.controllers.generate_controller.structural_score",
        return_value=result,
    ) as m:
        yield m
```

Note: `pytest` and `MagicMock` may already be imported — check and skip duplicate imports.

Then add the two new tests at the bottom of the file:

```python
@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_generate_stores_scannability_score(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """scannability_score must be passed to update_image alongside the S3 URLs."""
    _, mocks = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )
    call_args = mocks["update"].call_args
    update_data = call_args[0][1]  # second positional arg is the update dict
    assert "scannability_score" in update_data
    assert update_data["scannability_score"] == 75.0


@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
async def test_scorer_failure_does_not_block_generation(
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
    mock_structural_score,  # inject autouse fixture to override it
):
    """If the scorer raises, predict() must still succeed with scannability_score=None."""
    mock_structural_score.side_effect = RuntimeError("scorer exploded")
    result, mocks = await _run_predict(
        mock_novita_client, mock_download, mock_create_watermark,
        mock_create_doc, mock_upload, mock_update, mock_increment,
    )
    assert result is not None  # generation succeeded
    call_args = mocks["update"].call_args
    update_data = call_args[0][1]
    assert update_data.get("scannability_score") is None
```

- [ ] **Step 2: Run to verify the two new tests fail**

```bash
pytest api/tests/test_generate.py::test_generate_stores_scannability_score api/tests/test_generate.py::test_scorer_failure_does_not_block_generation -v
```

Expected: both FAIL (ImportError or AssertionError — `structural_score` not imported yet in controller).

- [ ] **Step 3: Update generate_controller.py**

At the top of `api/controllers/generate_controller.py`, add the import after the existing app imports block:

```python
from api.utils.structural_score import structural_score
```

Then in `predict()`, find this line (around line 168):

```python
            generated_image = Image.open(BytesIO(image_bytes))
```

Immediately after it, add:

```python
            # Score the styled image structurally. Non-fatal — a failure must
            # never block delivery.
            try:
                score_result = await asyncio.to_thread(
                    structural_score, generated_image, website
                )
                scannability_score = score_result.score
            except Exception:
                logger.warning("Scannability scoring failed", exc_info=True)
                scannability_score = None
```

Then find the `updated_data` dict (around line 205) and add the score:

```python
            updated_data = {
                "image_url": original_image_url,
                "watermarked_image_url": watermarked_image_url,
                "scannability_score": scannability_score,
            }
```

- [ ] **Step 4: Run all generate tests**

```bash
pytest api/tests/test_generate.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full backend test suite**

```bash
pytest api/tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/test_generate.py
git commit -m "feat(qrai-110): call structural scorer in generate pipeline, store score"
```

---

### Task 4: Create backfill script

**Files:**
- Create: `api/scripts/backfill_scannability.py`

**Interfaces:**
- Consumes: `structural_score` from `api.utils.structural_score`, MongoDB `images` collection (fields: `_id`, `content`, `image_url`, `scannability_score`)

- [ ] **Step 1: Create the script**

Create `api/scripts/backfill_scannability.py` with the following content:

```python
"""One-off script: compute and store scannability_score for all images that
don't have one yet.

Run from the repo root:
    python -m api.scripts.backfill_scannability

Requires MONGO_URL in the environment (sourced from .env automatically).
Skips docs where image_url is missing or the download fails.
"""
import asyncio
import logging
from io import BytesIO

import certifi
import httpx
import motor.motor_asyncio as motor
from dotenv import load_dotenv
from PIL import Image
import os

from api.utils.structural_score import structural_score

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MONGO_URL = os.environ["MONGO_URL"]
TIMEOUT = httpx.Timeout(30.0, connect=10.0)


async def main():
    tls = {"tlsCAFile": certifi.where()} if "localhost" not in MONGO_URL else {}
    client = motor.AsyncIOMotorClient(MONGO_URL, **tls)
    images = client.get_database("QART").get_collection("images")

    query = {"scannability_score": {"$exists": False}}
    total = await images.count_documents(query)
    logger.info("Found %d images to backfill", total)

    processed = 0
    failed = 0

    async with httpx.AsyncClient(timeout=TIMEOUT) as http:
        async for doc in images.find(query):
            doc_id = doc["_id"]
            image_url = doc.get("image_url")
            payload = doc.get("content")

            if not image_url or not payload:
                logger.warning("[%s] skipping — missing image_url or content", doc_id)
                failed += 1
                continue

            try:
                resp = await http.get(image_url)
                resp.raise_for_status()
                img = Image.open(BytesIO(resp.content))
                result = structural_score(img, payload)
                await images.update_one(
                    {"_id": doc_id},
                    {"$set": {"scannability_score": result.score}},
                )
                processed += 1
                logger.info(
                    "[%d/%d] %s → %.1f", processed, total, doc_id, result.score
                )
            except Exception:
                logger.warning("[%s] failed", doc_id, exc_info=True)
                failed += 1

    client.close()
    logger.info("Done. processed=%d failed=%d", processed, failed)


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Verify the script is importable**

```bash
python -c "import api.scripts.backfill_scannability"
```

Expected: no output, no errors.

- [ ] **Step 3: Dry-run check (optional but recommended)**

Before running against production data, verify the query returns the expected count:

```python
# Run this in a Python REPL with .env loaded
import asyncio, certifi, os, motor.motor_asyncio as motor
from dotenv import load_dotenv
load_dotenv()
url = os.environ["MONGO_URL"]
tls = {"tlsCAFile": certifi.where()} if "localhost" not in url else {}
client = motor.AsyncIOMotorClient(url, **tls)
images = client.QART.images
print(asyncio.run(images.count_documents({"scannability_score": {"$exists": False}})))
```

- [ ] **Step 4: Commit**

```bash
git add api/scripts/backfill_scannability.py
git commit -m "feat(qrai-110): add backfill script to score existing images"
```

---

### Task 5: Create ScannabilityBadge component

**Files:**
- Create: `src/_components/ScannabilityBadge.js`
- Create: `src/__tests__/ScannabilityBadge.test.js`

**Interfaces:**
- Produces: `<ScannabilityBadge score={number | null} />` — renders nothing when `score` is `null`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ScannabilityBadge.test.js`:

```javascript
import React from 'react'
import { render, screen } from '@testing-library/react'
import ScannabilityBadge from '../_components/ScannabilityBadge'

describe('ScannabilityBadge', () => {
  test('renders nothing when score is null', () => {
    const { container } = render(<ScannabilityBadge score={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when score is undefined', () => {
    const { container } = render(<ScannabilityBadge score={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  test('shows "Excellent" for score 90', () => {
    render(<ScannabilityBadge score={90} />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  test('shows "Good" for score 75', () => {
    render(<ScannabilityBadge score={75} />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  test('shows "Fair" for score 60', () => {
    render(<ScannabilityBadge score={60} />)
    expect(screen.getByText('Fair')).toBeInTheDocument()
  })

  test('shows "Poor" for score 35', () => {
    render(<ScannabilityBadge score={35} />)
    expect(screen.getByText('Poor')).toBeInTheDocument()
  })

  test('shows "Unscannable" for score 10', () => {
    render(<ScannabilityBadge score={10} />)
    expect(screen.getByText('Unscannable')).toBeInTheDocument()
  })

  test('shows "Unscannable" for score 0', () => {
    render(<ScannabilityBadge score={0} />)
    expect(screen.getByText('Unscannable')).toBeInTheDocument()
  })

  test('shows "Good" at the boundary score 70', () => {
    render(<ScannabilityBadge score={70} />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  test('shows "Excellent" at the boundary score 85', () => {
    render(<ScannabilityBadge score={85} />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  test('renders 5 squares', () => {
    const { container } = render(<ScannabilityBadge score={75} />)
    // Each square has data-testid="score-square"
    const squares = container.querySelectorAll('[data-testid="score-square"]')
    expect(squares).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:frontend -- --testPathPattern=ScannabilityBadge --watchAll=false
```

Expected: all tests FAIL (module not found).

- [ ] **Step 3: Create the component**

Create `src/_components/ScannabilityBadge.js`:

```javascript
import React from 'react'
import { Box, Typography, Stack } from '@mui/material'

function getCategory(score) {
  if (score >= 85) return { label: 'Excellent', color: '#4A8C5C', level: 5 }
  if (score >= 70) return { label: 'Good',       color: '#8BC989', level: 4 }
  if (score >= 50) return { label: 'Fair',        color: '#D4B44A', level: 3 }
  if (score >= 20) return { label: 'Poor',        color: '#D97B7B', level: 2 }
  return             { label: 'Unscannable',   color: '#8B2020', level: 1 }
}

export default function ScannabilityBadge({ score }) {
  if (score == null) return null

  const { label, color, level } = getCategory(score)

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Box
            key={i}
            data-testid="score-square"
            sx={{
              width: 36,
              height: 22,
              borderRadius: 1,
              backgroundColor: i < level ? color : '#CCCCCC',
            }}
          />
        ))}
      </Stack>
      <Typography
        variant="caption"
        sx={{ color, fontWeight: 700, display: 'block' }}
      >
        {label}
      </Typography>
    </Box>
  )
}
```

- [ ] **Step 4: Run the tests**

```bash
npm run test:frontend -- --testPathPattern=ScannabilityBadge --watchAll=false
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/_components/ScannabilityBadge.js src/__tests__/ScannabilityBadge.test.js
git commit -m "feat(qrai-110): add ScannabilityBadge component"
```

---

### Task 6: Integrate ScannabilityBadge into ImageSidebar

**Files:**
- Modify: `src/app/images/[imageId]/ImageSidebar.js`
- Modify: `src/__tests__/ImageSidebar.test.js`

**Interfaces:**
- Consumes: `ScannabilityBadge` from `src/_components/ScannabilityBadge.js` (Task 5)
- Consumes: `currentImage.scannability_score` — `number | null | undefined`

- [ ] **Step 1: Write new failing tests**

In `src/__tests__/ImageSidebar.test.js`, add a mock for `ScannabilityBadge` alongside the existing mocks (after the `GuestSignupPrompt` mock line):

```javascript
jest.mock('@/_components/ScannabilityBadge', () => ({
  __esModule: true,
  default: ({ score }) => score != null ? <div data-testid="scannability-badge">{score}</div> : null,
}))
```

Then add new tests at the bottom of the file (after the existing `describe` blocks):

```javascript
describe('ScannabilityBadge integration', () => {
  test('shows scannability section when image has a score', async () => {
    setSearch('')
    const imageWithScore = { ...IMAGE, scannability_score: 78 }
    await act(async () => {
      render(<ImageSidebar image={imageWithScore} user={USER} customDeleteAction={jest.fn()} />)
    })
    expect(screen.getByText('Scannability')).toBeInTheDocument()
    expect(screen.getByTestId('scannability-badge')).toBeInTheDocument()
  })

  test('hides scannability section when image has no score', async () => {
    setSearch('')
    await act(async () => {
      render(<ImageSidebar image={IMAGE} user={USER} customDeleteAction={jest.fn()} />)
    })
    expect(screen.queryByText('Scannability')).not.toBeInTheDocument()
    expect(screen.queryByTestId('scannability-badge')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test:frontend -- --testPathPattern=ImageSidebar --watchAll=false
```

Expected: the two new tests FAIL.

- [ ] **Step 3: Update ImageSidebar.js**

At the top of `src/app/images/[imageId]/ImageSidebar.js`, add the import after the existing app imports:

```javascript
import ScannabilityBadge from '@/_components/ScannabilityBadge'
```

Then in the JSX, find the `{/* -------------------------------- METADATA -------------------------------- */}` comment block. Inside the `<div style={{ maxHeight: "100%" }}>`, locate the line with `<Typography variant="h5" align={...}>Image Details</Typography>`. Insert the following block immediately **before** it:

```javascript
        {/* ----------------------------- SCANNABILITY ----------------------------- */}
        {currentImage?.scannability_score != null && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" align={isMobile ? "center" : "left"} sx={{ mb: 1 }}>
              Scannability
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <ScannabilityBadge score={currentImage.scannability_score} />
            </Box>
          </Box>
        )}
```

- [ ] **Step 4: Run all ImageSidebar tests**

```bash
npm run test:frontend -- --testPathPattern=ImageSidebar --watchAll=false
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full frontend test suite**

```bash
npm run test:frontend -- --watchAll=false
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/images/[imageId]/ImageSidebar.js src/__tests__/ImageSidebar.test.js
git commit -m "feat(qrai-110): show scannability score in image detail sidebar"
```

---

## After all tasks: run the backfill

Once all tasks are committed and deployed, score existing images:

```bash
python -m api.scripts.backfill_scannability
```

Watch the logs for any failures. Expected output format:

```
INFO Found 113 images to backfill
INFO [1/113] 64a3f1... → 82.4
INFO [2/113] 64a3f2... → 67.1
...
INFO Done. processed=110 failed=3
```
