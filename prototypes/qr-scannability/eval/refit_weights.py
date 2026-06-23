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
