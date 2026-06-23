# Scannability scorer v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the structural scannability scorer's agreement with real decodability (from AUC 0.617 toward ≥0.73) by localizing the QR before sampling, replacing the global-threshold data metric with a local one, and re-fitting the blend weights on a labeled dataset.

**Architecture:** `structural_score.py` stays a thin orchestrator over small pure-NumPy functions. Add `localize_qr()` (center-square crop) ahead of grid sampling; replace `ecc_margin`'s single global threshold with a local/adaptive module-error term (`data_reliability`); drop `contrast` from the blend; set blend weights from a dependency-free grid-search fit against decoder-truth labels. Develop and validate in `prototypes/qr-scannability/` (which has the decoder battery + labeled eval set), then byte-copy the file to `api/utils/structural_score.py`.

**Tech Stack:** Python 3.11, NumPy 1.24, Pillow 10.3, qrcode 7.3. Tests via pytest. No new dependencies (prod ships only numpy/Pillow/qrcode).

## Global Constraints

- **No new prod dependencies.** `api/utils/structural_score.py` may import only `numpy`, `qrcode`, `PIL`, and stdlib. No `cv2`, `scipy`, or `sklearn`. (Prod `requirements.txt` ships numpy==1.24.3, Pillow==10.3.0, qrcode==7.3.1.)
- **`cv2.QRCodeDetector` is forbidden as a localizer** — empirically fails on every styled code.
- **Public interface is stable:** `structural_score(img: PIL.Image, payload: str) -> StructuralResult` with a float `.score` attribute. `api/controllers/generate_controller.py:175` reads `score_result.score` and nothing else.
- **The two scorer files must stay byte-identical:** `prototypes/qr-scannability/structural_score.py` and `api/utils/structural_score.py`. Develop in the prototype, copy to prod in Task 4.
- **Validation gate:** held-out AUC vs decoder-truth on the 247-code eval set must exceed the current 0.617; target ≥0.73.
- **Run tests with the prototype venv:** `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -v`.
- **Eval data (committed):** `prototypes/qr-scannability/eval/rated_with_payload.json` (247× `{image_id, image_url, content, my_rating, ...}`) and `eval/decode_results.json` (247× `{image_id, decodable, finder, ...}`). `decodable` is the ground-truth label.

---

### Task 1: Localize the QR with a center-square crop

**Files:**
- Modify: `prototypes/qr-scannability/structural_score.py`
- Test: `prototypes/qr-scannability/test_structural_score.py`

**Interfaces:**
- Consumes: existing `ideal_matrix`, `sample_modules`, `finder_integrity`, `_BORDER`.
- Produces: `localize_qr(img: Image.Image) -> Image.Image` — returns the centered `min(w,h)×min(w,h)` crop (identity when already square). `structural_score` calls it first, and `StructuralResult` gains a `localized: bool` field (True when a non-trivial crop happened).

- [ ] **Step 1: Write the failing tests**

Add to `prototypes/qr-scannability/test_structural_score.py`:

```python
def test_localize_qr_is_noop_on_square():
    img = _clean()                      # square, full-frame
    out = ss.localize_qr(img)
    assert out.size == img.size

def test_localize_qr_crops_portrait_to_centered_square():
    img = _clean()                      # WxW
    w, h = img.size
    # pad to portrait: add scenery above and below, QR centered
    padded = Image.new("RGB", (w, h + 400), (90, 120, 60))
    padded.paste(img, (0, 200))
    out = ss.localize_qr(padded)
    assert out.size == (w, w)           # cropped back to the square QR region

def test_portrait_render_scores_far_higher_after_localization():
    img = _clean()
    w, h = img.size
    padded = Image.new("RGB", (w, h + 400), (90, 120, 60))
    padded.paste(img, (0, 200))
    full_frame = ss.finder_integrity(
        ss.sample_modules(np.array(padded.convert("L"), dtype=float),
                          ss.ideal_matrix(URL).shape[0]),
        ss.ideal_matrix(URL))
    res = ss.structural_score(padded, URL)
    assert full_frame < 0.3             # raw portrait grid is broken
    assert res.finder > 0.8             # localized finder is recovered
    assert res.localized is True
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -k localize -v`
Expected: FAIL with `AttributeError: module 'structural_score' has no attribute 'localize_qr'`.

- [ ] **Step 3: Implement `localize_qr` and call it in `structural_score`**

In `structural_score.py`, add after `ideal_matrix`:

```python
def localize_qr(img: Image.Image) -> Image.Image:
    """Crop to the centered min(w,h) square so the module grid maps onto the QR.

    The app composes the QR as a centered square; portrait/landscape renders pad
    it. Full-frame N×N sampling on a non-square image misaligns every module, so
    we realign by cropping to center. Identity on already-square images. (cv2's
    detector fails on styled codes, so we deliberately use geometry, not a
    detector.)"""
    w, h = img.size
    if w == h:
        return img
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    return img.crop((left, top, left + s, top + s))
```

Update `StructuralResult` to add the field and `structural_score` to localize first:

```python
@dataclass
class StructuralResult:
    score: float
    finder: float
    contrast: float
    margin: float
    min_modules: float
    n: int
    localized: bool


def structural_score(img: Image.Image, payload: str) -> StructuralResult:
    localized_img = localize_qr(img)
    was_localized = localized_img.size != img.size
    gray = np.array(localized_img.convert("L"), dtype=float)
    ideal = ideal_matrix(payload)
    n = ideal.shape[0]
    means = sample_modules(gray, n)
    f = finder_integrity(means, ideal)
    ct = contrast(means, ideal)
    mg = ecc_margin(means, ideal)
    score = round(100.0 * (_W_FINDER * f + _W_CONTRAST * ct + _W_MARGIN * mg), 1)
    mn = min_scannable_modules(gray, ideal)
    return StructuralResult(score, round(f, 3), round(ct, 3), round(mg, 3), mn, n, was_localized)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -v`
Expected: PASS for the new `localize` tests AND all six pre-existing tests (the existing `_clean()` images are square, so `localized is False` and their scores are unchanged).

- [ ] **Step 5: Commit**

```bash
git add prototypes/qr-scannability/structural_score.py prototypes/qr-scannability/test_structural_score.py
git commit -m "feat(qrai-110): localize QR via center-square crop before scoring"
```

---

### Task 2: Replace global ECC margin with a local-threshold data metric

**Files:**
- Modify: `prototypes/qr-scannability/structural_score.py`
- Test: `prototypes/qr-scannability/test_structural_score.py`

**Interfaces:**
- Consumes: `localize_qr` (Task 1), `sample_modules`, `ideal_matrix`, `_BORDER`.
- Produces: `data_region_mask(n) -> np.ndarray` (bool N×N, True for data modules excluding border + the three 8×8 finder blocks); `local_threshold(means) -> np.ndarray` (per-module threshold from a 9×9 box mean, pure NumPy integral image); `data_reliability(means, ideal) -> float` replacing the role of `ecc_margin` in the blend. The `margin` field of `StructuralResult` now carries `data_reliability` (local), keeping the field name/type so consumers and the dataclass arity are unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `test_structural_score.py`:

```python
def test_data_region_mask_excludes_finders_and_border():
    n = ss.ideal_matrix(URL).shape[0]
    m = ss.data_region_mask(n)
    b = ss._BORDER
    assert not m[b, b]                       # TL finder corner excluded
    assert not m[b, n - b - 1]               # TR finder corner excluded
    assert not m[0, 0]                        # border excluded
    assert m[n // 2, n // 2]                  # central data module included

def test_data_reliability_tracks_data_region_only():
    # Corrupting the data region must drop data_reliability sharply; the metric
    # is restricted to data modules, so this is the lever the score needs.
    img = _clean()
    n = ss.ideal_matrix(URL).shape[0]
    ideal = ss.ideal_matrix(URL)
    base = ss.data_reliability(
        ss.sample_modules(np.array(img.convert("L"), float), n), ideal)
    w, h = img.size
    rng = np.random.default_rng(2)
    arr = np.array(img)
    y0, y1 = int(h * 0.30), int(h * 0.70)
    x0, x1 = int(w * 0.30), int(w * 0.70)
    arr[y0:y1, x0:x1] = rng.integers(0, 255, arr[y0:y1, x0:x1].shape, dtype=np.uint8)
    damaged = ss.data_reliability(
        ss.sample_modules(np.array(Image.fromarray(arr).convert("L"), float), n), ideal)
    assert damaged < base - 0.1

def test_finders_intact_but_data_shredded_scores_low():
    # The false-positive failure mode: pristine finders, destroyed interior.
    img = _clean()
    n = ss.ideal_matrix(URL).shape[0]
    w, h = img.size
    rng = np.random.default_rng(1)
    arr = np.array(img)
    sx, sy = w / n, h / n
    b = ss._BORDER
    y0, y1 = int((b + 8) * sy), int((n - b - 8) * sy)
    x0, x1 = int((b + 8) * sx), int((n - b - 8) * sx)
    arr[y0:y1, x0:x1] = rng.integers(0, 255, arr[y0:y1, x0:x1].shape, dtype=np.uint8)
    res = ss.structural_score(Image.fromarray(arr), URL)
    assert res.finder > 0.8                  # finders untouched
    assert res.score < 55                    # but overall must read as risky
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -k "data_region or data_reliability or shredded" -v`
Expected: FAIL with `AttributeError: ... has no attribute 'data_reliability'` (and `data_region_mask`).

- [ ] **Step 3: Implement the local-threshold metric**

In `structural_score.py`, add the helpers and a tuned data term. Place above `structural_score`:

```python
def data_region_mask(n: int) -> np.ndarray:
    """True for payload/data modules: excludes the 4-module quiet zone and the
    three 8×8 finder+separator blocks. The finder term already covers those."""
    b = _BORDER
    m = np.zeros((n, n), dtype=bool)
    m[b:n - b, b:n - b] = True
    m[b:b + 8, b:b + 8] = False                  # top-left finder
    m[b:b + 8, n - b - 8:n - b] = False          # top-right finder
    m[n - b - 8:n - b, b:b + 8] = False          # bottom-left finder
    return m


def _box_mean(a: np.ndarray, k: int) -> np.ndarray:
    """Per-cell mean over a (2k+1)² window via an integral image. Pure NumPy."""
    pad = np.pad(a, k + 1, mode="edge")
    ii = pad.cumsum(0).cumsum(1)
    n0, n1 = a.shape
    out = np.empty_like(a)
    for i in range(n0):
        for j in range(n1):
            y0, y1 = i, i + 2 * k + 1
            x0, x1 = j, j + 2 * k + 1
            total = ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]
            out[i, j] = total / ((2 * k + 1) ** 2)
    return out


def local_threshold(means: np.ndarray, k: int = 4) -> np.ndarray:
    """Adaptive per-module threshold (local 9×9 mean), mimicking a phone's local
    binarization instead of one global cut."""
    return _box_mean(means, k)


def data_reliability(means: np.ndarray, ideal: np.ndarray) -> float:
    """1 − (local-threshold module-error rate in the data region / H budget),
    clamped to [0,1]. Polarity-agnostic: take whichever polarity fits better."""
    mask = data_region_mask(ideal.shape[0])
    if not mask.any():
        return 0.0
    thr = local_threshold(means)
    observed_dark = means < thr
    err = (observed_dark[mask] != ideal[mask]).mean()
    err = min(err, 1.0 - err)
    return float(max(0.0, 1.0 - min(1.0, err / _BUDGET_H)))
```

Swap to a **geometric blend** of `finder` and `data_reliability`, and drop `contrast` (keep computing `ct` as a diagnostic field only). The geometric form is deliberate: a QR needs *both* clean finders *and* a readable data region, so a multiplicative blend lets a dead data region tank the score even when finders are pristine — exactly the false-positive failure mode an additive blend masks. Set starting weights now; Task 3 fits the finals:

```python
# Geometric blend exponents — finder × local data reliability, so BOTH must be
# high (additive lets a perfect finder mask dead data). Contrast dropped (AUC ≈
# 0.50). Final values fitted in Task 3 (see eval/refit_weights.py).
_W_FINDER, _W_DATA = 0.60, 0.40   # _W_FINDER + _W_DATA == 1
```

In `structural_score`, replace the `mg`/`score` lines (note `f`/`mg` are clipped to a tiny floor so a hard zero doesn't NaN the power):

```python
    mg = data_reliability(means, ideal)
    f_c, mg_c = max(f, 1e-9), max(mg, 1e-9)
    score = round(100.0 * (f_c ** _W_FINDER) * (mg_c ** _W_DATA), 1)
```

Remove the now-unused `_W_CONTRAST`/`_W_MARGIN` constants. Keep `ecc_margin` defined (it documents the old global behavior and is useful for diagnostics).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -v`
Expected: all PASS. Note: `test_corrupting_data_lowers_margin_but_not_finders` still passes because `data_reliability` also drops on central-region noise.

- [ ] **Step 5: Commit**

```bash
git add prototypes/qr-scannability/structural_score.py prototypes/qr-scannability/test_structural_score.py
git commit -m "feat(qrai-110): local-threshold data-region reliability, drop contrast from blend"
```

---

### Task 3: Fit blend weights on the labeled eval set and gate on AUC

**Files:**
- Create: `prototypes/qr-scannability/eval/refit_weights.py`
- Modify: `prototypes/qr-scannability/structural_score.py` (paste fitted weights + budget)
- Uses: `eval/rated_with_payload.json`, `eval/decode_results.json` (committed)

**Interfaces:**
- Consumes: `localize_qr`, `finder_integrity`, `data_reliability`, `sample_modules`, `ideal_matrix`, and the module constant `_BUDGET_DATA` from `structural_score.py`.
- Produces: a script that downloads the 247 codes, recomputes v2 features, and jointly grid-searches the geometric weight `w_finder` (with `w_data = 1 - w_finder`) **and** the `_BUDGET_DATA` constant, maximizing 5-fold-CV AUC vs the `decodable` label. Prints the chosen weights, chosen budget, CV-AUC, and baseline finder-only AUC. No library ML — AUC and CV are hand-rolled NumPy; the budget sweep temporarily sets `ss._BUDGET_DATA` (restored after each candidate).

**Note on the Task 2 deviation:** Task 2 introduced `_BUDGET_DATA = 0.15` (the brief's `_BUDGET_H = 0.30` made Task 2's own `score < 55` test impossible). This task makes that constant data-driven by fitting it here, so it is no longer a hand-picked value.

- [ ] **Step 1: Write the fit/validation script**

Create `prototypes/qr-scannability/eval/refit_weights.py`:

```python
"""Fit scannability v2 blend weight AND the _BUDGET_DATA constant against
decoder-truth labels, and report AUC.

Run: cd prototypes/qr-scannability && ./venv/bin/python eval/refit_weights.py
Downloads the 247 eval images (cached under eval/_imgcache/), recomputes v2
features, grid-searches the geometric finder/data weight and the _BUDGET_DATA
constant jointly by 5-fold CV AUC, and prints a ready-to-paste block. Network
needed once; cached thereafter. (Task 2 introduced _BUDGET_DATA=0.15 as a
starting value; this script makes it data-driven.)
"""
import json, os, sys, io, urllib.request, time
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import structural_score as ss

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "_imgcache")
os.makedirs(CACHE, exist_ok=True)

def load_img(row):
    p = os.path.join(CACHE, row["image_id"] + ".png")
    if os.path.exists(p):
        try:
            return Image.open(p).convert("RGB")
        except Exception:
            os.remove(p)
    for attempt in range(4):
        try:
            req = urllib.request.Request(row["image_url"], headers={"User-Agent": "M"})
            b = urllib.request.urlopen(req, timeout=60).read()
            img = Image.open(io.BytesIO(b)); img.load(); img = img.convert("RGB")
            img.save(p)
            return img
        except Exception:
            time.sleep(2 * (attempt + 1))
    return None

def features(img, payload):
    """Return (finder, means, ideal) so data_reliability can be recomputed at any
    candidate _BUDGET_DATA during the sweep."""
    loc = ss.localize_qr(img)
    gray = np.array(loc.convert("L"), dtype=float)
    ideal = ss.ideal_matrix(payload)
    means = ss.sample_modules(gray, ideal.shape[0])
    return ss.finder_integrity(means, ideal), means, ideal

def auc(scores, labels):
    pos = [s for s, l in zip(scores, labels) if l]
    neg = [s for s, l in zip(scores, labels) if not l]
    if not pos or not neg:
        return float("nan")
    return sum((a > b) + 0.5 * (a == b) for a in pos for b in neg) / (len(pos) * len(neg))

def reliab_at(budget, means_list, ideal_list):
    """data_reliability for every image at a candidate budget. data_reliability
    reads the module-level _BUDGET_DATA at call time, so we set it for the sweep
    and restore it after (offline calibration only)."""
    saved = ss._BUDGET_DATA
    ss._BUDGET_DATA = budget
    try:
        return np.clip([ss.data_reliability(m, idl)
                        for m, idl in zip(means_list, ideal_list)], 1e-9, 1.0)
    finally:
        ss._BUDGET_DATA = saved

def main():
    rated = json.load(open(os.path.join(HERE, "rated_with_payload.json")))
    labels_by_id = {r["image_id"]: r["decodable"]
                    for r in json.load(open(os.path.join(HERE, "decode_results.json")))}
    F, M, I, Y = [], [], [], []
    for i, row in enumerate(rated):
        img = load_img(row)
        if img is None:
            continue
        f, means, ideal = features(img, row["content"])
        F.append(f); M.append(means); I.append(ideal)
        Y.append(bool(labels_by_id.get(row["image_id"])))
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(rated)} features computed", flush=True)
    F, Y = np.clip(np.array(F), 1e-9, 1.0), np.array(Y)
    print(f"\nN={len(Y)}  decodable={Y.sum()}")
    print(f"finder-only AUC = {auc(F, Y):.3f}")

    rng = np.random.default_rng(0)
    folds = np.array_split(rng.permutation(len(Y)), 5)
    budgets = [round(float(b), 2) for b in np.linspace(0.10, 0.30, 11)]
    best = {"cv": -1.0, "w": 0.5, "budget": ss._BUDGET_DATA}
    for budget in budgets:
        D = reliab_at(budget, M, I)
        for w in np.linspace(0.05, 0.95, 19):
            blend = F ** w * D ** (1 - w)
            cv = float(np.nanmean([auc(blend[folds[k]], Y[folds[k]]) for k in range(5)]))
            if cv > best["cv"]:
                best = {"cv": cv, "w": float(w), "budget": budget}
    D = reliab_at(best["budget"], M, I)
    full_auc = auc(F ** best["w"] * D ** (1 - best["w"]), Y)
    print(f"\nBEST  w_finder={best['w']:.2f}  w_data={1 - best['w']:.2f}  "
          f"_BUDGET_DATA={best['budget']:.2f}  CV-AUC={best['cv']:.3f}  full-AUC={full_auc:.3f}")
    print("\n--- paste into structural_score.py ---")
    print(f"_W_FINDER, _W_DATA = {best['w']:.2f}, {1 - best['w']:.2f}")
    print(f"_BUDGET_DATA = {best['budget']:.2f}")
    if best["cv"] <= 0.617:
        print(f"\nGATE FAILED: CV-AUC {best['cv']:.3f} ≤ baseline 0.617")
        sys.exit(1)
    print(f"\nGATE PASSED: CV-AUC {best['cv']:.3f} > baseline 0.617")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the fit**

Run: `cd prototypes/qr-scannability && ./venv/bin/python eval/refit_weights.py`
Expected: prints `finder-only AUC`, then a `BEST w_finder=… w_data=… _BUDGET_DATA=… CV-AUC=…` line with `CV-AUC` > 0.617, and `GATE PASSED`. (First run downloads 247 images to `eval/_imgcache/`; S3 can be slow — the script retries.) The `CV-AUC` is a selection-optimistic estimate — weight and budget are chosen on the same folds — so treat it as directional, not a guarantee; the real validation is the production behavior and spot re-decodes. If `GATE FAILED`, stop and report — do not proceed; the components need rework, not a weight tweak.

- [ ] **Step 3: Paste the fitted weights and budget**

Edit `structural_score.py`: replace the `_W_FINDER, _W_DATA = 0.60, 0.40` line with the exact `_W_FINDER, _W_DATA = …` line the script printed, and replace the `_BUDGET_DATA = 0.15` line with the exact `_BUDGET_DATA = …` line printed. Update the weight comment to cite the CV-AUC, e.g. `# Fitted on 247 labeled codes (eval/refit_weights.py): CV-AUC 0.7x.`, and add a short note on the `_BUDGET_DATA` line that it was fitted too. If the printed `_BUDGET_DATA` equals 0.15, keep it — that just means the starting value was already optimal.

- [ ] **Step 4: Add the cache to gitignore and re-run tests**

Append to `prototypes/qr-scannability/.gitignore`:

```
eval/_imgcache/
```

Run: `cd prototypes/qr-scannability && ./venv/bin/python -m pytest test_structural_score.py -v`
Expected: all PASS (synthetic test thresholds are weight-robust; if the clean-QR score assert is now borderline, it should still be ≥80 because finder≈1 and data_reliability≈1).

- [ ] **Step 5: Commit**

```bash
git add prototypes/qr-scannability/eval/refit_weights.py prototypes/qr-scannability/structural_score.py prototypes/qr-scannability/.gitignore
git commit -m "feat(qrai-110): fit scorer v2 blend weight + data budget on labeled set (CV-AUC gate)"
```

---

### Task 4: Sync to production and re-backfill

**Files:**
- Overwrite: `api/utils/structural_score.py` (copy of the prototype file)
- Run: `api/scripts/backfill_scannability.py`

**Interfaces:**
- Consumes: the finished `prototypes/qr-scannability/structural_score.py`.
- Produces: a byte-identical `api/utils/structural_score.py`; re-scored `scannability_score` values in Mongo. No signature change — `generate_controller.py:175` still calls `structural_score(image, website)` and reads `.score`.

- [ ] **Step 1: Verify the public interface is unchanged**

Run: `cd "$(git rev-parse --show-toplevel)" && grep -n "score_result\.\|structural_score(" api/controllers/generate_controller.py`
Expected: only `structural_score, generated_image, website` (the call) and `score_result.score`. Confirms no other attribute is consumed, so the dataclass changes are safe.

- [ ] **Step 2: Copy the scorer into prod and confirm identical**

```bash
cp prototypes/qr-scannability/structural_score.py api/utils/structural_score.py
diff -q prototypes/qr-scannability/structural_score.py api/utils/structural_score.py && echo IDENTICAL
```
Expected: `IDENTICAL`.

- [ ] **Step 3: Smoke-test the prod import and a score**

Run:
```bash
./api/venv/bin/python -c "
from PIL import Image; import sys; sys.path.insert(0,'api/utils')
from structural_score import structural_score
img = Image.new('RGB', (300, 500), 'white')   # non-square: must not crash
r = structural_score(img, 'https://qr-ai.co/x')
print('score', r.score, 'localized', r.localized)
"
```
Expected: prints a score and `localized True` with no exception (proves the prod copy runs under the api venv's numpy and that localization handles non-square input).

- [ ] **Step 4: Re-backfill existing scores**

Run: `cd "$(git rev-parse --show-toplevel)" && ./api/venv/bin/python -m api.scripts.backfill_scannability`

Note: the backfill query is `{"scannability_score": {"$exists": False}}`, so it only scores *un*scored docs. To re-score everything with v2, first clear the field:
```bash
./api/venv/bin/python -c "
import asyncio, os, certifi, motor.motor_asyncio as m
from dotenv import load_dotenv; load_dotenv('.env')
async def go():
    c = m.AsyncIOMotorClient(os.environ['MONGO_URL'], tlsCAFile=certifi.where())
    res = await c.get_database('QART').get_collection('images').update_many({}, {'\$unset': {'scannability_score': ''}})
    print('cleared', res.modified_count); c.close()
asyncio.run(go())
"
```
Then run the backfill. Expected: logs `processed=N failed=M` with N in the hundreds.

- [ ] **Step 5: Commit**

```bash
git add api/utils/structural_score.py
git commit -m "feat(qrai-110): ship scorer v2 to api/utils, re-backfill scores"
```

---

## Notes for the implementer

- **Why develop in the prototype, not `api/utils`:** the prototype venv has the decoder battery and the eval harness; prod's venv has only runtime deps. The files are kept byte-identical (Task 4) so prod gets the exact validated code.
- **`min_scannable_modules` / `min_modules`** stays informational (not in the blend); it returns `inf` on most images and is untouched here.
- **If Task 3's gate fails:** that means localization + local-threshold still don't separate decodable from not — revisit Component 2's `k` window or add the deferred scale/offset localization search, rather than forcing weights. Report back before continuing.
- **Out of scope (tracked separately):** the WeChat decode-first short-circuit, frontend display of the score, and the finer localization search.
