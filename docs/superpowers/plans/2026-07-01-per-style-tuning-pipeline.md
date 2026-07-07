# Per-style Tuning Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Optuna-driven parameter search + human review pipeline that discovers tuned, per-style generation params (ControlNet weights, checkpoint, LoRA strength) which clear a QR scannability threshold with minimal visual distortion, storing approved results in a new `style_configs` Mongo collection.

**Architecture:** A new self-contained package `api/scripts/styletuning/` — its own Novita client, its own img2img request builder, local (non-S3) sample image storage, and three new Mongo collections (`tuning_runs`, `tuning_candidates`, `style_configs`). Stage 1 (`search.py`) runs an in-process Optuna study per style+checkpoint; Stage 1.5 (`shortlist.py`) confirms and diversely shortlists the best trials; Stage 2 (`build_review.py` + `import_ratings.py`) is a static-HTML rate-then-import loop, mirroring the existing `build_scannability_review.py` pattern. Every impure (Novita/Mongo-calling) function is split from a pure, dependency-injected core so the pure core is unit-testable without live services.

**Tech Stack:** Python 3.11, Optuna (new dependency), pymongo (sync — not the app's async Motor client; justified in Task 5), existing `novita_client`, `qrcode`, `Pillow`, `api.utils.structural_score`, `api.utils.utils.normalize_qr_url`. Tests: pytest (existing `api/tests/`, `pytest.ini` at repo root, `testpaths = api/tests`).

## Global Constraints

- Lives entirely under `api/scripts/styletuning/` — independent of `generate_controller.py`/`predict()`. Wiring production to read `style_configs` is explicitly out of scope (separate follow-up ticket).
- No S3 — sample and candidate images are saved to local disk under `api/scripts/styletuning/samples/` (gitignored).
- QR scannability scoring reuses `api.utils.structural_score.structural_score` (existing, unmodified). URL normalization reuses `api.utils.utils.normalize_qr_url` (existing, unmodified).
- Search space bounds (all configurable per style via `ParamBounds`, defaults below): `cfg_scale` 6–9, `steps` fixed at 30 (not tuned), `brightness_weight` 0.15–0.6, `monster_weight` 1.0–2.0, `monster_guidance_start` 0.2–0.5, `monster_guidance_end` 0.8–1.0, `img2img_strength` 0.5–1.0, `lora_strength` 0.3–1.2 (only sampled when the style has a LoRA).
- Stage 1 objective (single value Optuna minimizes): `threshold - min_score` when `min_score < 85`; `distortion_cost` (normalized `monster_weight` + normalized `img2img_strength`) when `min_score >= 85`. Threshold defaults to 85, configurable.
- `min_score` = worst structural score across the style's test prompts (generalization, not average).
- LoRA strength is a plain tunable float (`params["lora_strength"]`) — no prompt templating. (Confirmed during design: `ImageStyles.js` already stores LoRA strength as structured `{model_name, strength}`, not embedded in the prompt string.)
- Default trial budget: ~40 trials per style+checkpoint, search stage uses 2 test prompts × 1 seed. Confirmation stage re-runs the pooled top ~10 feasible trials (across all of a style's checkpoints) against the fuller grid (all test + confirmation prompts × 2 seeds).
- Diverse shortlist: up to 5 candidates per style, greedily selected by ascending `distortion_cost`, skipping any candidate within `min_distance` (normalized Euclidean over `cfg_scale`, `brightness_weight`, `lora_strength`, `monster_guidance_start`, `monster_guidance_end`) of an already-picked candidate; different checkpoints always count as maximally distant.
- Stage 2 review UI is a static HTML page (mirrors `api/scripts/build_scannability_review.py`): ratings auto-save to `localStorage`, exported via a "Download JSON" button, imported by a separate one-off script — no live backend writes from the browser.
- No integration tests hit real Novita or real Mongo. All new tests are pure-function/dependency-injected unit tests under `api/tests/`.
- Run tests with the project's venv: `source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_*.py -v` (repo pattern per `api/CLAUDE.md`: "Python venv: `api/venv/` — activate before running Python tools").

---

## File Structure

```
api/scripts/styletuning/
├── __init__.py
├── config.py            # StyleTuningConfig, ParamBounds, PILOT_STYLES
├── objective.py          # normalize, distortion_cost, search_objective (pure)
├── request_builder.py    # build_tuning_request — own img2img_v3 request construction
├── db.py                 # sync pymongo connect() + get_collections()
├── shortlist.py           # pick_confirmation_pool, select_diverse_shortlist (pure)
│                          #   + build_shortlist_for_style, make_real_confirm_fn, CLI main
├── search.py              # sample_params, run_study (pure/DI) + make_novita_generate_and_score, CLI main
├── build_review.py        # render_review_html, _relative_image_path (pure) + CLI main
├── import_ratings.py      # apply_ratings (pure) + CLI main
└── samples/               # gitignored; local trial + candidate images

api/scripts/styletuning/review.html   # generated output, gitignored

api/tests/
├── test_styletuning_config.py
├── test_styletuning_objective.py
├── test_styletuning_request_builder.py
├── test_styletuning_db.py
├── test_styletuning_shortlist.py
├── test_styletuning_search.py
├── test_styletuning_build_review.py
└── test_styletuning_import_ratings.py

requirements.txt   # + optuna==3.6.1
.gitignore         # + api/scripts/styletuning/samples/, api/scripts/styletuning/review.html
```

---

### Task 1: Package scaffolding + Optuna dependency

**Files:**
- Create: `api/scripts/styletuning/__init__.py`
- Modify: `requirements.txt`
- Modify: `.gitignore`

**Interfaces:**
- Produces: the `api.scripts.styletuning` package, importable by every later task.

- [ ] **Step 1: Create the package directory and empty `__init__.py`**

```bash
mkdir -p "api/scripts/styletuning/samples"
touch "api/scripts/styletuning/__init__.py"
touch "api/scripts/styletuning/samples/.gitkeep"
```

- [ ] **Step 2: Add `optuna` to `requirements.txt`**

Add this line (keep the file's existing alphabetical-ish grouping — insert near `numpy`/`packaging`):

```
optuna==3.6.1
```

- [ ] **Step 3: Add tuning-tool ignores to `.gitignore`**

Append under the existing `# python` section:

```
api/scripts/styletuning/samples/*
!api/scripts/styletuning/samples/.gitkeep
api/scripts/styletuning/review.html
```

- [ ] **Step 4: Install the new dependency and verify the package imports**

```bash
source api/venv/bin/activate && pip install optuna==3.6.1
python -c "import optuna; import api.scripts.styletuning; print('ok')"
```
Expected: `ok` printed, no import errors.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/__init__.py api/scripts/styletuning/samples/.gitkeep requirements.txt .gitignore
git commit -m "styletuning: scaffold package, add optuna dependency"
```

---

### Task 2: `config.py` — per-style pilot config and search bounds

**Files:**
- Create: `api/scripts/styletuning/config.py`
- Test: `api/tests/test_styletuning_config.py`

**Interfaces:**
- Produces: `ParamBounds` (dataclass with `.as_dict()`), `DEFAULT_PARAM_BOUNDS`, `StyleTuningConfig` (dataclass with `.has_lora`, `.confirmation_grid_prompts`), `PILOT_STYLES: dict[int, StyleTuningConfig]`. Consumed by every later task.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_config.py`:

```python
from api.scripts.styletuning.config import PILOT_STYLES, DEFAULT_PARAM_BOUNDS


def test_pilot_styles_have_required_fields():
    assert len(PILOT_STYLES) >= 2
    for style in PILOT_STYLES.values():
        assert style.style_id > 0
        assert style.style_title
        assert style.checkpoint_candidates
        assert style.search_prompts
        assert style.confirmation_prompts


def test_has_lora_matches_lora_model_name():
    doodle = PILOT_STYLES[10]
    photography = PILOT_STYLES[6]
    assert doodle.has_lora is True
    assert doodle.lora_model_name == "TUYA5_129115"
    assert photography.has_lora is False
    assert photography.lora_model_name is None


def test_confirmation_grid_prompts_is_deduplicated_union():
    doodle = PILOT_STYLES[10]
    grid = doodle.confirmation_grid_prompts
    assert set(grid) == set(doodle.search_prompts) | set(doodle.confirmation_prompts)
    assert len(grid) == len(set(grid))


def test_default_param_bounds_match_spec():
    assert DEFAULT_PARAM_BOUNDS.cfg_scale == (6.0, 9.0)
    assert DEFAULT_PARAM_BOUNDS.steps == 30
    assert DEFAULT_PARAM_BOUNDS.img2img_strength == (0.5, 1.0)
    assert DEFAULT_PARAM_BOUNDS.monster_weight == (1.0, 2.0)


def test_param_bounds_as_dict_has_all_tunable_dims():
    d = DEFAULT_PARAM_BOUNDS.as_dict()
    for key in (
        "cfg_scale", "brightness_weight", "monster_weight",
        "monster_guidance_start", "monster_guidance_end",
        "img2img_strength", "lora_strength",
    ):
        assert key in d
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_config.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'api.scripts.styletuning.config'`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/config.py`:

```python
"""Per-style pilot configuration for the tuning search: test prompts,
checkpoint candidates, and search-space bounds.

`PILOT_STYLES` holds the styles validated end-to-end before running the
pipeline across the full ImageStyles.js list. Prompts and checkpoint
candidates here are Christoph-authored defaults — edit before running a real
search.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ParamBounds:
    cfg_scale: tuple = (6.0, 9.0)
    steps: int = 30  # fixed, not tuned
    brightness_weight: tuple = (0.15, 0.6)
    monster_weight: tuple = (1.0, 2.0)
    monster_guidance_start: tuple = (0.2, 0.5)
    monster_guidance_end: tuple = (0.8, 1.0)
    img2img_strength: tuple = (0.5, 1.0)
    lora_strength: tuple = (0.3, 1.2)

    def as_dict(self) -> dict:
        return {
            "cfg_scale": self.cfg_scale,
            "brightness_weight": self.brightness_weight,
            "monster_weight": self.monster_weight,
            "monster_guidance_start": self.monster_guidance_start,
            "monster_guidance_end": self.monster_guidance_end,
            "img2img_strength": self.img2img_strength,
            "lora_strength": self.lora_strength,
        }


DEFAULT_PARAM_BOUNDS = ParamBounds()


@dataclass(frozen=True)
class StyleTuningConfig:
    style_id: int
    style_title: str
    negative_prompt: str
    checkpoint_candidates: list
    lora_model_name: object  # str | None — None if the style has no LoRA
    search_prompts: list       # reduced grid used during the Optuna search
    confirmation_prompts: list  # additional prompts added for the fuller grid
    param_bounds: ParamBounds = field(default_factory=lambda: DEFAULT_PARAM_BOUNDS)

    @property
    def has_lora(self) -> bool:
        return self.lora_model_name is not None

    @property
    def confirmation_grid_prompts(self) -> list:
        """Full prompt set for the confirmation stage: search + confirmation
        prompts, deduplicated, order-preserving."""
        seen = []
        for p in (*self.search_prompts, *self.confirmation_prompts):
            if p not in seen:
                seen.append(p)
        return seen


PILOT_STYLES = {
    10: StyleTuningConfig(
        style_id=10,
        style_title="Doodle Art",
        negative_prompt="blurry, low contrast, washed out",
        checkpoint_candidates=["colorful_v31_62333.safetensors"],
        lora_model_name="TUYA5_129115",
        search_prompts=[
            "a scattered pile of colorful building blocks",
            "a swirling ink doodle pattern",
        ],
        confirmation_prompts=[
            "a hand-drawn maze of squiggly lines",
        ],
    ),
    6: StyleTuningConfig(
        style_id=6,
        style_title="Photography",
        negative_prompt="blurry, low contrast, washed out",
        checkpoint_candidates=["cyberrealistic_v40_151857.safetensors"],
        lora_model_name=None,
        search_prompts=[
            "a coastal cliff at golden hour",
            "a bustling farmers market stall",
        ],
        confirmation_prompts=[
            "a foggy pine forest trail",
        ],
    ),
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_config.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/config.py api/tests/test_styletuning_config.py
git commit -m "styletuning: add per-style pilot config and search bounds"
```

---

### Task 3: `objective.py` — distortion cost and Stage 1 objective

**Files:**
- Create: `api/scripts/styletuning/objective.py`
- Test: `api/tests/test_styletuning_objective.py`

**Interfaces:**
- Consumes: nothing (pure, no dependency on `config.py` — bounds are passed in by the caller, typically `style.param_bounds.as_dict()`).
- Produces: `DEFAULT_THRESHOLD`, `DISTORTION_DIMS`, `normalize(value, bounds)`, `distortion_cost(params, bounds)`, `search_objective(min_score, cost, threshold=DEFAULT_THRESHOLD)`. Consumed by `search.py` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_objective.py`:

```python
from api.scripts.styletuning.objective import distortion_cost, normalize, search_objective

BOUNDS = {"monster_weight": (1.0, 2.0), "img2img_strength": (0.5, 1.0)}


def test_normalize_maps_bounds_to_0_1():
    assert normalize(1.0, (1.0, 2.0)) == 0.0
    assert normalize(2.0, (1.0, 2.0)) == 1.0
    assert normalize(1.5, (1.0, 2.0)) == 0.5


def test_distortion_cost_sums_normalized_params():
    params = {"monster_weight": 1.5, "img2img_strength": 0.75}
    assert distortion_cost(params, BOUNDS) == 1.0


def test_distortion_cost_at_lower_bounds_is_zero():
    params = {"monster_weight": 1.0, "img2img_strength": 0.5}
    assert distortion_cost(params, BOUNDS) == 0.0


def test_distortion_cost_ignores_extra_param_keys():
    params = {"monster_weight": 1.0, "img2img_strength": 0.5, "cfg_scale": 7.0}
    assert distortion_cost(params, BOUNDS) == 0.0


def test_objective_penalizes_below_threshold():
    assert search_objective(min_score=70.0, cost=0.3, threshold=85.0) == 15.0


def test_objective_rewards_distortion_cost_when_feasible():
    assert search_objective(min_score=90.0, cost=0.42, threshold=85.0) == 0.42


def test_objective_at_exact_threshold_uses_cost_branch():
    assert search_objective(min_score=85.0, cost=0.2, threshold=85.0) == 0.2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_objective.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'api.scripts.styletuning.objective'`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/objective.py`:

```python
"""Pure scoring/objective functions for the Stage 1 Optuna search.

Objective (single value Optuna minimizes):
  - min_score < threshold: `threshold - min_score` (penalty, pulls the
    search toward the feasible region).
  - min_score >= threshold: `distortion_cost` (once feasible, reward the
    least-mangled params — clearing the threshold is easy, avoiding a
    scannable-but-ugly result is the actual objective).
"""
from __future__ import annotations

DEFAULT_THRESHOLD = 85.0

# The two params that most directly force the QR pattern over the art.
DISTORTION_DIMS = ("monster_weight", "img2img_strength")


def normalize(value: float, bounds: tuple) -> float:
    lo, hi = bounds
    return (value - lo) / (hi - lo)


def distortion_cost(params: dict, bounds: dict) -> float:
    """`bounds` maps each of DISTORTION_DIMS to its (lo, hi) search range —
    typically `style.param_bounds.as_dict()`. Extra keys in `bounds` are
    ignored."""
    return sum(normalize(params[name], bounds[name]) for name in DISTORTION_DIMS)


def search_objective(min_score: float, cost: float, threshold: float = DEFAULT_THRESHOLD) -> float:
    if min_score < threshold:
        return threshold - min_score
    return cost
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_objective.py -v
```
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/objective.py api/tests/test_styletuning_objective.py
git commit -m "styletuning: add distortion-cost and Stage 1 objective function"
```

---

### Task 4: `request_builder.py` — independent img2img_v3 request construction

**Files:**
- Create: `api/scripts/styletuning/request_builder.py`
- Test: `api/tests/test_styletuning_request_builder.py`

**Interfaces:**
- Consumes: `novita_client.Img2ImgV3ControlNetUnit`, `novita_client.Img2V3ImgLoRA` (existing, already in `requirements.txt`).
- Produces: `build_tuning_request(*, prompt, negative_prompt, sd_model, seed, qr_image_base64, params, lora_model_name) -> dict`. Consumed by `search.py` (Task 7) and `shortlist.py` (Task 8). `params` must contain `cfg_scale`, `steps`, `brightness_weight`, `monster_weight`, `monster_guidance_start`, `monster_guidance_end`, `img2img_strength`, and (only if `lora_model_name is not None`) `lora_strength`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_request_builder.py`:

```python
from api.scripts.styletuning.request_builder import build_tuning_request

PARAMS = dict(
    cfg_scale=7.5,
    steps=30,
    brightness_weight=0.4,
    monster_weight=1.6,
    monster_guidance_start=0.35,
    monster_guidance_end=0.9,
    img2img_strength=0.8,
    lora_strength=0.7,
)


def test_build_request_sets_top_level_fields():
    req = build_tuning_request(
        prompt="test prompt",
        negative_prompt="blurry",
        sd_model="colorful_v31_62333.safetensors",
        seed=42,
        qr_image_base64="AAAA",
        params=PARAMS,
        lora_model_name=None,
    )
    assert req["model_name"] == "colorful_v31_62333.safetensors"
    assert req["prompt"] == "test prompt"
    assert req["negative_prompt"] == "blurry"
    assert req["seed"] == 42
    assert req["steps"] == 30
    assert req["guidance_scale"] == 7.5
    assert req["strength"] == 0.8
    assert req["image_num"] == 1
    assert req["loras"] == []


def test_build_request_adds_lora_when_configured():
    req = build_tuning_request(
        prompt="test prompt",
        negative_prompt="blurry",
        sd_model="colorful_v31_62333.safetensors",
        seed=42,
        qr_image_base64="AAAA",
        params=PARAMS,
        lora_model_name="TUYA5_129115",
    )
    assert len(req["loras"]) == 1
    assert req["loras"][0].model_name == "TUYA5_129115"
    assert req["loras"][0].strength == 0.7


def test_build_request_controlnet_units_use_tuned_params():
    req = build_tuning_request(
        prompt="test prompt",
        negative_prompt="blurry",
        sd_model="colorful_v31_62333.safetensors",
        seed=42,
        qr_image_base64="AAAA",
        params=PARAMS,
        lora_model_name=None,
    )
    brightness, monster = req["controlnet_units"]
    assert brightness.model_name == "control_v1p_sd15_brightness"
    assert brightness.strength == 0.4
    assert brightness.preprocessor is None
    assert monster.model_name == "control_v1p_sd15_qrcode_monster_v2"
    assert monster.strength == 1.6
    assert monster.guidance_start == 0.35
    assert monster.guidance_end == 0.9
    assert monster.preprocessor is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_request_builder.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/request_builder.py`:

```python
"""Independent img2img_v3 request construction for the tuning search — full
control over every ControlNet/LoRA/checkpoint param, no qr_weight formula.

Mirrors the load-bearing Novita quirks documented in api/utils/CLAUDE.md:
`preprocessor=None` (not the string "none"), and a flat neutral-gray init
image with the tuned `img2img_strength` so the model paints freely while the
QR is enforced purely via ControlNet.
"""
from __future__ import annotations

import base64
from io import BytesIO

from PIL import Image
from novita_client import Img2ImgV3ControlNetUnit, Img2V3ImgLoRA

SIDE = 768


def gray_init_image_base64(side: int = SIDE) -> str:
    gray = Image.new("RGB", (side, side), (128, 128, 128))
    buf = BytesIO()
    gray.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_tuning_request(
    *,
    prompt: str,
    negative_prompt: str,
    sd_model: str,
    seed: int,
    qr_image_base64: str,
    params: dict,
    lora_model_name,
) -> dict:
    loras = []
    if lora_model_name is not None:
        loras.append(Img2V3ImgLoRA(model_name=lora_model_name, strength=params["lora_strength"]))

    return dict(
        model_name=sd_model,
        input_image=gray_init_image_base64(),
        prompt=prompt,
        negative_prompt=negative_prompt,
        sampler_name="DPM++ 2M Karras",
        width=SIDE,
        height=SIDE,
        steps=params["steps"],
        guidance_scale=params["cfg_scale"],
        seed=int(seed),
        image_num=1,
        strength=params["img2img_strength"],
        loras=loras,
        controlnet_units=[
            Img2ImgV3ControlNetUnit(
                image_base64=qr_image_base64,
                model_name="control_v1p_sd15_brightness",
                strength=params["brightness_weight"],
                preprocessor=None,
                guidance_start=0.15,
                guidance_end=0.6,
            ),
            Img2ImgV3ControlNetUnit(
                image_base64=qr_image_base64,
                model_name="control_v1p_sd15_qrcode_monster_v2",
                strength=params["monster_weight"],
                preprocessor=None,
                guidance_start=params["monster_guidance_start"],
                guidance_end=params["monster_guidance_end"],
            ),
        ],
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_request_builder.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/request_builder.py api/tests/test_styletuning_request_builder.py
git commit -m "styletuning: add independent img2img_v3 request builder"
```

---

### Task 5: `db.py` — Mongo connection and collection access

**Files:**
- Create: `api/scripts/styletuning/db.py`
- Test: `api/tests/test_styletuning_db.py`

**Interfaces:**
- Produces: `DB_NAME`, `TUNING_RUNS`, `TUNING_CANDIDATES`, `STYLE_CONFIGS`, `connect()`, `get_collections(db) -> dict`. Consumed by `search.py`, `shortlist.py`, `build_review.py`, `import_ratings.py`.

**Why sync pymongo, not the app's async Motor client:** every other script in `api/scripts/` uses Motor + `asyncio.run(main())`. This tool deviates deliberately: Optuna's `study.optimize()` is a synchronous, blocking API, and the Novita client calls in this tool are already synchronous (unlike `generate_controller.py`, there's no surrounding async FastAPI request to keep free). Wrapping an async Mongo client around an inherently synchronous, sequential trial loop would need awkward `asyncio.to_thread` calls for no benefit. `pymongo` is already an installed transitive dependency of `motor` and is listed directly in `requirements.txt`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_db.py`:

```python
from api.scripts.styletuning.db import (
    STYLE_CONFIGS,
    TUNING_CANDIDATES,
    TUNING_RUNS,
    get_collections,
)


class FakeDb:
    def __init__(self):
        self.requested = []

    def get_collection(self, name):
        self.requested.append(name)
        return f"collection:{name}"


def test_get_collections_returns_all_three():
    fake_db = FakeDb()
    cols = get_collections(fake_db)
    assert cols["tuning_runs"] == f"collection:{TUNING_RUNS}"
    assert cols["tuning_candidates"] == f"collection:{TUNING_CANDIDATES}"
    assert cols["style_configs"] == f"collection:{STYLE_CONFIGS}"
    assert fake_db.requested == [TUNING_RUNS, TUNING_CANDIDATES, STYLE_CONFIGS]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_db.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/db.py`:

```python
"""Mongo connection + collection access for the tuning pipeline.

Uses synchronous pymongo (not the app's async Motor client) — see the
rationale in the implementation plan / Task 5. Same QART database as
production; three new collections dedicated to this tool.
"""
from __future__ import annotations

import os

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

DB_NAME = "QART"
TUNING_RUNS = "tuning_runs"
TUNING_CANDIDATES = "tuning_candidates"
STYLE_CONFIGS = "style_configs"


def connect():
    """Connect to the QART Mongo database using MONGO_URL from the environment."""
    load_dotenv()
    mongo_url = os.environ["MONGO_URL"]
    tls = {"tlsCAFile": certifi.where()} if "localhost" not in mongo_url else {}
    client = MongoClient(mongo_url, **tls)
    return client.get_database(DB_NAME)


def get_collections(db) -> dict:
    """Return the three tuning collections from a given database handle.

    Takes `db` as a parameter (rather than connecting itself) so callers can
    inject a fake/stub database in tests without touching real Mongo.
    """
    return {
        "tuning_runs": db.get_collection(TUNING_RUNS),
        "tuning_candidates": db.get_collection(TUNING_CANDIDATES),
        "style_configs": db.get_collection(STYLE_CONFIGS),
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_db.py -v
```
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/db.py api/tests/test_styletuning_db.py
git commit -m "styletuning: add sync Mongo connection and collection access"
```

---

### Task 6: `shortlist.py` (part 1) — confirmation pool + diverse shortlist selection

**Files:**
- Create: `api/scripts/styletuning/shortlist.py`
- Test: `api/tests/test_styletuning_shortlist.py`

**Interfaces:**
- Consumes: `config.DEFAULT_PARAM_BOUNDS.as_dict()`-shaped bounds dicts (Task 2).
- Produces: `pick_confirmation_pool(trials, top_n=10) -> list[dict]`, `select_diverse_shortlist(candidates, bounds, max_count=5, min_distance=0.3) -> list[dict]`. Consumed later in this same file by `build_shortlist_for_style` (Task 8).

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_shortlist.py`:

```python
from api.scripts.styletuning.config import DEFAULT_PARAM_BOUNDS
from api.scripts.styletuning.shortlist import pick_confirmation_pool, select_diverse_shortlist

BOUNDS = DEFAULT_PARAM_BOUNDS.as_dict()


def _trial(distortion, feasible=True):
    return {"distortion_cost": distortion, "feasible": feasible}


def test_pick_confirmation_pool_filters_infeasible_and_sorts():
    trials = [_trial(0.5), _trial(0.1), _trial(0.9, feasible=False), _trial(0.3)]
    pool = pick_confirmation_pool(trials, top_n=10)
    assert [t["distortion_cost"] for t in pool] == [0.1, 0.3, 0.5]


def test_pick_confirmation_pool_respects_top_n():
    trials = [_trial(i * 0.1) for i in range(20)]
    pool = pick_confirmation_pool(trials, top_n=5)
    assert len(pool) == 5
    assert pool[0]["distortion_cost"] == 0.0


def _candidate(checkpoint, distortion, **params):
    return {"checkpoint": checkpoint, "distortion_cost": distortion, "params": params}


def test_select_diverse_shortlist_skips_near_identical_candidates():
    candidates = [
        _candidate("ckpt-a", 0.1, cfg_scale=7.0, brightness_weight=0.3, lora_strength=0.7,
                   monster_guidance_start=0.3, monster_guidance_end=0.9),
        _candidate("ckpt-a", 0.12, cfg_scale=7.01, brightness_weight=0.3, lora_strength=0.7,
                   monster_guidance_start=0.3, monster_guidance_end=0.9),
        _candidate("ckpt-a", 0.4, cfg_scale=8.5, brightness_weight=0.55, lora_strength=0.4,
                   monster_guidance_start=0.45, monster_guidance_end=0.85),
    ]
    shortlist = select_diverse_shortlist(candidates, BOUNDS, max_count=5, min_distance=0.3)
    assert len(shortlist) == 2
    assert shortlist[0]["distortion_cost"] == 0.1
    assert shortlist[1]["distortion_cost"] == 0.4


def test_select_diverse_shortlist_treats_different_checkpoints_as_always_distinct():
    candidates = [
        _candidate("ckpt-a", 0.1, cfg_scale=7.0, brightness_weight=0.3, lora_strength=0.7,
                   monster_guidance_start=0.3, monster_guidance_end=0.9),
        _candidate("ckpt-b", 0.11, cfg_scale=7.0, brightness_weight=0.3, lora_strength=0.7,
                   monster_guidance_start=0.3, monster_guidance_end=0.9),
    ]
    shortlist = select_diverse_shortlist(candidates, BOUNDS, max_count=5, min_distance=0.3)
    assert len(shortlist) == 2


def test_select_diverse_shortlist_caps_at_max_count():
    candidates = [
        _candidate(f"ckpt-{i}", i * 0.05, cfg_scale=6.0 + i, brightness_weight=0.2, lora_strength=0.5,
                   monster_guidance_start=0.3, monster_guidance_end=0.9)
        for i in range(10)
    ]
    shortlist = select_diverse_shortlist(candidates, BOUNDS, max_count=5, min_distance=0.0)
    assert len(shortlist) == 5
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_shortlist.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/shortlist.py`:

```python
"""Stage 1.5 — confirmation grid pooling and diverse shortlist selection.

This module holds two layers:
  1. Pure functions (this task): `pick_confirmation_pool`,
     `select_diverse_shortlist` — no I/O, fully unit-tested.
  2. Orchestration + CLI (Task 8, appended below): `build_shortlist_for_style`,
     `make_real_confirm_fn`, `main()` — wire the pure functions to real
     Novita generation and Mongo reads/writes.
"""
from __future__ import annotations

FREE_DIMS = (
    "cfg_scale",
    "brightness_weight",
    "lora_strength",
    "monster_guidance_start",
    "monster_guidance_end",
)


def pick_confirmation_pool(trials: list, top_n: int = 10) -> list:
    """Feasible trials, sorted by ascending distortion_cost, capped at top_n."""
    feasible = [t for t in trials if t.get("feasible")]
    return sorted(feasible, key=lambda t: t["distortion_cost"])[:top_n]


def _free_dim_distance(a: dict, b: dict, bounds: dict) -> float:
    if a.get("checkpoint") != b.get("checkpoint"):
        return float("inf")
    total = 0.0
    for dim in FREE_DIMS:
        av, bv = a["params"].get(dim), b["params"].get(dim)
        if av is None or bv is None:
            continue
        lo, hi = bounds[dim]
        total += ((av - bv) / (hi - lo)) ** 2
    return total ** 0.5


def select_diverse_shortlist(
    candidates: list, bounds: dict, max_count: int = 5, min_distance: float = 0.3
) -> list:
    """Greedily pick up to max_count candidates: least distortion first, each
    at least min_distance from every candidate already picked (normalized
    Euclidean over FREE_DIMS; different checkpoints are always maximally
    distant)."""
    ranked = sorted(candidates, key=lambda c: c["distortion_cost"])
    selected: list = []
    for candidate in ranked:
        if len(selected) >= max_count:
            break
        if all(_free_dim_distance(candidate, chosen, bounds) >= min_distance for chosen in selected):
            selected.append(candidate)
    return selected
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_shortlist.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/shortlist.py api/tests/test_styletuning_shortlist.py
git commit -m "styletuning: add confirmation pooling and diverse shortlist selection"
```

---

### Task 7: `search.py` — Stage 1 Optuna search (CLI)

**Files:**
- Create: `api/scripts/styletuning/search.py`
- Test: `api/tests/test_styletuning_search.py`

**Interfaces:**
- Consumes: `config.StyleTuningConfig`, `config.ParamBounds`, `config.PILOT_STYLES` (Task 2); `objective.distortion_cost`, `objective.search_objective`, `objective.DEFAULT_THRESHOLD` (Task 3); `request_builder.build_tuning_request` (Task 4); `db.connect`, `db.get_collections` (Task 5); `api.utils.structural_score.structural_score`, `api.utils.utils.normalize_qr_url` (existing).
- Produces: `sample_params(trial, bounds, has_lora) -> dict`, `run_study(style, checkpoint, n_trials, seed, generate_and_score, sink, threshold=DEFAULT_THRESHOLD) -> optuna.Study`, `make_novita_generate_and_score(negative_prompt, lora_model_name, samples_dir) -> callable`. `run_study` and `make_novita_generate_and_score` are both consumed by `shortlist.py` (Task 8) — `run_study`'s trial-doc shape is what `tuning_runs` documents look like, and `make_novita_generate_and_score`'s returned callable (`fn(params, checkpoint, prompt, seed) -> (score, image_path)`) is reused directly by the confirmation step.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_search.py`:

```python
from api.scripts.styletuning.config import ParamBounds, StyleTuningConfig
from api.scripts.styletuning.search import run_study


def _style(has_lora=False):
    return StyleTuningConfig(
        style_id=99,
        style_title="Test Style",
        negative_prompt="blurry",
        checkpoint_candidates=["ckpt-a"],
        lora_model_name="test_lora" if has_lora else None,
        search_prompts=["prompt one", "prompt two"],
        confirmation_prompts=["prompt three"],
        param_bounds=ParamBounds(),
    )


def test_run_study_writes_one_trial_doc_per_trial():
    style = _style()
    sunk = []

    def fake_generate_and_score(params, checkpoint, prompt, seed):
        return 90.0, f"/fake/{checkpoint}/{prompt}.png"

    run_study(style, "ckpt-a", n_trials=3, seed=1,
              generate_and_score=fake_generate_and_score, sink=sunk.append)

    assert len(sunk) == 3
    doc = sunk[0]
    assert doc["style_id"] == 99
    assert doc["checkpoint"] == "ckpt-a"
    assert doc["min_score"] == 90.0
    assert doc["feasible"] is True
    assert len(doc["per_prompt_scores"]) == 2
    assert "lora_strength" not in doc["params"]


def test_run_study_includes_lora_strength_when_style_has_lora():
    style = _style(has_lora=True)
    sunk = []

    def fake_generate_and_score(params, checkpoint, prompt, seed):
        return 90.0, "/fake.png"

    run_study(style, "ckpt-a", n_trials=1, seed=1,
              generate_and_score=fake_generate_and_score, sink=sunk.append)

    assert "lora_strength" in sunk[0]["params"]


def test_run_study_marks_low_scores_infeasible():
    style = _style()
    sunk = []

    def fake_generate_and_score(params, checkpoint, prompt, seed):
        return 50.0, "/fake.png"

    run_study(style, "ckpt-a", n_trials=1, seed=1,
              generate_and_score=fake_generate_and_score, sink=sunk.append)

    assert sunk[0]["feasible"] is False
    assert sunk[0]["min_score"] == 50.0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_search.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/search.py`:

```python
"""Stage 1 automated search — CLI entrypoint.

Runs one Optuna study for a single style+checkpoint combination: samples
params from the search space, generates against each of the style's reduced
search prompts, scores with the existing structural QR scorer, and mirrors
every trial (feasible or not) into the tuning_runs Mongo collection.

Run from the repo root:
    python -m api.scripts.styletuning.search --style-id 10 \
        --checkpoint colorful_v31_62333.safetensors --trials 40

Requires MONGO_URL and NOVITA_KEY in the environment (sourced from .env).
"""
from __future__ import annotations

import argparse
import base64
import logging
import os
from datetime import datetime, timezone
from io import BytesIO

import httpx
import optuna
import qrcode
from PIL import Image
from novita_client import NovitaClient

from api.scripts.styletuning.config import PILOT_STYLES, ParamBounds, StyleTuningConfig
from api.scripts.styletuning.db import connect, get_collections
from api.scripts.styletuning.objective import DEFAULT_THRESHOLD, distortion_cost, search_objective
from api.scripts.styletuning.request_builder import build_tuning_request
from api.utils.structural_score import structural_score
from api.utils.utils import normalize_qr_url

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)
optuna.logging.set_verbosity(optuna.logging.WARNING)

TEST_URL = "https://qr-ai.co"
GENERATE_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


def sample_params(trial: "optuna.Trial", bounds: ParamBounds, has_lora: bool) -> dict:
    """Sample one trial's params from the search space bounds."""
    params = {
        "cfg_scale": trial.suggest_float("cfg_scale", *bounds.cfg_scale),
        "steps": bounds.steps,
        "brightness_weight": trial.suggest_float("brightness_weight", *bounds.brightness_weight),
        "monster_weight": trial.suggest_float("monster_weight", *bounds.monster_weight),
        "monster_guidance_start": trial.suggest_float(
            "monster_guidance_start", *bounds.monster_guidance_start
        ),
        "monster_guidance_end": trial.suggest_float("monster_guidance_end", *bounds.monster_guidance_end),
        "img2img_strength": trial.suggest_float("img2img_strength", *bounds.img2img_strength),
    }
    if has_lora:
        params["lora_strength"] = trial.suggest_float("lora_strength", *bounds.lora_strength)
    return params


def run_study(
    style: StyleTuningConfig,
    checkpoint: str,
    n_trials: int,
    seed: int,
    generate_and_score,
    sink,
    threshold: float = DEFAULT_THRESHOLD,
) -> "optuna.Study":
    """Run one Optuna study for `style` against `checkpoint`.

    `generate_and_score(params, checkpoint, prompt, seed) -> (score, image_path)`
    performs one generation and scores it. `sink(trial_doc)` is called once
    per trial with the full tuning_runs-shaped document, regardless of
    feasibility — this is the audit-trail requirement.
    """
    study = optuna.create_study(direction="minimize")

    def objective(trial: "optuna.Trial") -> float:
        params = sample_params(trial, style.param_bounds, style.has_lora)
        per_prompt_scores = []
        for prompt in style.search_prompts:
            score, image_path = generate_and_score(params, checkpoint, prompt, seed)
            per_prompt_scores.append(
                {"prompt": prompt, "seed": seed, "score": score, "image_path": image_path}
            )
        min_score = min(p["score"] for p in per_prompt_scores)
        cost = distortion_cost(params, style.param_bounds.as_dict())
        trial_doc = {
            "style_id": style.style_id,
            "style_title": style.style_title,
            "checkpoint": checkpoint,
            "trial_number": trial.number,
            "params": params,
            "prompts_used": list(style.search_prompts),
            "seed": seed,
            "per_prompt_scores": per_prompt_scores,
            "min_score": min_score,
            "distortion_cost": cost,
            "feasible": min_score >= threshold,
            "created_at": datetime.now(timezone.utc),
        }
        sink(trial_doc)
        return search_objective(min_score, cost, threshold)

    study.optimize(objective, n_trials=n_trials)
    return study


def _qr_image_base64(url: str) -> str:
    qr = qrcode.QRCode(
        version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4
    )
    qr.add_data(normalize_qr_url(url))
    qr_image = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    qr_image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def make_novita_generate_and_score(negative_prompt: str, lora_model_name, samples_dir: str):
    """Build a real generate_and_score callback backed by the Novita API.
    Reused as-is by shortlist.py's confirmation step (Task 8) — the callback
    is checkpoint-parametrized per call, not bound to one checkpoint."""
    client = NovitaClient(os.environ["NOVITA_KEY"])
    qr_image_base64 = _qr_image_base64(TEST_URL)
    os.makedirs(samples_dir, exist_ok=True)

    def generate_and_score(params: dict, checkpoint: str, prompt: str, seed: int):
        req = build_tuning_request(
            prompt=prompt,
            negative_prompt=negative_prompt,
            sd_model=checkpoint,
            seed=seed,
            qr_image_base64=qr_image_base64,
            params=params,
            lora_model_name=lora_model_name,
        )
        result = client.img2img_v3(**req)
        res = client.wait_for_task_v3(result.task.task_id)
        image_url = res.get_image_urls()[0]
        image_bytes = httpx.get(image_url, timeout=GENERATE_TIMEOUT).content
        image = Image.open(BytesIO(image_bytes))
        score_result = structural_score(image, normalize_qr_url(TEST_URL))
        safe_prompt = "".join(c if c.isalnum() else "_" for c in prompt)[:30]
        image_path = os.path.join(samples_dir, f"{checkpoint}_{safe_prompt}_{seed}.png")
        image.save(image_path)
        return score_result.score, image_path

    return generate_and_score


def main():
    parser = argparse.ArgumentParser(description="Run a Stage 1 tuning search for one style+checkpoint.")
    parser.add_argument("--style-id", type=int, required=True)
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--trials", type=int, default=40)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args()

    style = PILOT_STYLES[args.style_id]
    if args.checkpoint not in style.checkpoint_candidates:
        raise SystemExit(
            f"{args.checkpoint!r} is not a configured checkpoint candidate for {style.style_title}"
        )

    db = connect()
    collections = get_collections(db)
    samples_dir = os.path.join(
        os.path.dirname(__file__), "samples", style.style_title.replace(" ", "_"), args.checkpoint
    )
    generate_and_score = make_novita_generate_and_score(
        style.negative_prompt, style.lora_model_name, samples_dir
    )

    def sink(trial_doc: dict) -> None:
        collections["tuning_runs"].insert_one(trial_doc)
        logger.info(
            "trial %d min_score=%.1f distortion=%.3f feasible=%s",
            trial_doc["trial_number"], trial_doc["min_score"],
            trial_doc["distortion_cost"], trial_doc["feasible"],
        )

    run_study(style, args.checkpoint, args.trials, args.seed, generate_and_score, sink)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_search.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/search.py api/tests/test_styletuning_search.py
git commit -m "styletuning: add Stage 1 Optuna search CLI"
```

---

### Task 8: `shortlist.py` (part 2) — confirmation + shortlist orchestration (CLI)

**Files:**
- Modify: `api/scripts/styletuning/shortlist.py` (append to the file created in Task 6)
- Modify: `api/tests/test_styletuning_shortlist.py` (append tests)

**Interfaces:**
- Consumes: `pick_confirmation_pool`, `select_diverse_shortlist` (Task 6, same file); `config.StyleTuningConfig`, `config.PILOT_STYLES` (Task 2); `objective.DEFAULT_THRESHOLD` (Task 3); `db.connect`, `db.get_collections` (Task 5); `search.make_novita_generate_and_score` (Task 7).
- Produces: `build_shortlist_for_style(style, trials, confirm_fn, max_count=5, min_distance=0.3, top_n_to_confirm=10) -> list[dict]`, `make_real_confirm_fn(style, generate_and_score, threshold=DEFAULT_THRESHOLD) -> callable`, CLI `main()`. `build_shortlist_for_style`'s output shape (candidate dicts with `confirmation_grid_scores`, `params`, `style_title`, `distortion_cost`, `min_score`, `checkpoint`, `trial_number`) is what Task 9's `build_review.py` reads back out of `tuning_candidates`.

- [ ] **Step 1: Write the failing test**

Append to `api/tests/test_styletuning_shortlist.py`:

```python
from api.scripts.styletuning.config import ParamBounds, StyleTuningConfig
from api.scripts.styletuning.shortlist import build_shortlist_for_style


def _style_for_build():
    return StyleTuningConfig(
        style_id=42,
        style_title="Build Test Style",
        negative_prompt="blurry",
        checkpoint_candidates=["ckpt-a"],
        lora_model_name=None,
        search_prompts=["p1", "p2"],
        confirmation_prompts=["p3"],
        param_bounds=ParamBounds(),
    )


def _trial_for_build(distortion, checkpoint="ckpt-a"):
    return {
        "style_id": 42,
        "style_title": "Build Test Style",
        "checkpoint": checkpoint,
        "trial_number": 1,
        "distortion_cost": distortion,
        "feasible": True,
        "params": {
            "cfg_scale": 7.0, "brightness_weight": 0.3, "lora_strength": None,
            "monster_guidance_start": 0.3, "monster_guidance_end": 0.9,
        },
    }


def test_build_shortlist_for_style_filters_reconfirmation_failures():
    style = _style_for_build()
    trials = [_trial_for_build(0.1), _trial_for_build(0.2)]

    def confirm_fn(trial):
        if trial["distortion_cost"] == 0.2:
            return None  # failed to reconfirm on the fuller grid
        return {
            **trial,
            "confirmation_grid_scores": [
                {"prompt": "p", "seed": 1, "score": 90.0, "image_path": "x"}
            ],
        }

    shortlist = build_shortlist_for_style(style, trials, confirm_fn, min_distance=0.3)
    assert len(shortlist) == 1
    assert shortlist[0]["distortion_cost"] == 0.1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_shortlist.py -v
```
Expected: FAIL — `ImportError: cannot import name 'build_shortlist_for_style'`.

- [ ] **Step 3: Append the orchestration + CLI implementation**

Append to `api/scripts/styletuning/shortlist.py` (add these imports to the top of the file alongside the existing `from __future__ import annotations`, then add the functions below the existing pure functions):

```python
import argparse
import logging
import os
from datetime import datetime, timezone

from api.scripts.styletuning.config import PILOT_STYLES, StyleTuningConfig
from api.scripts.styletuning.db import connect, get_collections
from api.scripts.styletuning.objective import DEFAULT_THRESHOLD
from api.scripts.styletuning.search import make_novita_generate_and_score

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def build_shortlist_for_style(
    style: StyleTuningConfig,
    trials: list,
    confirm_fn,
    max_count: int = 5,
    min_distance: float = 0.3,
    top_n_to_confirm: int = 10,
) -> list:
    """Pool feasible trials across all of a style's checkpoints, re-confirm
    the best `top_n_to_confirm` on the fuller grid via `confirm_fn`, then
    select a diverse shortlist of up to `max_count` confirmed candidates.

    `confirm_fn(trial: dict) -> dict | None` re-runs one trial's params
    against the fuller confirmation grid and returns an updated trial dict
    (with `confirmation_grid_scores` and a possibly-updated `min_score`) if
    still feasible, or None if it failed to reconfirm.
    """
    pool = pick_confirmation_pool(trials, top_n=top_n_to_confirm)
    confirmed = [c for c in (confirm_fn(t) for t in pool) if c is not None]
    bounds = style.param_bounds.as_dict()
    return select_diverse_shortlist(confirmed, bounds, max_count=max_count, min_distance=min_distance)


def make_real_confirm_fn(style: StyleTuningConfig, generate_and_score, threshold: float = DEFAULT_THRESHOLD):
    """Build a confirm_fn backed by real Novita generation against the fuller
    confirmation grid (all test prompts x 2 seeds)."""

    def confirm_fn(trial: dict):
        scores = []
        for prompt in style.confirmation_grid_prompts:
            for seed in (1, 2):
                score, image_path = generate_and_score(trial["params"], trial["checkpoint"], prompt, seed)
                scores.append({"prompt": prompt, "seed": seed, "score": score, "image_path": image_path})
        min_score = min(s["score"] for s in scores)
        if min_score < threshold:
            return None
        return {**trial, "confirmation_grid_scores": scores, "min_score": min_score}

    return confirm_fn


def main():
    parser = argparse.ArgumentParser(description="Confirm + shortlist Stage 1 trials for one style.")
    parser.add_argument("--style-id", type=int, required=True)
    parser.add_argument("--max-candidates", type=int, default=5)
    args = parser.parse_args()

    style = PILOT_STYLES[args.style_id]
    db = connect()
    collections = get_collections(db)

    trials = list(collections["tuning_runs"].find({"style_id": style.style_id}))
    if not trials:
        logger.warning("No tuning_runs found for style_id=%d — run search.py first.", style.style_id)
        return

    samples_dir = os.path.join(
        os.path.dirname(__file__), "samples", style.style_title.replace(" ", "_"), "candidates"
    )
    generate_and_score = make_novita_generate_and_score(style.negative_prompt, style.lora_model_name, samples_dir)
    confirm_fn = make_real_confirm_fn(style, generate_and_score)

    shortlist = build_shortlist_for_style(style, trials, confirm_fn, max_count=args.max_candidates)

    if not shortlist:
        logger.warning("Style %s: no trials survived confirmation — shortlist is empty.", style.style_title)
        return

    for candidate in shortlist:
        doc = {
            "run_ref": {
                "style_id": style.style_id,
                "checkpoint": candidate["checkpoint"],
                "trial_number": candidate["trial_number"],
            },
            "style_title": style.style_title,
            "params": candidate["params"],
            "min_score": candidate["min_score"],
            "distortion_cost": candidate["distortion_cost"],
            "confirmation_grid_scores": candidate["confirmation_grid_scores"],
            "sample_image_paths": [s["image_path"] for s in candidate["confirmation_grid_scores"]],
            "status": "pending",
            "rating": None,
            "notes": None,
            "reviewed_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        collections["tuning_candidates"].insert_one(doc)

    logger.info("Style %s: wrote %d shortlisted candidates.", style.style_title, len(shortlist))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_shortlist.py -v
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/shortlist.py api/tests/test_styletuning_shortlist.py
git commit -m "styletuning: add confirmation + shortlist orchestration CLI"
```

---

### Task 9: `build_review.py` — Stage 2 static review page generator

**Files:**
- Create: `api/scripts/styletuning/build_review.py`
- Test: `api/tests/test_styletuning_build_review.py`

**Interfaces:**
- Consumes: `db.connect`, `db.get_collections` (Task 5). Reads `tuning_candidates` docs shaped as written by Task 8's `main()` (`run_ref.style_id`, `run_ref.checkpoint`, `style_title`, `min_score`, `distortion_cost`, `params`, `confirmation_grid_scores`).
- Produces: `render_review_html(candidates: list[dict]) -> str`, `_relative_image_path(image_path: str) -> str`, CLI `main()` writing `review.html`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_build_review.py`:

```python
from pathlib import Path

from api.scripts.styletuning import build_review


def test_render_review_html_includes_candidate_data():
    module_dir = Path(build_review.__file__).parent
    image_path = str(module_dir / "samples" / "x.png")
    candidates = [
        {
            "candidate_id": "abc123",
            "style_id": 10,
            "style_title": "Doodle Art",
            "min_score": 91.2,
            "distortion_cost": 0.35,
            "params": {"cfg_scale": 7.5},
            "confirmation_grid_scores": [
                {"prompt": "a swirling ink doodle pattern", "seed": 1, "score": 90.0, "image_path": image_path},
            ],
        }
    ]
    html = build_review.render_review_html(candidates)
    assert "abc123" in html
    assert "Doodle Art" in html
    assert "a swirling ink doodle pattern" in html
    assert "91.2" in html


def test_relative_image_path_computes_path_relative_to_module_dir():
    import os

    module_dir = Path(build_review.__file__).parent
    abs_path = str(module_dir / "samples" / "candidates" / "img.png")
    rel = build_review._relative_image_path(abs_path)
    assert rel == os.path.join("samples", "candidates", "img.png")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_build_review.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/build_review.py`:

```python
"""One-off script: build a self-contained HTML page for rating shortlisted
per-style tuning candidates (Stage 2 review).

Run from the repo root:
    python -m api.scripts.styletuning.build_review

Requires MONGO_URL in the environment (sourced from .env automatically).
Writes api/scripts/styletuning/review.html — open it directly in a browser.
Ratings auto-save to the browser's localStorage; use the page's "Download
JSON" button to export them, then run import_ratings.py.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from api.scripts.styletuning.db import connect, get_collections

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_PATH = Path(__file__).parent / "review.html"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Style tuning review</title>
<style>
  :root {{ color-scheme: light dark; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f4f4f5;
    color: #18181b;
  }}
  header {{
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 12px 20px;
    background: #ffffff; border-bottom: 1px solid #e4e4e7;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }}
  header h1 {{ font-size: 16px; margin: 0; font-weight: 600; }}
  .progress {{ font-variant-numeric: tabular-nums; color: #52525b; font-size: 14px; }}
  .actions {{ display: flex; gap: 8px; align-items: center; }}
  button {{
    font: inherit; cursor: pointer; border: 1px solid #d4d4d8;
    background: #fff; border-radius: 8px; padding: 6px 12px;
  }}
  button:hover {{ background: #f4f4f5; }}
  .download {{ background: #18181b; color: #fff; border-color: #18181b; font-weight: 600; }}
  .download:hover {{ background: #3f3f46; }}
  main {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 20px; padding: 20px; max-width: 1600px; margin: 0 auto;
  }}
  .card {{
    background: #fff; border: 1px solid #e4e4e7; border-radius: 12px;
    overflow: hidden; display: flex; flex-direction: column;
  }}
  .card.rated {{ border-color: #22c55e; }}
  .images {{ display: flex; gap: 2px; background: #e4e4e7; }}
  .images .img-wrap {{ position: relative; flex: 1; aspect-ratio: 1 / 1; background: #fafafa; }}
  .images img {{ width: 100%; height: 100%; object-fit: contain; display: block; }}
  .images .missing {{
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; color: #a1a1aa; font-size: 11px; text-align: center; padding: 4px;
  }}
  .img-caption {{
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(24,24,27,0.75); color: #fff; font-size: 10px;
    padding: 3px 6px; text-align: center;
  }}
  .badges {{ display: flex; gap: 8px; padding: 10px 12px 0; }}
  .badge {{
    font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px;
    background: #f4f4f5; font-variant-numeric: tabular-nums;
  }}
  .body {{ padding: 12px; display: flex; flex-direction: column; gap: 10px; }}
  .style-title {{ font-size: 14px; font-weight: 600; }}
  .params {{ font-size: 11px; color: #52525b; line-height: 1.5; }}
  .params code {{ background: #f4f4f5; border-radius: 4px; padding: 1px 4px; }}
  .label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #a1a1aa; }}
  .rating {{ display: flex; gap: 6px; }}
  .rating button {{ flex: 1; padding: 8px 0; font-weight: 600; }}
  .rating button.selected {{ background: #2563eb; color: #fff; border-color: #2563eb; }}
  .approve-row {{ display: flex; gap: 8px; }}
  .approve-row button {{ flex: 1; }}
  .approve-row button.selected.approve {{ background: #16a34a; color: #fff; border-color: #16a34a; }}
  .approve-row button.selected.reject {{ background: #dc2626; color: #fff; border-color: #dc2626; }}
</style>
</head>
<body>
<header>
  <h1>Style tuning review</h1>
  <div class="progress"><span id="rated-count">0</span> / {total} rated</div>
  <div class="actions">
    <button id="reset">Reset</button>
    <button class="download" id="download">Download JSON</button>
  </div>
</header>
<main id="grid"></main>
<script>
  const DATA = {data_json};
  const STORAGE_KEY = "styletuning-ratings-v1";

  function loadRatings() {{
    try {{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {{}}; }}
    catch (e) {{ return {{}}; }}
  }}
  function saveRatings(r) {{ localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }}

  let ratings = loadRatings();

  function updateProgress() {{
    document.getElementById("rated-count").textContent = Object.keys(ratings).length;
  }}

  function renderApproveRow(card, item) {{
    const wrap = document.createElement("div");
    wrap.className = "approve-row";
    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    function applySelection() {{
      const current = ratings[item.candidate_id];
      approveBtn.classList.toggle("selected", !!current && current.approve === true);
      approveBtn.classList.add("approve");
      rejectBtn.classList.toggle("selected", !!current && current.approve === false);
      rejectBtn.classList.add("reject");
    }}
    approveBtn.addEventListener("click", () => {{
      const current = ratings[item.candidate_id] || {{}};
      ratings[item.candidate_id] = {{ ...current, approve: true }};
      saveRatings(ratings);
      applySelection();
      card.classList.add("rated");
      updateProgress();
    }});
    rejectBtn.addEventListener("click", () => {{
      const current = ratings[item.candidate_id] || {{}};
      ratings[item.candidate_id] = {{ ...current, approve: false }};
      saveRatings(ratings);
      applySelection();
      card.classList.add("rated");
      updateProgress();
    }});
    applySelection();
    wrap.appendChild(approveBtn);
    wrap.appendChild(rejectBtn);
    return wrap;
  }}

  function renderRating(card, item) {{
    const wrap = document.createElement("div");
    wrap.className = "rating";
    for (let v = 1; v <= 5; v++) {{
      const b = document.createElement("button");
      b.textContent = v;
      const current = ratings[item.candidate_id];
      if (current && current.rating === v) b.classList.add("selected");
      b.addEventListener("click", () => {{
        const cur = ratings[item.candidate_id] || {{}};
        ratings[item.candidate_id] = {{ ...cur, rating: v }};
        saveRatings(ratings);
        wrap.querySelectorAll("button").forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        card.classList.add("rated");
        updateProgress();
      }});
      wrap.appendChild(b);
    }}
    return wrap;
  }}

  function render() {{
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    for (const item of DATA) {{
      const card = document.createElement("div");
      card.className = "card" + (ratings[item.candidate_id] != null ? " rated" : "");

      const images = document.createElement("div");
      images.className = "images";
      for (const img of item.images) {{
        const imgWrap = document.createElement("div");
        imgWrap.className = "img-wrap";
        const el = document.createElement("img");
        el.loading = "lazy";
        el.src = img.src;
        el.alt = img.prompt || "";
        el.onerror = () => {{
          imgWrap.innerHTML = '<div class="missing">' + (img.prompt || "image unavailable") + '</div>';
        }};
        imgWrap.appendChild(el);
        const caption = document.createElement("div");
        caption.className = "img-caption";
        caption.textContent = (img.prompt || "") + " (" + Number(img.score).toFixed(1) + ")";
        imgWrap.appendChild(caption);
        images.appendChild(imgWrap);
      }}

      const badges = document.createElement("div");
      badges.className = "badges";
      const scoreBadge = document.createElement("div");
      scoreBadge.className = "badge";
      scoreBadge.textContent = "min score " + Number(item.min_score).toFixed(1);
      const costBadge = document.createElement("div");
      costBadge.className = "badge";
      costBadge.textContent = "distortion " + Number(item.distortion_cost).toFixed(2);
      badges.appendChild(scoreBadge);
      badges.appendChild(costBadge);

      const body = document.createElement("div");
      body.className = "body";
      const title = document.createElement("div");
      title.className = "style-title";
      title.textContent = item.style_title;
      const params = document.createElement("div");
      params.className = "params";
      params.innerHTML = Object.entries(item.params)
        .map(([k, v]) => "<code>" + k + "=" + (typeof v === "number" ? v.toFixed(3) : v) + "</code>")
        .join(" ");
      const ratingLabel = document.createElement("div");
      ratingLabel.className = "label";
      ratingLabel.textContent = "Aesthetic rating (1 = bad, 5 = great)";

      body.appendChild(title);
      body.appendChild(params);
      body.appendChild(ratingLabel);
      body.appendChild(renderRating(card, item));
      body.appendChild(renderApproveRow(card, item));

      card.appendChild(images);
      card.appendChild(badges);
      card.appendChild(body);
      grid.appendChild(card);
    }}
    updateProgress();
  }}

  document.getElementById("download").addEventListener("click", () => {{
    const out = Object.entries(ratings)
      .filter(([, v]) => v && v.approve !== undefined)
      .map(([candidate_id, v]) => {{
        const item = DATA.find(d => d.candidate_id === candidate_id);
        return {{
          candidate_id,
          style_id: item ? item.style_id : null,
          rating: v.rating != null ? v.rating : null,
          approve: v.approve,
        }};
      }});
    const blob = new Blob([JSON.stringify(out, null, 2)], {{ type: "application/json" }});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "styletuning-ratings.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }});

  document.getElementById("reset").addEventListener("click", () => {{
    if (!confirm("Clear all your ratings? This cannot be undone.")) return;
    ratings = {{}};
    saveRatings(ratings);
    render();
  }});

  render();
</script>
</body>
</html>
"""


def _relative_image_path(image_path: str) -> str:
    return os.path.relpath(image_path, start=Path(__file__).parent)


def render_review_html(candidates: list) -> str:
    items = []
    for c in candidates:
        images = [
            {"src": _relative_image_path(s["image_path"]), "prompt": s["prompt"], "score": s["score"]}
            for s in c["confirmation_grid_scores"]
        ]
        items.append(
            {
                "candidate_id": c["candidate_id"],
                "style_id": c["style_id"],
                "style_title": c["style_title"],
                "min_score": c["min_score"],
                "distortion_cost": c["distortion_cost"],
                "params": c["params"],
                "images": images,
            }
        )
    return HTML_TEMPLATE.format(total=len(items), data_json=json.dumps(items))


def main():
    db = connect()
    collections = get_collections(db)

    docs = list(collections["tuning_candidates"].find({"status": "pending"}).sort("style_title", 1))
    if not docs:
        logger.warning("No pending tuning_candidates found — nothing to build.")
        return

    candidates = [
        {
            "candidate_id": str(d["_id"]),
            "style_id": d["run_ref"]["style_id"],
            "style_title": d.get("style_title") or "",
            "min_score": d["min_score"],
            "distortion_cost": d["distortion_cost"],
            "params": d["params"],
            "confirmation_grid_scores": d["confirmation_grid_scores"],
        }
        for d in docs
    ]

    html = render_review_html(candidates)
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    logger.info("Wrote %d candidates to %s", len(candidates), OUTPUT_PATH)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_build_review.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/build_review.py api/tests/test_styletuning_build_review.py
git commit -m "styletuning: add Stage 2 static review page generator"
```

---

### Task 10: `import_ratings.py` — import ratings, promote to `style_configs`

**Files:**
- Create: `api/scripts/styletuning/import_ratings.py`
- Test: `api/tests/test_styletuning_import_ratings.py`

**Interfaces:**
- Consumes: `db.connect`, `db.get_collections` (Task 5). Reads the JSON exported by Task 9's `review.html` (`[{candidate_id, style_id, rating, approve}]`) and `tuning_candidates` docs (`_id`, `style_title`, `distortion_cost`, `run_ref.checkpoint`, `params`).
- Produces: `apply_ratings(ratings, candidates_by_id) -> (candidate_updates, promotions, warnings)`, CLI `main(ratings_path)`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/test_styletuning_import_ratings.py`:

```python
from api.scripts.styletuning.import_ratings import apply_ratings


def _candidate(cid, style_id, checkpoint, distortion, params=None):
    return {
        "_id": cid,
        "style_title": f"Style {style_id}",
        "run_ref": {"style_id": style_id, "checkpoint": checkpoint, "trial_number": 1},
        "distortion_cost": distortion,
        "params": params or {"cfg_scale": 7.0},
    }


def test_apply_ratings_marks_approved_and_rejected():
    candidates_by_id = {
        "c1": _candidate("c1", 10, "ckpt-a", 0.2),
        "c2": _candidate("c2", 10, "ckpt-a", 0.5),
    }
    ratings = [
        {"candidate_id": "c1", "style_id": 10, "rating": 5, "approve": True},
        {"candidate_id": "c2", "style_id": 10, "rating": 2, "approve": False},
    ]
    updates, promotions, warnings = apply_ratings(ratings, candidates_by_id)
    assert {"candidate_id": "c1", "status": "approved", "rating": 5} in updates
    assert {"candidate_id": "c2", "status": "rejected", "rating": 2} in updates
    assert len(promotions) == 1
    assert promotions[0]["source_candidate_id"] == "c1"
    assert warnings == []


def test_apply_ratings_picks_lowest_distortion_when_multiple_approved():
    candidates_by_id = {
        "c1": _candidate("c1", 10, "ckpt-a", 0.5),
        "c2": _candidate("c2", 10, "ckpt-b", 0.2),
    }
    ratings = [
        {"candidate_id": "c1", "style_id": 10, "rating": 4, "approve": True},
        {"candidate_id": "c2", "style_id": 10, "rating": 5, "approve": True},
    ]
    updates, promotions, warnings = apply_ratings(ratings, candidates_by_id)
    assert len(promotions) == 1
    assert promotions[0]["source_candidate_id"] == "c2"
    assert len(warnings) == 1
    assert "10" in warnings[0]


def test_apply_ratings_skips_unknown_candidate_ids():
    updates, promotions, warnings = apply_ratings(
        [{"candidate_id": "missing", "style_id": 1, "rating": 3, "approve": True}], {}
    )
    assert updates == []
    assert promotions == []
    assert warnings == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_import_ratings.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Write the implementation**

Create `api/scripts/styletuning/import_ratings.py`:

```python
"""One-off script: import Stage 2 ratings exported from review.html, mark
tuning_candidates approved/rejected, and promote approved candidates into
style_configs.

Run from the repo root:
    python -m api.scripts.styletuning.import_ratings path/to/styletuning-ratings.json

Requires MONGO_URL in the environment (sourced from .env automatically).
"""
from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone

from bson import ObjectId

from api.scripts.styletuning.db import connect, get_collections

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def apply_ratings(ratings: list, candidates_by_id: dict):
    """Compute the candidate-status updates and style_configs promotions for
    a batch of exported ratings.

    `ratings`: [{ "candidate_id": str, "style_id": int, "rating": int|None, "approve": bool }]
    `candidates_by_id`: candidate_id -> full tuning_candidates doc (as stored in Mongo)

    Returns (candidate_updates, promotions, warnings):
      - candidate_updates: [{ "candidate_id": str, "status": str, "rating": int|None }]
      - promotions: [{ "style_id": int, "style_title": str, "checkpoint": str,
                        "params": dict, "source_candidate_id": str }] — at most
        one per style_id (lowest distortion_cost wins if multiple approved).
      - warnings: human-readable strings for skipped duplicate approvals.
    """
    candidate_updates = []
    approved_by_style = {}

    for r in ratings:
        candidate = candidates_by_id.get(r["candidate_id"])
        if candidate is None:
            continue
        status = "approved" if r["approve"] else "rejected"
        candidate_updates.append(
            {"candidate_id": r["candidate_id"], "status": status, "rating": r["rating"]}
        )
        if status == "approved":
            approved_by_style.setdefault(r["style_id"], []).append(candidate)

    promotions = []
    warnings = []
    for style_id, candidates in approved_by_style.items():
        winner = min(candidates, key=lambda c: c["distortion_cost"])
        promotions.append(
            {
                "style_id": style_id,
                "style_title": winner.get("style_title"),
                "checkpoint": winner["run_ref"]["checkpoint"],
                "params": winner["params"],
                "source_candidate_id": str(winner["_id"]),
            }
        )
        if len(candidates) > 1:
            skipped = len(candidates) - 1
            warnings.append(
                f"style_id={style_id}: {len(candidates)} candidates approved, "
                f"promoting the lowest-distortion one ({skipped} skipped)."
            )

    return candidate_updates, promotions, warnings


def main():
    parser = argparse.ArgumentParser(description="Import Stage 2 ratings and promote approved candidates.")
    parser.add_argument("ratings_path", type=str)
    args = parser.parse_args()

    with open(args.ratings_path, "r", encoding="utf-8") as f:
        ratings = json.load(f)

    db = connect()
    collections = get_collections(db)

    candidate_ids = [r["candidate_id"] for r in ratings]
    docs = list(
        collections["tuning_candidates"].find({"_id": {"$in": [ObjectId(cid) for cid in candidate_ids]}})
    )
    candidates_by_id = {str(d["_id"]): d for d in docs}

    updates, promotions, warnings = apply_ratings(ratings, candidates_by_id)

    now = datetime.now(timezone.utc)
    for u in updates:
        collections["tuning_candidates"].update_one(
            {"_id": ObjectId(u["candidate_id"])},
            {"$set": {"status": u["status"], "rating": u["rating"], "reviewed_at": now}},
        )

    for p in promotions:
        collections["style_configs"].update_one(
            {"style_id": p["style_id"]},
            {
                "$set": {
                    "style_id": p["style_id"],
                    "style_title": p["style_title"],
                    "checkpoint": p["checkpoint"],
                    "params": p["params"],
                    "source_candidate_id": p["source_candidate_id"],
                    "promoted_at": now,
                }
            },
            upsert=True,
        )

    for w in warnings:
        logger.warning(w)

    logger.info("Updated %d candidates, promoted %d styles.", len(updates), len(promotions))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_import_ratings.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add api/scripts/styletuning/import_ratings.py api/tests/test_styletuning_import_ratings.py
git commit -m "styletuning: add ratings import + style_configs promotion"
```

---

### Task 11: Full suite verification

**Files:** none (verification only)

**Interfaces:** none — this task exercises everything built in Tasks 1–10 together.

- [ ] **Step 1: Run the entire new test module set together**

```bash
source api/venv/bin/activate && python -m pytest api/tests/test_styletuning_config.py api/tests/test_styletuning_objective.py api/tests/test_styletuning_request_builder.py api/tests/test_styletuning_db.py api/tests/test_styletuning_shortlist.py api/tests/test_styletuning_search.py api/tests/test_styletuning_build_review.py api/tests/test_styletuning_import_ratings.py -v
```
Expected: all tests pass (30 total: 5 + 7 + 3 + 1 + 6 + 3 + 2 + 3).

- [ ] **Step 2: Run the full existing backend test suite to confirm no regressions**

```bash
source api/venv/bin/activate && python -m pytest api/tests -v
```
Expected: all pre-existing tests still pass, plus the 30 new ones — nothing in `api/controllers` or `api/utils` was modified by this plan, so no regressions are expected.

- [ ] **Step 3: Sanity-check the CLI entrypoints parse their arguments correctly**

```bash
source api/venv/bin/activate
python -m api.scripts.styletuning.search --help
python -m api.scripts.styletuning.shortlist --help
python -m api.scripts.styletuning.build_review --help
python -m api.scripts.styletuning.import_ratings --help
```
Expected: each prints its argparse usage/help text with no import errors (these do not connect to Mongo/Novita — `argparse` exits before `connect()`/`NovitaClient(...)` run when `--help` is passed).

No commit needed for this task — it's verification only.

---

## Next steps after this plan (not part of it)

Once merged, running the actual pilot (real Novita calls against "Doodle Art" and "Photography") is a manual, cost-incurring operation Christoph runs directly:

```bash
source api/venv/bin/activate
python -m api.scripts.styletuning.search --style-id 10 --checkpoint colorful_v31_62333.safetensors --trials 40
python -m api.scripts.styletuning.search --style-id 6 --checkpoint cyberrealistic_v40_151857.safetensors --trials 40
python -m api.scripts.styletuning.shortlist --style-id 10
python -m api.scripts.styletuning.shortlist --style-id 6
python -m api.scripts.styletuning.build_review
# open api/scripts/styletuning/review.html, rate candidates, click "Download JSON"
python -m api.scripts.styletuning.import_ratings ~/Downloads/styletuning-ratings.json
```

Before running, edit `api/scripts/styletuning/config.py`'s `PILOT_STYLES` test prompts/checkpoint candidates if the defaults in this plan don't match what Christoph wants tested. Wiring `generate_controller.py` to actually read from `style_configs` in production is a separate follow-up ticket (explicitly out of scope here).
