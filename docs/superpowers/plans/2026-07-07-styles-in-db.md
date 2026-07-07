# Styles Move to the DB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move style presets (prompt, LoRAs, style_modifier, sd_model) into a new Mongo `styles` collection, resolved server-side by `style_id` during generation, so the frontend only ever holds `{id, title, image_url}` per style — and remove the unused `keywords` field plus dead code that references it.

**Architecture:** A new `styles` Mongo collection + `Style`/`StyleLora` Pydantic schemas + a `styles_controller.get_style()` lookup replace the client-supplied `sd_model`/`style_prompt`/`style_title`/`style_loras`/`style_modifier` query params on `/api/generate/start` with a single trusted `style_id` lookup. `ImageDoc` gains a persisted `style_id`. The frontend's `ImageStyles.js` shrinks to `{id, title, image_url}` plus a `RANDOM_STYLE_ID` sentinel, and every place that used to plumb `style_prompt`/`loras`/`sd_model`/`style_modifier` around (`store.js`, `StylesModal`, `GenerateForm`, `IteratePanel`, `ImagesUtils.startGeneration`, `CopyButton`) drops those fields.

**Tech Stack:** FastAPI + Motor (async MongoDB) on the backend; Next.js 14 + Zustand on the frontend; pytest (backend) / Jest (frontend) for tests.

## Global Constraints

- Full design spec: `docs/superpowers/specs/2026-07-07-styles-in-db-design.md` — every task below implements a section of it.
- Style IDs are Mongo-generated `ObjectId`s (stringified), matching the `images`/`users` convention.
- The "Random" entry stays frontend-only (never migrated into the DB) and uses the string sentinel `RANDOM_STYLE_ID = "random"`, not the old numeric `1`.
- No public `GET /api/styles` endpoint, no admin UI, no backfill of `style_id` onto pre-existing `ImageDoc`s, no enforcement of `is_active` at generation time — all out of scope per the spec.
- The seed script (Task 8) writes to the **live production** Mongo Atlas DB when actually run (Task 9) — that run requires explicit user confirmation at execution time, not automatic execution.

---

## Task 1: `Style`/`StyleLora` schemas + `ImageDoc.style_id`

**Files:**
- Modify: `api/schemas/schemas.py:60-104`
- Modify: `api/tests/test_schema.py`

**Interfaces:**
- Produces: `Style` (fields: `id: Optional[str]` via alias `_id`, `style_key: str`, `version: int`, `is_active: bool`, `title: str`, `prompt: str`, `loras: List[StyleLora]`, `style_modifier: float`, `sd_model: str`) and `StyleLora` (fields: `model_name: str`, `strength: float`) — both imported by Task 2's `styles_controller.py`.
- Produces: `ImageDoc.style_id: Optional[str] = None` — consumed by Task 4's `prepare_doc()`.

- [ ] **Step 1: Write the failing schema tests**

Add to the end of `api/tests/test_schema.py`:

```python
def test_image_doc_has_style_id():
    fields = ImageDoc.model_fields
    assert "style_id" in fields
    assert fields["style_id"].default is None


def test_style_schema_has_expected_fields():
    from api.schemas.schemas import Style

    fields = Style.model_fields
    for name in ("style_key", "version", "is_active", "title", "prompt", "loras", "style_modifier", "sd_model"):
        assert name in fields
    assert fields["is_active"].default is True


def test_style_lora_schema_has_model_name_and_strength():
    from api.schemas.schemas import StyleLora

    fields = StyleLora.model_fields
    assert "model_name" in fields
    assert "strength" in fields


def test_style_parses_a_mongo_style_doc():
    from api.schemas.schemas import Style

    doc = {
        "_id": "507f1f77bcf86cd799439099",
        "style_key": "ukiyo-e",
        "version": 1,
        "is_active": True,
        "title": "Ukiyo-e",
        "prompt": "ukiyo-e, woodblock print",
        "loras": [{"model_name": "LAS_17554", "strength": 0.7}],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    }
    style = Style(**doc)
    assert style.id == "507f1f77bcf86cd799439099"
    assert style.loras[0].model_name == "LAS_17554"
    assert style.loras[0].strength == 0.7
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "api" && venv/bin/pytest tests/test_schema.py -v`
Expected: FAIL — `ImportError: cannot import name 'Style'` / `AssertionError: 'style_id' not in fields`

- [ ] **Step 3: Add the schemas**

In `api/schemas/schemas.py`, add right after the `ControlNet` class (currently lines 64-70) and before `class Like`:

```python
class StyleLora(BaseModel):
    model_name: str
    strength: float


class Style(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    style_key: str
    version: int = 1
    is_active: bool = True
    title: str
    prompt: str
    loras: List[StyleLora] = []
    style_modifier: float = 0
    sd_model: str
```

Then add `style_id` to `ImageDoc`, right after the existing `style_prompt` line:

```python
    style_title: Optional[str] = "Default"
    style_prompt: Optional[str] = None
    style_id: Optional[str] = None
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_schema.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add api/schemas/schemas.py api/tests/test_schema.py
git commit -m "feat: add Style/StyleLora schemas and ImageDoc.style_id"
```

---

## Task 2: `styles_controller.get_style()`

**Files:**
- Create: `api/controllers/styles_controller.py`
- Create: `api/tests/test_styles_controller.py`

**Interfaces:**
- Consumes: `Style`, `StyleLora` from Task 1.
- Produces: `async def get_style(style_id: str) -> Style` — raises `HTTPException(400)` for a malformed id, `HTTPException(404)` if not found. Consumed by Task 6's `main.py` endpoint.

- [ ] **Step 1: Write the failing tests**

Create `api/tests/test_styles_controller.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from bson import ObjectId
from fastapi import HTTPException

from api.controllers.styles_controller import get_style

FAKE_STYLE_ID = "507f1f77bcf86cd799439099"

FAKE_STYLE_DOC = {
    "_id": ObjectId(FAKE_STYLE_ID),
    "style_key": "ukiyo-e",
    "version": 1,
    "is_active": True,
    "title": "Ukiyo-e",
    "prompt": "ukiyo-e, woodblock print",
    "loras": [{"model_name": "LAS_17554", "strength": 0.7}],
    "style_modifier": -1,
    "sd_model": "colorful_v31_62333.safetensors",
}


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_returns_resolved_style(mock_find_one):
    mock_find_one.return_value = FAKE_STYLE_DOC
    style = await get_style(FAKE_STYLE_ID)
    assert style.title == "Ukiyo-e"
    assert style.id == FAKE_STYLE_ID
    assert style.loras[0].model_name == "LAS_17554"
    assert style.loras[0].strength == 0.7
    assert style.sd_model == "colorful_v31_62333.safetensors"


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_looks_up_by_object_id(mock_find_one):
    mock_find_one.return_value = FAKE_STYLE_DOC
    await get_style(FAKE_STYLE_ID)
    mock_find_one.assert_awaited_once_with({"_id": ObjectId(FAKE_STYLE_ID)})


@patch("api.controllers.styles_controller.styles.find_one", new_callable=AsyncMock)
async def test_get_style_raises_404_when_missing(mock_find_one):
    mock_find_one.return_value = None
    with pytest.raises(HTTPException) as exc_info:
        await get_style(FAKE_STYLE_ID)
    assert exc_info.value.status_code == 404


async def test_get_style_raises_400_for_malformed_id():
    with pytest.raises(HTTPException) as exc_info:
        await get_style("not-a-valid-object-id")
    assert exc_info.value.status_code == 400
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "api" && venv/bin/pytest tests/test_styles_controller.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.controllers.styles_controller'`

- [ ] **Step 3: Write the controller**

Create `api/controllers/styles_controller.py`:

```python
# Libraries Import
import os
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
import motor.motor_asyncio as motor
import certifi

# App imports
from api.schemas.schemas import Style

# ---------------------------- INITIALIZE CLIENTS ---------------------------- #

mongo_url = os.environ["MONGO_URL"]
_tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
client = motor.AsyncIOMotorClient(mongo_url, **_tls)
db = client.get_database("QART")
styles = db.get_collection("styles")


# ---------------------------------------------------------------------------- #
#                                  GET STYLE                                    #
# ---------------------------------------------------------------------------- #


async def get_style(style_id: str) -> Style:
    """Look up a style by its Mongo _id. Called by the /api/generate/start
    endpoint before creating a generation job, so an invalid or missing
    style_id fails fast with a clean HTTP error instead of surfacing only
    as an async job failure."""
    try:
        object_id = ObjectId(style_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid style_id")

    doc = await styles.find_one({"_id": object_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Style not found")

    return Style(**doc)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_styles_controller.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add api/controllers/styles_controller.py api/tests/test_styles_controller.py
git commit -m "feat: add styles_controller.get_style() DB lookup"
```

---

## Task 3: Remove `parse_style_loras`

**Files:**
- Modify: `api/utils/utils.py:1-107`
- Modify: `api/tests/test_utils.py:1-16,168-238`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — this is a pure removal. `prepare_img2img_request` (unchanged signature) still consumed by Task 5.

- [ ] **Step 1: Delete `TestParseStyleLoras` and its now-unused import**

In `api/tests/test_utils.py`, remove `parse_style_loras` from the import block (lines 6-14):

```python
from api.utils.utils import (
    parse_seed,
    prepare_img2img_request,
    createImagesFilterQuery,
    create_watermark,
    SHORT_PROMPT_THRESHOLD,
    QUALITY_SUFFIX,
)
from novita_client import Img2V3ImgLoRA
```

Delete the entire `TestParseStyleLoras` class (currently lines 170-237, right before the `CREATE IMAGES FILTER QUERY` section header) — every test in it exercises code being deleted in Step 3.

- [ ] **Step 2: Run the full utils test file to confirm the deleted tests are gone and nothing else broke**

Run: `cd "api" && venv/bin/pytest tests/test_utils.py -v`
Expected: FAIL — `ImportError: cannot import name 'parse_style_loras'` (the source function still exists; this is expected until Step 3)

- [ ] **Step 3: Remove `parse_style_loras` from `api/utils/utils.py`**

Remove the unused `import json` (line 5).

Remove the entire `PARSE STYLE LORAS` section (the header comment, the `MAX_STYLE_LORAS`/`LORA_STRENGTH_MIN`/`LORA_STRENGTH_MAX`/`MAX_LORA_NAME_LEN` constants, and the `parse_style_loras` function — currently lines 56-107), leaving `parse_seed` followed directly by the `PREPARE IMG2IMG REQUEST` section.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_utils.py -v`
Expected: PASS (all remaining tests; `TestParseStyleLoras` no longer exists)

- [ ] **Step 5: Commit**

```bash
git add api/utils/utils.py api/tests/test_utils.py
git commit -m "refactor: remove parse_style_loras now that styles are DB-resolved"
```

---

## Task 4: `prepare_doc()` / `create_image_doc()` gain `style_id`

**Files:**
- Modify: `api/utils/utils.py` (`prepare_doc`, currently lines 212-263)
- Modify: `api/controllers/images_controller.py:53-68`
- Modify: `api/tests/test_utils.py` (add `TestPrepareDoc`)

**Interfaces:**
- Consumes: `ImageDoc.style_id` from Task 1.
- Produces: `prepare_doc(req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id=None) -> ImageDoc` and `create_image_doc(req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id=None) -> str` (both `style_id` params appended last, positionally, so existing positional-arg assertions in Task 5's `test_generate.py` don't shift). Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Add to `api/tests/test_utils.py`, after `TestPrepareImg2ImgRequest` and before `TestCreateImagesFilterQuery`:

```python
# ---------------------------------------------------------------------------- #
#                                PREPARE DOC                                    #
# ---------------------------------------------------------------------------- #

from api.utils.utils import prepare_doc


class TestPrepareDoc:
    def _req(self):
        return prepare_img2img_request(
            prompt="a dragon",
            negative_prompt="ugly",
            sd_model="sd-v1-5",
            seed=42,
            image_base64_str="base64string==",
            qr_weight=0,
            style_prompt=", cinematic",
        )

    def test_style_id_is_stored_on_the_doc(self):
        doc = prepare_doc(
            self._req(), 42, "https://example.com", 0, "user_1", "a dragon",
            ", cinematic", "Cinematic", style_id="507f1f77bcf86cd799439099",
        )
        assert doc.style_id == "507f1f77bcf86cd799439099"

    def test_style_id_defaults_to_none(self):
        doc = prepare_doc(
            self._req(), 42, "https://example.com", 0, "user_1", "a dragon",
            ", cinematic", "Cinematic",
        )
        assert doc.style_id is None
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "api" && venv/bin/pytest tests/test_utils.py::TestPrepareDoc -v`
Expected: FAIL — `TypeError: prepare_doc() got an unexpected keyword argument 'style_id'`

- [ ] **Step 3: Update `prepare_doc()` in `api/utils/utils.py`**

Change the signature and the `ImageDoc(...)` construction:

```python
def prepare_doc(
    req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id=None
):
    model_0 = req["controlnet_units"][0].model_name

    doc = ImageDoc(
        user_id=user_id,
        created_at=datetime.utcnow(),
        prompt=prompt,
        negative_prompt=req["negative_prompt"],
        style_title=style_title,
        style_prompt=style_prompt,
        style_id=style_id,
        content=website,
        sd_model=req["model_name"],
        seed=seed,
        qr_weight=qr_weight,
        width=req["width"],
        height=req["height"],
        query_type="txt2img",
        steps=req["steps"],
        controlnet0=ControlNet(
            model=model_0,
            weight=req["controlnet_units"][0].strength,
            guidance_start=req["controlnet_units"][0].guidance_start,
            guidance_end=req["controlnet_units"][0].guidance_end,
        ),
    )
    return doc
```

(Only the signature and the added `style_id=style_id` line change — the commented-out block in the middle is pre-existing dead code, leave it untouched.)

- [ ] **Step 4: Update `create_image_doc()` in `api/controllers/images_controller.py:53-68`**

```python
async def create_image_doc(req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id=None):
    try:
        # Prepare the document
        doc = prepare_doc(
            req, seed, website, qr_weight, user_id, prompt, style_prompt, style_title, style_id
        )

        # Insert image document into MongoDB
        result = await db["images"].insert_one(doc.dict())

        # Return the inserted image ID
        return str(result.inserted_id)

    except Exception:
        logger.error("Error in create_image_doc", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_utils.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/utils/utils.py api/controllers/images_controller.py api/tests/test_utils.py
git commit -m "feat: persist style_id on prepare_doc/create_image_doc"
```

---

## Task 5: `predict()` / `start_generation()` take a resolved style

**Files:**
- Modify: `api/controllers/generate_controller.py:23-34,203-216,251-263,377-388,453-476`
- Modify: `api/tests/test_generate.py:1-14,38-48,391-418`

**Interfaces:**
- Consumes: `create_image_doc(..., style_id=None)` from Task 4.
- Produces: `predict(job_id, prompt, website, negative_prompt, seed, sd_model, user_id, style_id, style_title, style_prompt, loras, qr_weight=0, style_modifier=0)` and `start_generation(...)` with the same new parameter list (`loras` is now a pre-resolved `list[Img2V3ImgLoRA]`, not a JSON string). Consumed by Task 6's `main.py`.

- [ ] **Step 1: Update the test fixtures and imports first (still calling the old signature — this step intentionally makes tests fail on the new kwargs)**

In `api/tests/test_generate.py`, remove the now-unused `parse_style_loras`-adjacent import — there is none to remove here (the test file didn't import it directly), so only update `PREDICT_KWARGS` (lines 38-48):

```python
PREDICT_KWARGS = dict(
    job_id="test-job-1",
    prompt="a dragon",
    website="https://example.com",
    negative_prompt="ugly blurry",
    seed=42,
    sd_model="sd-v1-5",
    user_id=FAKE_IMAGE_ID,
    style_id="507f1f77bcf86cd799439099",
    style_title="Cinematic",
    style_prompt=", cinematic",
    loras=[],
)
```

Replace `test_predict_passes_parsed_loras_to_request_builder` (lines 390-418) with:

```python
@patch("api.controllers.generate_controller.increment_user_count", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.update_image", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.upload_image_to_s3", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_image_doc", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.create_watermark")
@patch("api.controllers.generate_controller.download_image_bytes", new_callable=AsyncMock)
@patch("api.controllers.generate_controller.client")
@patch("api.controllers.generate_controller.prepare_img2img_request")
async def test_predict_passes_loras_straight_to_request_builder(
    mock_prepare,
    mock_novita_client,
    mock_download,
    mock_create_watermark,
    mock_create_doc,
    mock_upload,
    mock_update,
    mock_increment,
):
    """predict() must pass the already-resolved style loras straight through
    to the request builder — no parsing/JSON-decoding happens in predict()
    anymore, since the caller (the /api/generate/start endpoint) resolves
    them from the DB before calling predict()."""
    from novita_client import Img2V3ImgLoRA

    mock_prepare.return_value = {"model_name": "sd-v1-5"}
    mock_novita_client.img2img_v3.return_value = _build_novita_mocks()
    mock_download.return_value = _white_png_bytes()
    mock_create_watermark.return_value = Image.new("RGB", (512, 512), "grey")
    mock_create_doc.return_value = FAKE_IMAGE_ID
    mock_upload.side_effect = [ORIG_URL, WMARK_URL]
    mock_update.return_value = {"_id": FAKE_IMAGE_ID, "image_url": ORIG_URL, "watermarked_image_url": WMARK_URL}

    resolved_loras = [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]
    await predict(**{**PREDICT_KWARGS, "loras": resolved_loras})

    assert mock_prepare.call_args.kwargs["loras"] == resolved_loras
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "api" && venv/bin/pytest tests/test_generate.py -v`
Expected: FAIL — `TypeError: predict() got an unexpected keyword argument 'style_id'`

- [ ] **Step 3: Update `generate_controller.py`'s imports**

Line 29-34, remove `parse_style_loras`:

```python
from api.utils.utils import (
    prepare_img2img_request,
    create_watermark,
    normalize_qr_url,
)
```

- [ ] **Step 4: Update `predict()` (currently lines 203-216 for the signature, 251-263 for the body, 377-388 for the `create_image_doc` call)**

```python
async def predict(
    job_id: str,
    prompt: str,
    website: str,
    negative_prompt: str,
    seed: int,
    sd_model: str,
    user_id: str,
    style_id: str,
    style_title: str,
    style_prompt: str,
    loras: list,
    qr_weight: int = 0,
    style_modifier: float = 0,
):
```

Replace the body's LoRA-parsing block:

```python
        # Log what we're *asking* Novita to apply. This is the only
        # ground-truth record of intent — Novita's response doesn't echo
        # back a "loras applied" flag, so this is also what you'd compare
        # against debug_info.request_info below to catch a silently
        # dropped/unresolved LoRA name.
        logger.info(
            "Requesting loras for style '%s': %s",
            style_title,
            [{"model_name": l.model_name, "strength": l.strength} for l in loras],
        )

        req = prepare_img2img_request(
                    prompt,
                    negative_prompt,
                    sd_model,
                    seed,
                    image_base64_str,
                    qr_weight,
                    style_prompt,
                    loras=loras,
                    style_modifier=style_modifier,
                )
```

(This removes the `loras = parse_style_loras(style_loras)` line — `loras` now arrives already resolved.)

And update the `create_image_doc` call to pass `style_id` through:

```python
            inserted_image_id = await create_image_doc(
                req,
                seed,
                website,
                qr_weight,
                user_id,
                prompt,
                style_prompt,
                style_title,
                style_id,
            )
```

- [ ] **Step 5: Update `start_generation()` (currently lines 453-476)**

```python
async def start_generation(
    job_id,
    prompt,
    website,
    negative_prompt,
    seed,
    sd_model,
    user_id,
    style_id,
    style_title,
    style_prompt,
    loras,
    qr_weight=0,
    style_modifier=0,
):
    """Fire-and-forget wrapper around predict(), run via asyncio.create_task
    from the /api/generate/start route. Always leaves _jobs[job_id] in a
    terminal state, even if predict() raises — otherwise an exception here
    would just be an unretrieved asyncio task error, logged but invisible to
    the client, which would then poll forever."""
    try:
        result = await predict(
            job_id, prompt, website, negative_prompt, seed, sd_model,
            user_id, style_id, style_title, style_prompt, loras, qr_weight, style_modifier,
        )
        _update_job(job_id, status="succeeded", percent=100, stage="finishing", result=result)
    except Exception:
        logger.error("Generation job %s failed", job_id, exc_info=True)
        _update_job(job_id, status="failed", error="GenerationFailed")
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_generate.py -v`
Expected: PASS (all tests, including the new `test_predict_passes_loras_straight_to_request_builder`; `test_storage_creates_image_doc`'s positional-index assertions at `call_kwargs.args[2]`/`[4]`/`[5]` still pass since `style_id` was appended last)

- [ ] **Step 7: Commit**

```bash
git add api/controllers/generate_controller.py api/tests/test_generate.py
git commit -m "refactor: predict()/start_generation() take an already-resolved style"
```

---

## Task 6: `/api/generate/start` resolves `style_id` via the DB

**Files:**
- Modify: `api/main.py:1-33,101-129`
- Modify: `api/tests/test_http.py:189-207`

**Interfaces:**
- Consumes: `get_style()` from Task 2, `start_generation()`'s new signature from Task 5.
- Produces: the public contract of `/api/generate/start` now takes `style_id` instead of `sd_model`/`style_prompt`/`style_title`/`style_loras`/`style_modifier`. Consumed by Task 15's `ImagesUtils.startGeneration`.

- [ ] **Step 1: Update the test to the new contract**

Replace `test_generate_start_returns_job_id` in `api/tests/test_http.py:189-207`:

```python
@patch("api.main.start_generation", new_callable=AsyncMock)
@patch("api.main.get_style", new_callable=AsyncMock)
async def test_generate_start_returns_job_id(mock_get_style, mock_start_generation):
    from api.schemas.schemas import Style

    mock_get_style.return_value = Style(
        _id="507f1f77bcf86cd799439099",
        style_key="cinematic",
        version=1,
        is_active=True,
        title="Cinematic",
        prompt=", cinematic",
        loras=[],
        style_modifier=0,
        sd_model="sd-v1-5",
    )
    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "negative_prompt": "ugly",
        "seed": "42",
        "qr_weight": "1",
        "style_id": "507f1f77bcf86cd799439099",
    }
    async with _client() as client:
        response = await client.post("/api/generate/start", params=params, headers=_guest_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("job_id"), str) and body["job_id"]
    mock_get_style.assert_awaited_once_with("507f1f77bcf86cd799439099")


@patch("api.main.get_style", new_callable=AsyncMock)
async def test_generate_start_returns_400_for_unknown_style(mock_get_style):
    from fastapi import HTTPException

    mock_get_style.side_effect = HTTPException(status_code=404, detail="Style not found")
    params = {
        "prompt": "a dragon",
        "website": "https://example.com",
        "style_id": "000000000000000000000000",
    }
    async with _client() as client:
        response = await client.post("/api/generate/start", params=params, headers=_guest_auth_headers())

    assert response.status_code == 404
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "api" && venv/bin/pytest tests/test_http.py -k generate_start -v`
Expected: FAIL — `422 Unprocessable Entity` (endpoint still requires `sd_model`) and `AttributeError`/`AssertionError` on `api.main.get_style` (doesn't exist yet)

- [ ] **Step 3: Update `api/main.py` imports (lines 23-32)**

```python
from api.controllers.images_controller import get_images, get_image, toggle_like, delete_image, toggle_featured
from api.controllers.generate_controller import seed_job, start_generation, get_job, sweep_old_jobs
from api.controllers.styles_controller import get_style
from api.controllers.users_controller import get_user_info, authenticate_user
from api.controllers.login_code_controller import request_login_code, verify_login_code
from api.controllers.payment_controller import create_unlock_checkout_session, stripe_webhook
from api.controllers.unlock_controller import unlock_image
from api.controllers.admin_controller import admin_download_image, admin_get_image_info
from api.schemas.schemas import User, UserAuth, LoginCodeRequest, LoginCodeVerify
from api.utils.auth import get_current_user, require_service_token, require_admin
from novita_client import Img2V3ImgLoRA
```

- [ ] **Step 4: Update the endpoint (lines 101-129)**

```python
# ------------------------------ GENERATE ROUTES ----------------------------- #

# START GENERATION (returns immediately; runs predict() in the background)
@app.post("/api/generate/start")
@limiter.limit("20/hour")
async def generate_start_endpoint(
    request: Request,
    website: Annotated[str, Query(min_length=1, max_length=2048)],
    style_id: Annotated[str, Query(min_length=1, max_length=64)],
    prompt: Annotated[str, Query(max_length=500)] = "",
    negative_prompt: Annotated[str, Query(max_length=500)] = "",
    seed: Annotated[int, Query(ge=-1)] = -1,
    qr_weight: Annotated[int, Query(ge=-2, le=2)] = 0,
    current_user: dict = Depends(get_current_user),
):
    sweep_old_jobs()
    style = await get_style(style_id)
    loras = [Img2V3ImgLoRA(model_name=l.model_name, strength=l.strength) for l in style.loras]
    job_id = str(uuid.uuid4())
    seed_job(job_id, current_user["user_id"])
    asyncio.create_task(start_generation(
        job_id, prompt, website, negative_prompt, seed, style.sd_model,
        current_user["user_id"], style.id, style.title, style.prompt, loras,
        qr_weight, style.style_modifier,
    ))
    return {"job_id": job_id}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_http.py -v`
Expected: PASS (all tests in the file)

- [ ] **Step 6: Commit**

```bash
git add api/main.py api/tests/test_http.py
git commit -m "feat: /api/generate/start resolves style_id from the DB"
```

---

## Task 7: Update the e2e generate test

**Files:**
- Modify: `api/tests/e2e/test_e2e_generate.py`

**Interfaces:**
- Consumes: the new `/api/generate/start` contract from Task 6.

- [ ] **Step 1: Replace `GENERATE_PARAMS` and insert/clean up a temp style doc**

Replace lines 19-28 and the test body:

```python
GENERATE_PARAMS_BASE = {
    "prompt": "a simple red geometric shape",
    "website": "https://qr-ai.co",
    "negative_prompt": "ugly blurry text",
    "seed": "42",
    "qr_weight": "1",
}
```

Replace the test function body (keep the `@pytest.mark.e2e`/`@pytest.mark.novita` decorators and docstring):

```python
@pytest.mark.e2e
@pytest.mark.novita
async def test_generate_produces_scannable_image(mongo_db):
    """
    Full generation flow: real Novita call produces image, stored in S3 and MongoDB.

    Steps:
      1. Insert a temporary style doc (this test's own style, cleaned up after)
      2. Start generation as a guest user, poll until it completes
      3. Assert response contains image_url and watermarked_image_url
      4. Verify image document written to QART.images
      5. Cleanup: delete the image via API and the temp style doc
    """
    guest_id = f"guest_e2e_{int(time.time() * 1000)}"
    headers = {"Authorization": f"Bearer {mint_guest_jwt(guest_id)}"}
    image_id = None

    style_result = await mongo_db["styles"].insert_one({
        "style_key": "e2e-test-style",
        "version": 1,
        "is_active": True,
        "title": "E2E Test Style",
        "prompt": "",
        "loras": [],
        "style_modifier": 0,
        "sd_model": "cyberrealistic_v40_151857.safetensors",
    })
    style_id = str(style_result.inserted_id)

    try:
        async with _client() as client:
            start_resp = await client.post(
                "/api/generate/start",
                params={**GENERATE_PARAMS_BASE, "style_id": style_id},
                headers=headers,
                timeout=30.0,
            )
            assert start_resp.status_code == 200, (
                f"Generate start endpoint returned {start_resp.status_code}: {start_resp.text[:500]}"
            )
            job_id = start_resp.json()["job_id"]

            data = await _await_generation(client, job_id, headers)

        assert "image_url" in data, "Response missing image_url"
        assert "watermarked_image_url" in data, "Response missing watermarked_image_url"
        assert data["image_url"].startswith("https://"), "image_url is not an HTTPS URL"
        assert data["watermarked_image_url"].startswith("https://"), \
            "watermarked_image_url is not an HTTPS URL"

        image_id = data.get("_id")
        assert image_id, "Response missing _id"

        from bson import ObjectId
        db_doc = await mongo_db["images"].find_one({"_id": ObjectId(image_id)})
        assert db_doc is not None, f"Image {image_id} not found in QART.images"
        assert db_doc["user_id"] == guest_id
        assert db_doc["image_url"] == data["image_url"]
        assert db_doc["style_id"] == style_id

    finally:
        if image_id:
            async with _client() as client:
                del_resp = await client.delete(
                    f"/api/images/delete/{image_id}",
                    headers=headers,
                    timeout=30.0,
                )
            assert del_resp.status_code in (200, 404), \
                f"Cleanup delete returned {del_resp.status_code}"
        await mongo_db["styles"].delete_one({"_id": style_result.inserted_id})
```

- [ ] **Step 2: Run it (costs one Novita credit — only if you intend to actually verify against production)**

Run: `pytest api/tests/e2e/test_e2e_generate.py -v -c pytest-e2e.ini -s`
Expected: PASS. This step is optional to run locally; it always runs in whatever CI job already runs the e2e suite.

- [ ] **Step 3: Commit**

```bash
git add api/tests/e2e/test_e2e_generate.py
git commit -m "test: update e2e generate test for style_id-only contract"
```

---

## Task 8: Seed script + data-shape test

**Files:**
- Create: `api/scripts/seed_styles.py`
- Create: `api/tests/test_seed_styles.py`

**Interfaces:**
- Produces: `STYLES: list[dict]` (title, prompt, loras, style_modifier, sd_model per current `ImageStyles.js` minus keywords/image_url/id/Random) and `slugify(title: str) -> str`, plus `async def seed()`. Task 9 runs this script for real; its printed `_id`s feed Task 10.

- [ ] **Step 1: Write the failing data-shape tests**

Create `api/tests/test_seed_styles.py`:

```python
from api.scripts.seed_styles import STYLES, slugify


class TestSeedStylesData:
    def test_thirteen_styles(self):
        assert len(STYLES) == 13

    def test_every_style_has_required_fields(self):
        for style in STYLES:
            assert isinstance(style["title"], str) and style["title"]
            assert isinstance(style["prompt"], str)
            assert isinstance(style["loras"], list)
            assert isinstance(style["style_modifier"], (int, float))
            assert isinstance(style["sd_model"], str) and style["sd_model"]

    def test_every_lora_entry_has_model_name_and_strength(self):
        for style in STYLES:
            for lora in style["loras"]:
                assert isinstance(lora["model_name"], str) and lora["model_name"]
                assert isinstance(lora["strength"], (int, float))

    def test_titles_are_unique(self):
        titles = [s["title"] for s in STYLES]
        assert len(titles) == len(set(titles))

    def test_no_style_embeds_a_lora_tag_in_its_prompt(self):
        for style in STYLES:
            assert "<lora:" not in style["prompt"].lower()

    def test_random_is_not_included(self):
        titles = [s["title"] for s in STYLES]
        assert "Random" not in titles


class TestSlugify:
    def test_simple_title(self):
        assert slugify("Ukiyo-e") == "ukiyo-e"

    def test_title_with_spaces(self):
        assert slugify("Low Poly Art") == "low-poly-art"

    def test_title_with_mixed_case(self):
        assert slugify("Chinese art") == "chinese-art"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "api" && venv/bin/pytest tests/test_seed_styles.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'api.scripts.seed_styles'`

- [ ] **Step 3: Write the seed script**

Create `api/scripts/seed_styles.py`:

```python
"""
One-off migration: seed the `styles` collection in MongoDB from the style
data that used to live hardcoded in ImageStyles.js (styles-in-DB migration,
see docs/superpowers/specs/2026-07-07-styles-in-db-design.md).

WARNING: writes to the live Mongo Atlas database (QART.styles). Run only
with explicit confirmation — this is not part of the app's request path or
CI, and running it twice will insert duplicate style documents.

Run: python -m api.scripts.seed_styles
"""
import asyncio
import os
import re

import certifi
import motor.motor_asyncio as motor
from dotenv import load_dotenv

load_dotenv()

# title, prompt, loras, style_modifier, sd_model — copied from the current
# src/_utils/ImageStyles.js, minus `keywords`, `image_url`, and the
# frontend-only "Random" entry (id 1), which is never sent for generation.
STYLES = [
    {
        "title": "Ukiyo-e",
        "prompt": "ukiyo-e, woodblock print, flat colors, flowing lines, Japanese, traditional, Establishing Shot, Proportion",
        "loras": [],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Expressionism",
        "prompt": "Expressionism art style, distorted perspective, vivid non-naturalistic colors, thick coarse brushwork, intense raw emotion, anxiety atmosphere, inspired by Edvard Munch",
        "loras": [{"model_name": "Painting_131556", "strength": 0.6}],
        "style_modifier": -1.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Low Poly Art",
        "prompt": "Low-Poly Art, Origami, Painting By Salvador Dali, Scene, Dramatic, Cinematic, Establishing Shot, 4k, UHD",
        "loras": [{"model_name": "ral-polygon-sd15_205894", "strength": 0.8}],
        "style_modifier": 0,
        "sd_model": "epicrealism_pureEvolutionV5_97793.safetensors",
    },
    {
        "title": "Photography",
        "prompt": "photography, photorealistic, cinematic lighting, shallow depth of field, ultra detailed, DSLR",
        "loras": [{"model_name": "epiCRealLife_117118", "strength": 0.8}],
        "style_modifier": 0,
        "sd_model": "cyberrealistic_v40_151857.safetensors",
    },
    {
        "title": "Vector Art",
        "prompt": "vector art, clean lines, flat colors, geometric shapes, crisp edges, minimal shading",
        "loras": [{"model_name": "0mib3(gut auf 1)_47645", "strength": 0.9}],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Doodle Art",
        "prompt": "surrealistic, tuyawang, abstract, doodle art",
        "loras": [{"model_name": "TUYA5_129115", "strength": 0.8}],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Ink",
        "prompt": "ink wash, sumi-e, expressive brushstrokes, flowing ink, monochrome, splatter",
        "loras": [{"model_name": "zyd232_InkStyle_v1_0_53697", "strength": 1}],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Oil Painting",
        "prompt": "oil painting, impasto, saturated colors, vibrant palette, bold brushstrokes, painterly, bichu, Impressionism",
        "loras": [{"model_name": "bichu-v0612_65240", "strength": 0.8}],
        "style_modifier": -1.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Chinese art",
        "prompt": "Chinese ink painting, shan shui, ink wash, brushwork, rice paper, traditional, shuimobysim, wuxia",
        "loras": [
            {"model_name": "wuxia2_62008", "strength": 0.8},
            {"model_name": "MoXinV1_12781", "strength": 0.7},
        ],
        "style_modifier": 0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Watercolor",
        "prompt": "watercolor, soft washes, delicate pigments, fluid edges, paper texture, translucent",
        "loras": [{"model_name": "Colorwater_v4", "strength": 0.5}],
        "style_modifier": -2,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Ghibli",
        "prompt": "Studio Ghibli-inspired, whimsical, lush nature, soft watercolor, warm lighting, hand-painted",
        "loras": [
            {"model_name": "ghibli_style_offset_10272", "strength": 0.5},
            {"model_name": "Pyramid lora_Ghibli_n3_72103", "strength": 0.5},
        ],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Cyberpunk",
        "prompt": "cyberpunk, neon-lit, futuristic megacity, rainy streets, holographic glow, cinematic lighting",
        "loras": [{"model_name": "CyberPunkAI_56082", "strength": 0.7}],
        "style_modifier": -0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
    {
        "title": "Illustration",
        "prompt": "illustration, stylized, painterly, soft colors, clean linework, detailed, Zylagidam art style",
        "loras": [
            {"model_name": "Comic_book_7_E10", "strength": 0.6},
            {"model_name": "Drawing_85106", "strength": 0.5},
        ],
        "style_modifier": 0.5,
        "sd_model": "colorful_v31_62333.safetensors",
    },
]


def slugify(title: str) -> str:
    """"Ukiyo-e" -> "ukiyo-e", "Low Poly Art" -> "low-poly-art"."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


async def seed():
    mongo_url = os.environ["MONGO_URL"]
    tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
    client = motor.AsyncIOMotorClient(mongo_url, **tls)
    db = client.get_database("QART")
    styles = db.get_collection("styles")

    print(f"Seeding {len(STYLES)} styles into QART.styles ...")
    for style in STYLES:
        doc = {
            "style_key": slugify(style["title"]),
            "version": 1,
            "is_active": True,
            **style,
        }
        result = await styles.insert_one(doc)
        print(f"  {str(result.inserted_id)}  {style['title']!r}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "api" && venv/bin/pytest tests/test_seed_styles.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add api/scripts/seed_styles.py api/tests/test_seed_styles.py
git commit -m "feat: add one-off styles seed script"
```

---

## Task 9: ⚠️ Run the seed script against production — STOP for explicit confirmation

**This task writes to the live production MongoDB. Do not run it without asking the user to confirm first**, even if executing this plan autonomously — re-read the Global Constraints section above and this plan's spec doc before proceeding.

**Files:** none (data migration only).

**Interfaces:**
- Produces: 13 real Mongo `_id` strings, one per style title, printed to stdout — consumed by Task 10 to populate the frontend `ImageStyles.js`.

- [ ] **Step 1: Ask the user to confirm before running anything**

Confirm explicitly: "This will insert 13 new documents into the production `QART.styles` collection. Running it twice will create duplicates — has this been run before? OK to proceed?"

- [ ] **Step 2: Run the script**

Run: `cd "api" && venv/bin/python -m api.scripts.seed_styles`
Expected output: 13 lines of `<ObjectId>  '<Title>'`, e.g.:
```
Seeding 13 styles into QART.styles ...
  65f...  'Ukiyo-e'
  65f...  'Expressionism'
  ...
```

- [ ] **Step 3: Save the printed `{_id, title}` pairs**

Copy the full output somewhere durable (e.g. paste into this plan file's own scratch notes, or directly into Task 10 below when you get there) — Task 10 needs every one of these 13 ids, matched to their titles.

- [ ] **Step 4: Verify in Mongo (optional sanity check)**

If you have `mongosh`/Compass access: `db.styles.countDocuments({})` should return `13`.

No commit for this task — it's a data-only change, not a code change.

---

## Task 10: Trim `ImageStyles.js` to `{id, title, image_url}`

**Files:**
- Modify: `src/_utils/ImageStyles.js` (full rewrite)
- Modify: `src/__tests__/imageStyles.test.js` (full rewrite)

**Interfaces:**
- Consumes: the 13 real `_id`s from Task 9.
- Produces: `styles: {id, title, image_url}[]`, `RANDOM_STYLE_ID: "random"`, `selectRandomStyle(): {id, title, image_url}`. Consumed by every frontend task below.

- [ ] **Step 1: Write the failing tests**

Replace `src/__tests__/imageStyles.test.js` entirely:

```js
import { styles, selectRandomStyle, RANDOM_STYLE_ID } from '../_utils/ImageStyles'

describe('ImageStyles frontend shape', () => {
  test('every style has id, title, and image_url only', () => {
    for (const s of styles) {
      expect(typeof s.id).toBe('string')
      expect(typeof s.title).toBe('string')
      expect(typeof s.image_url).toBe('string')
      expect(s.image_url.length).toBeGreaterThan(0)
    }
  })

  test('no style carries the removed keywords field', () => {
    for (const s of styles) {
      expect(s.keywords).toBeUndefined()
    }
  })

  test('no style carries prompt/loras/sd_model — those live in the DB now', () => {
    for (const s of styles) {
      expect(s.prompt).toBeUndefined()
      expect(s.loras).toBeUndefined()
      expect(s.sd_model).toBeUndefined()
      expect(s.style_modifier).toBeUndefined()
    }
  })

  test('ids are unique', () => {
    const ids = styles.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('the Random entry uses the RANDOM_STYLE_ID sentinel', () => {
    const random = styles.find((s) => s.title === 'Random')
    expect(random.id).toBe(RANDOM_STYLE_ID)
  })
})

describe('selectRandomStyle', () => {
  test('returns a style that is not the Random sentinel', () => {
    const result = selectRandomStyle()
    expect(result.id).not.toBe(RANDOM_STYLE_ID)
    expect(result.title).not.toBe('Random')
  })

  test('always picks from the styles array', () => {
    const result = selectRandomStyle()
    expect(styles).toContainEqual(result)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest imageStyles.test.js`
Expected: FAIL — `RANDOM_STYLE_ID` is not exported yet, and `styles` entries still have `prompt`/`loras`/`sd_model`/`keywords`.

- [ ] **Step 3: Rewrite `src/_utils/ImageStyles.js`**

Replace the file entirely. **Substitute each `id: "PASTE_..._ID"` below with the real `_id` string Task 9 printed for that title** (matched by title — the order Task 9 prints them in matches the `STYLES` list order in `seed_styles.py`, which matches the order below):

```js
export const RANDOM_STYLE_ID = "random";

export const styles = [
  {
    id: RANDOM_STYLE_ID,
    title: "Random",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6575fc6828c914471b835383.png",
  },
  {
    id: "PASTE_UKIYO_E_ID",
    title: "Ukiyo-e",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/656e2d37e3aafee4354c812b.png",
  },
  {
    id: "PASTE_EXPRESSIONISM_ID",
    title: "Expressionism",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a498f50dbeee01fccc37bc6.png",
  },
  {
    id: "PASTE_LOW_POLY_ART_ID",
    title: "Low Poly Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a167cad076ab86bf56ac89.png",
  },
  {
    id: "PASTE_PHOTOGRAPHY_ID",
    title: "Photography",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4abe9e2164b64ac00f0758.png",
  },
  {
    id: "PASTE_VECTOR_ART_ID",
    title: "Vector Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65cc123c7b729925fcced038.png",
  },
  {
    id: "PASTE_DOODLE_ART_ID",
    title: "Doodle Art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65a19822d076ab86bf56acab.png",
  },
  {
    id: "PASTE_INK_ID",
    title: "Ink",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6595dd1fd3f4c7d50f757b65.png",
  },
  {
    id: "PASTE_OIL_PAINTING_ID",
    title: "Oil Painting",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/659801fb55848e0542b40cd0.png",
  },
  {
    id: "PASTE_CHINESE_ART_ID",
    title: "Chinese art",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/65e243349c04d23c99e86494.png",
  },
  {
    id: "PASTE_WATERCOLOR_ID",
    title: "Watercolor",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a49894ce43200a51524b869.png",
  },
  {
    id: "PASTE_GHIBLI_ID",
    title: "Ghibli",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bbb07890b1939b5192cd8.png",
  },
  {
    id: "PASTE_CYBERPUNK_ID",
    title: "Cyberpunk",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4508cc3b23a83b1fa7b4c3.png",
  },
  {
    id: "PASTE_ILLUSTRATION_ID",
    title: "Illustration",
    image_url:
      "https://qrartimages.s3.us-west-1.amazonaws.com/6a4bb59e2cfa329e8d58854c.png",
  },
];

/**
 * Pick a random non-Random style. Used by GenerateForm and IteratePanel
 * when the user has selected style_id === RANDOM_STYLE_ID ("Random").
 */
export function selectRandomStyle() {
  const available = styles.filter((s) => s.id !== RANDOM_STYLE_ID);
  return available[Math.floor(Math.random() * available.length)];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest imageStyles.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/_utils/ImageStyles.js src/__tests__/imageStyles.test.js
git commit -m "refactor: trim ImageStyles.js to id/title/image_url, drop keywords"
```

---

## Task 11: Trim `generateFormValues` in `store.js`

**Files:**
- Modify: `src/store.js` (full file, 74 lines)

**Interfaces:**
- Consumes: `RANDOM_STYLE_ID` from Task 10.
- Produces: `generateFormValues` shape is now `{website, prompt, style_id, style_title, qr_weight, negative_prompt, seed}` (no `style_prompt`, `loras`, `style_modifier`, `sd_model`).

- [ ] **Step 1: Rewrite `src/store.js`**

```js
import { create } from "zustand";
import { RANDOM_STYLE_ID } from "./_utils/ImageStyles";

export const useStore = create((set) => ({
  user: {},
  alert: {
    open: false,
    severity: "info",
    message: "",
  },
  generateFormValues: {
    website: "",
    prompt: "",
    style_id: RANDOM_STYLE_ID,
    style_title: "Random",
    qr_weight: 0.0,
    negative_prompt: "",
    seed: -1,
  },
  generatingImage: false,
  iterateSession: null,

  setIterateSession: (session) => set({ iterateSession: session }),
  clearIterateSession: () => set({ iterateSession: null }),

  setGenerateFormValues: (values) =>
    set((state) => ({
      ...state,
      generateFormValues: values,
    })),
  resetGenerateFormValues: () =>
    set((state) => ({
      ...state,
      generateFormValues: {
        website: "",
        prompt: "",
        style_id: RANDOM_STYLE_ID,
        style_title: "Random",
        qr_weight: 0.0,
        negative_prompt: "",
        seed: -1,
      },
    })),
    setGeneratingImage: (bool) =>
    set((state) => ({
      ...state,
      generatingImage: bool
    })),
  openAlert: (severity, message) =>
    set((state) => ({
      ...state,
      alert: {
        open: true,
        severity: severity,
        message: message,
      },
    })),
  closeAlert: () =>
    set((state) => ({
      ...state,
      alert: {
        open: false,
        severity: "info",
        message: "",
      },
    })),
}));
```

- [ ] **Step 2: Run the full frontend suite to confirm nothing else broke yet**

Run: `npx jest`
Expected: Some failures remain in `GenerateForm.test.js`/`SettingsModal.test.js`/`IteratePanel.test.js`/`images.test.js` — those are fixed in Tasks 13-16. No new failures should appear beyond what those tasks already need to fix (this store change itself doesn't reference anything those files don't already touch).

- [ ] **Step 3: Commit**

```bash
git add src/store.js
git commit -m "refactor: drop style_prompt/loras/sd_model/style_modifier from generateFormValues"
```

---

## Task 12: `StylesModal.js` only sets `style_id`/`style_title`

**Files:**
- Modify: `src/app/(main_pages)/generate/(formComponents)/StylesModal.js:27-44`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Update `handleStyleClick`**

```js
  const handleStyleClick = (item) => {
    if (onStyleSelect) {
      onStyleSelect(item);
    } else {
      setGenerateFormValues({
        ...generateFormValues,
        style_id: item.id,
        style_title: item.title,
      });
    }

    setTimeout(() => {
      handleClose();
    }, 300);
  };
```

- [ ] **Step 2: Manually sanity-check** — no automated test exists for this file today; confirm the frontend suite still passes overall

Run: `npx jest`
Expected: no new failures introduced by this file (StylesModal has no dedicated test file to run in isolation).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main_pages)/generate/(formComponents)/StylesModal.js"
git commit -m "refactor: StylesModal only forwards style_id/style_title"
```

---

## Task 13: `GenerateForm.js` drops style_prompt/loras/sd_model/style_modifier

**Files:**
- Modify: `src/app/(main_pages)/generate/GenerateForm.js:16,88-98,173-185`
- Modify: `src/__tests__/GenerateForm.test.js:84-101,165-177,214-227,244-256,276-288,316-322`

**Interfaces:**
- Consumes: `RANDOM_STYLE_ID`, `selectRandomStyle` from Task 10.

- [ ] **Step 1: Update the test fixtures first**

In `src/__tests__/GenerateForm.test.js`, update every `generateFormValues` fixture object to drop `style_prompt`/`sd_model` and use string style ids. `resetStore` (lines 84-101):

```js
function resetStore(overrides = {}) {
  useStore.setState({
    user: { id: 'user_123', is_guest: false },
    generateFormValues: {
      website: '',
      prompt: 'a random prompt',
      style_id: 'random',
      style_title: 'Random',
      qr_weight: 0.0,
      negative_prompt: '',
      seed: -1,
    },
    generatingImage: false,
    alert: { open: false, severity: 'info', message: '' },
    ...overrides,
  })
}
```

Every other inline `generateFormValues: { website: 'example.com', prompt: 'a dragon', style_id: 2, style_title: 'Anime', style_prompt: 'anime style', qr_weight: 0.0, negative_prompt: '', seed: -1, sd_model: 'cyberrealistic_v40_151857.safetensors' }` fixture (there are 5: lines ~165-177, ~214-227, ~244-256, ~276-288, and `fillForm` at ~316-322) becomes:

```js
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 'style-2',
        style_title: 'Anime',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
      },
```

(`fillForm`'s single-line variant becomes: `website: 'example.com', prompt: 'a dragon', style_id: 'style-2', style_title: 'Anime', qr_weight: 0.0, negative_prompt: '', seed: -1,`)

- [ ] **Step 2: Run the tests to verify they still pass against the old component (sanity check the fixture edit alone doesn't break anything)**

Run: `npx jest GenerateForm.test.js`
Expected: PASS (the component doesn't read `style_prompt`/`sd_model` in any assertion, so trimming the fixtures alone doesn't fail anything — this step just confirms that)

- [ ] **Step 3: Update `GenerateForm.js`**

Line 16, update the import:

```js
import { selectRandomStyle, RANDOM_STYLE_ID } from "@/_utils/ImageStyles";
```

Lines 88-98, `handleStyleChipClick`:

```js
  const handleStyleChipClick = (item) => {
    setGenerateFormValues({
      ...generateFormValues,
      style_id: item.id,
      style_title: item.title,
    });
  };
```

Lines 173-185, the random-swap block inside `handleGenerate`:

```js
      let generateForm = generateFormValues;
      if (generateForm.style_id === RANDOM_STYLE_ID) {
        const randomStyle = selectRandomStyle();
        generateForm = {
          ...generateFormValues,
          style_id: randomStyle.id,
          style_title: randomStyle.title,
        };
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest GenerateForm.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main_pages)/generate/GenerateForm.js" src/__tests__/GenerateForm.test.js
git commit -m "refactor: GenerateForm only tracks style_id/style_title"
```

---

## Task 14: `IteratePanel.js` resolves style by id, drops the rest

**Files:**
- Modify: `src/app/images/[imageId]/IteratePanel.js:18,31-45,91-141,350-360`
- Modify: `src/__tests__/IteratePanel.test.js:46-54`

**Interfaces:**
- Consumes: `RANDOM_STYLE_ID`, `selectRandomStyle`, `styles` from Task 10.

- [ ] **Step 1: Update the test mock first**

In `src/__tests__/IteratePanel.test.js`, replace the `jest.mock('@/_utils/ImageStyles', ...)` block (lines 46-54):

```js
jest.mock('@/_utils/ImageStyles', () => ({
  RANDOM_STYLE_ID: 'random',
  styles: [
    { id: 'random', title: 'Random', image_url: '' },
    { id: 'style-2', title: 'Photorealistic', image_url: '' },
  ],
  selectRandomStyle: jest.fn(() => ({
    id: 'style-2', title: 'Photorealistic', image_url: '',
  })),
}))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest IteratePanel.test.js`
Expected: FAIL or PASS-but-stale — the mock alone doesn't break anything yet since `IMAGE` has no `style_id`; this step is here to lock in the new mock shape before the component changes in Step 3. Confirm no errors thrown (`RANDOM_STYLE_ID` undefined would throw if the component already referenced it — it doesn't yet, so expect PASS here, then re-verify after Step 3.)

- [ ] **Step 3: Update `IteratePanel.js`**

Line 18, import:

```js
import { styles, selectRandomStyle, RANDOM_STYLE_ID } from "@/_utils/ImageStyles";
```

Lines 31-45, `initFormValues` — resolve by `style_id` first, falling back to the existing title match, falling back to `styles[0]`, and drop `style_prompt`/`loras`/`sd_model`/`style_modifier`:

```js
function initFormValues(image, isOwner = true) {
  const img = image ?? {};
  const sourceStyle =
    styles.find((s) => s.id === img.style_id) ??
    styles.find((s) => s.title === img.style_title) ??
    styles[0];
  return {
    website: isOwner ? (img.content ?? "") : "",
    prompt: img.prompt ?? "",
    style_id: sourceStyle.id,
    style_title: sourceStyle.title,
    qr_weight: img.qr_weight ?? 0,
  };
}
```

Lines 91-141, `buildPayload`:

```js
  const buildPayload = (trigger) => {
    if (trigger === "newVariation") {
      const sourceStyle =
        styles.find((s) => s.id === image.style_id) ??
        styles.find((s) => s.title === image.style_title) ??
        styles[0];
      return {
        website: image.content ?? "",
        prompt: image.prompt ?? "",
        style_id: sourceStyle.id,
        style_title: sourceStyle.title,
        qr_weight: image.qr_weight ?? 0,
        negative_prompt: image.negative_prompt ?? "",
        seed: -1,
      };
    }

    let style_id = formValues.style_id;
    let style_title = formValues.style_title;

    if (style_id === RANDOM_STYLE_ID) {
      const resolved = selectRandomStyle();
      style_id = resolved.id;
      style_title = resolved.title;
    }

    const seed = style_title !== originalStyleTitle.current ? -1 : image.seed;

    return {
      website: formValues.website,
      prompt: formValues.prompt,
      style_id,
      style_title,
      qr_weight: formValues.qr_weight,
      negative_prompt: image.negative_prompt ?? "",
      seed,
    };
  };
```

Lines 350-360, the `onStyleChange` prop passed to `GenerationFormFields`:

```js
              onStyleChange={(style) =>
                setFormValues((prev) => ({
                  ...prev,
                  style_id: style.id,
                  style_title: style.title,
                }))
              }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest IteratePanel.test.js`
Expected: PASS (all tests; the two `it.skip`-marked tests stay skipped as before)

- [ ] **Step 5: Commit**

```bash
git add "src/app/images/[imageId]/IteratePanel.js" src/__tests__/IteratePanel.test.js
git commit -m "refactor: IteratePanel resolves style by id, drops style_prompt/loras/sd_model"
```

---

## Task 15: `ImagesUtils.startGeneration` drops loras/style_modifier/style_title

**Files:**
- Modify: `src/_utils/ImagesUtils.js:77-104`
- Modify: `src/__tests__/images.test.js:94-126`

**Interfaces:**
- Produces: `startGeneration(generateFormValues, user)` now sends only `website, prompt, style_id, qr_weight, negative_prompt, seed` (no `style_title`, `loras`, `style_modifier`, `style_loras`, `sd_model`) as query params to `/api/generate/start`.

- [ ] **Step 1: Update the tests first**

In `src/__tests__/images.test.js`, delete the four tests from `'sends the style_modifier value from the form'` through `'sends style_loras="[]" when the form has no loras'` (lines 94-126) and replace with:

```js
  test('forwards style_id and drops style_title from the query', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage({ ...FAKE_FORM, style_id: 'abc123', style_title: 'Anime' }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const params = new URL(url).searchParams
    expect(params.get('style_id')).toBe('abc123')
    expect(params.has('style_title')).toBe(false)
  })

  test('does not send loras/style_modifier/style_loras/sd_model — those are DB-resolved now', async () => {
    mockSucceeds({ _id: 'img_1' })
    await generateImage({ ...FAKE_FORM, style_id: 'abc123' }, FAKE_USER)
    const [url] = fetch.mock.calls[0]
    const params = new URL(url).searchParams
    expect(params.has('loras')).toBe(false)
    expect(params.has('style_modifier')).toBe(false)
    expect(params.has('style_loras')).toBe(false)
    expect(params.has('sd_model')).toBe(false)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest images.test.js`
Expected: FAIL — `style_title` is currently still sent (no destructure to drop it)

- [ ] **Step 3: Update `startGeneration` in `src/_utils/ImagesUtils.js:77-104`**

```js
export const startGeneration = async (generateFormValues, user) => {
  const token = await getBackendToken();
  // style_title is kept client-side for display/local logic (e.g. seed-reset
  // comparisons) but the backend resolves the canonical title from the DB —
  // drop it before sending.
  const { style_title, ...rest } = generateFormValues;
  const payload = {
    ...rest,
    qr_weight: Math.round(Number(generateFormValues.qr_weight) || 0),
  };
  const queryParams = new URLSearchParams(payload);
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/start?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data?.detail || "GenerationFailed";
    throw new Error(
      detail === "Insufficient credits" ? "InsufficientCredits" : "GenerationFailed"
    );
  }
  return response.json(); // { job_id }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest images.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/_utils/ImagesUtils.js src/__tests__/images.test.js
git commit -m "refactor: startGeneration only sends style_id, not style_title/loras/style_modifier"
```

---

## Task 16: `SettingsModal.test.js` fixture trim

**Files:**
- Modify: `src/__tests__/SettingsModal.test.js:15-29`

**Interfaces:** none — cosmetic fixture alignment, no component change (SettingsModal doesn't read the removed fields).

- [ ] **Step 1: Update `resetStore`**

```js
function resetStore(qrWeight = 0.0) {
  useStore.setState({
    generateFormValues: {
      website: '',
      prompt: '',
      style_id: 'random',
      style_title: 'Random',
      qr_weight: qrWeight,
      negative_prompt: '',
      seed: -1,
    },
  })
}
```

- [ ] **Step 2: Run the test to verify it still passes**

Run: `npx jest SettingsModal.test.js`
Expected: PASS (1 test — this file only asserts on the QR weight slider's min/max, unaffected by the fixture trim)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/SettingsModal.test.js
git commit -m "test: trim SettingsModal fixture to match the new generateFormValues shape"
```

---

## Task 17: `CopyButton.js` copies `style_id` instead of `style_prompt`/`sd_model`

**Files:**
- Modify: `src/_components/actions/CopyButton.js:20-33`

**Interfaces:** none — no test file exists for this component today (same as its sibling `DeleteButton`/`LikeButton`/`ShareButton`), so no test changes are needed.

- [ ] **Step 1: Update `handleCopy`**

```js
  const handleCopy = (image) => {
    amplitude.track("Copy Image");
    const copyValues = {
      website: image.content,
      prompt: image.prompt,
      style_id: image.style_id,
      style_title: image.style_title,
      qr_weight: image.qr_weight,
      negative_prompt: image.negative_prompt,
      seed: image.seed,
    };
    setGenerateFormValues(copyValues);

    router.push("/generate");
  };
```

(This drops the commented-out `// style_id: 1` line along with `style_prompt`/`sd_model`. `image.style_id` will be `undefined` for images generated before this feature shipped — that's fine, matching the spec's "no backfill" scope; the generate form just won't have a style preselected in that case, same as any other missing field today.)

- [ ] **Step 2: Manually sanity-check**

Run: `npx jest`
Expected: no new failures (no test exercises this file).

- [ ] **Step 3: Commit**

```bash
git add src/_components/actions/CopyButton.js
git commit -m "refactor: CopyButton copies style_id instead of style_prompt/sd_model"
```

---

## Task 18: Delete dead `CustomStyleModal.js`

**Files:**
- Delete: `src/app/(main_pages)/generate/(formComponents)/CustomStyleModal.js`

**Interfaces:** none.

- [ ] **Step 1: Confirm it's still unreferenced**

Run: `grep -rn "CustomStyleModal" src/ --include="*.js"`
Expected: only the file's own definition line, no imports elsewhere (already confirmed during planning — this step just double-checks nothing changed in the meantime).

- [ ] **Step 2: Delete the file**

```bash
git rm "src/app/(main_pages)/generate/(formComponents)/CustomStyleModal.js"
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npx jest`
Expected: PASS — no test imports this file.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete dead, unreferenced CustomStyleModal.js"
```

---

## Task 19: Full verification pass

**Files:** none — verification only.

- [ ] **Step 1: Run the full backend suite**

Run: `cd "api" && venv/bin/pytest tests/ -v --ignore=tests/e2e`
Expected: PASS, 0 failures.

- [ ] **Step 2: Run the full frontend suite**

Run: `npx jest`
Expected: PASS, 0 failures.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors introduced by this change.

- [ ] **Step 4: Grep for any remaining `keywords` reference tied to styles (should find none besides the unrelated `PromptGenerator.js`/`promptKeywords` feature)**

Run: `grep -rn "keywords" src/ --include="*.js" | grep -v node_modules | grep -v PromptGenerator | grep -v CustomStyleModal`
Expected: no output (`CustomStyleModal.js` is excluded from the grep since it's already deleted by Task 18; if this prints anything, investigate before considering the migration done).

- [ ] **Step 5: Manually verify a real generation end-to-end**

Using the dev server (`npm run dev`), pick a non-Random style in `/generate`, submit, and confirm the image generates successfully and the resulting image's stored doc (via `/api/admin/image/{id}/info` if you have admin access, or a direct Mongo check) has a `style_id` matching the style you picked.

No commit for this task — verification only.
