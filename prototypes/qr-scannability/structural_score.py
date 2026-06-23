"""Decoder-independent structural scannability score.

Answers a different question from `scorer.py`: given the QR we *generated*
(known payload → known module grid), how structurally sound is the styled
rendering? No decoder, no Apple Vision — pure NumPy on the known grid — so it
runs natively on the Linux backend and scores every generated code.

Validated empirically on 113 real Q-Art codes: the QR sits full-frame at the
known grid (no localization needed), and **finder-pattern integrity** separates
phone-scannable from not at AUC 0.75 on the hardest cases. That is the spine of
the score; contrast and ECC-margin refine it. All three are continuous, so the
score spreads out instead of clustering at 0/100 like the decoder-based one.
"""
from __future__ import annotations
import numpy as np
import qrcode
from PIL import Image
from dataclasses import dataclass

_BUDGET_H = 0.30      # ECC level H corrects ~30% of modules (used by ecc_margin)
_BUDGET_DATA = 0.15   # local-threshold error budget for data_reliability; tighter
                      # than ECC capacity because adaptive binarization turns random
                      # noise into ~50% per-module errors, so 15% over the whole
                      # data region already signals heavy corruption.
_BORDER = 4        # quiet-zone modules, matches the app's QR generation

# Geometric blend exponents — finder × local data reliability, so BOTH must be
# high (additive lets a perfect finder mask dead data). Contrast dropped (AUC ≈
# 0.50). Final values fitted in Task 3 (see eval/refit_weights.py).
_W_FINDER, _W_DATA = 0.60, 0.40   # _W_FINDER + _W_DATA == 1


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


def ideal_matrix(payload: str) -> np.ndarray:
    """N×N bool grid (True = dark), including the 4-module border — exactly the
    QR the app generates for `payload`."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=_BORDER)
    qr.add_data(payload)
    qr.make(fit=True)
    return np.array(qr.get_matrix(), dtype=bool)


def sample_modules(gray: np.ndarray, n: int) -> np.ndarray:
    """Mean luminance per module under full-frame alignment → N×N float."""
    h_img, w_img = gray.shape
    sx, sy = w_img / n, h_img / n
    half = min(sx, sy) * 0.3
    means = np.empty((n, n), dtype=float)
    for r in range(n):
        cy = (r + 0.5) * sy
        y1, y2 = max(0, int(cy - half)), int(cy + half) + 1
        for c in range(n):
            cx = (c + 0.5) * sx
            x1, x2 = max(0, int(cx - half)), int(cx + half) + 1
            patch = gray[y1:y2, x1:x2]
            means[r, c] = patch.mean() if patch.size else 128.0
    return means


def _corner_integrity(means: np.ndarray, ideal: np.ndarray, r0: int, c0: int) -> float:
    """|Pearson| between a sampled 7×7 finder block and the ideal finder pattern.
    Absolute value makes it polarity-agnostic (dark-on-light or inverted)."""
    block = means[r0:r0 + 7, c0:c0 + 7].astype(float).ravel()
    ref = ideal[r0:r0 + 7, c0:c0 + 7].astype(float).ravel()
    if block.std() < 1e-6 or ref.std() < 1e-6:
        return 0.0
    return float(abs(np.corrcoef(block, ref)[0, 1]))


def finder_integrity(means: np.ndarray, ideal: np.ndarray) -> float:
    """Min of the three finder-pattern correlations (TL, TR, BL). A QR needs all
    three finders found, so the weakest is the bottleneck."""
    n = ideal.shape[0]
    tl = _corner_integrity(means, ideal, _BORDER, _BORDER)
    tr = _corner_integrity(means, ideal, _BORDER, n - _BORDER - 7)
    bl = _corner_integrity(means, ideal, n - _BORDER - 7, _BORDER)
    return min(tl, tr, bl)


def contrast(means: np.ndarray, ideal: np.ndarray) -> float:
    """Luminance separation between should-be-dark and should-be-light modules,
    normalized to [0,1]. Polarity-agnostic via abs."""
    if ideal.all() or not ideal.any():
        return 0.0
    sep = abs(means[~ideal].mean() - means[ideal].mean()) / 255.0
    return float(min(1.0, max(0.0, sep)))


def ecc_margin(means: np.ndarray, ideal: np.ndarray) -> float:
    """1 − (module-error rate / 30% budget), clamped to [0,1]. The threshold is
    the midpoint of the two known module classes (we know the grid), which avoids
    the quiet-zone class imbalance a global median suffers. Polarity-agnostic:
    take whichever polarity yields fewer mismatches."""
    if ideal.all() or not ideal.any():
        return 0.0
    thr = (means[ideal].mean() + means[~ideal].mean()) / 2.0
    observed_dark = means < thr
    err = (observed_dark != ideal).mean()
    err = min(err, 1.0 - err)               # inverted polarity ⇒ flip
    return float(max(0.0, 1.0 - min(1.0, err / _BUDGET_H)))


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
    total = (
        ii[2*k+1:2*k+1+n0, 2*k+1:2*k+1+n1]
        - ii[0:n0, 2*k+1:2*k+1+n1]
        - ii[2*k+1:2*k+1+n0, 0:n1]
        + ii[0:n0, 0:n1]
    )
    return total / (2 * k + 1) ** 2


def local_threshold(means: np.ndarray, k: int = 4) -> np.ndarray:
    """Adaptive per-module threshold (local 9×9 mean), mimicking a phone's local
    binarization instead of one global cut."""
    return _box_mean(means, k)


def data_reliability(means: np.ndarray, ideal: np.ndarray) -> float:
    """1 − (local-threshold module-error rate in the data region / _BUDGET_DATA),
    clamped to [0,1]. Polarity-agnostic: take whichever polarity fits better."""
    mask = data_region_mask(ideal.shape[0])
    if not mask.any():
        return 0.0
    thr = local_threshold(means)
    observed_dark = means < thr
    err = (observed_dark[mask] != ideal[mask]).mean()
    err = min(err, 1.0 - err)
    return float(max(0.0, 1.0 - min(1.0, err / _BUDGET_DATA)))


def min_scannable_modules(gray: np.ndarray, ideal: np.ndarray, floor: float = 0.5) -> float:
    """Smallest pixels-per-module at which finder integrity stays above `floor` —
    a proxy for 'how small / far can this print and still be found' (the
    'do I have to zoom out' signal). Returns px/module (lower = more forgiving)."""
    n = ideal.shape[0]
    best = float("inf")
    for ppm in (12, 10, 8, 6, 5, 4, 3):
        side = n * ppm
        small = np.array(
            Image.fromarray(gray.astype(np.uint8)).resize((side, side), Image.LANCZOS),
            dtype=float,
        )
        if finder_integrity(sample_modules(small, n), ideal) >= floor:
            best = ppm
    return best


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
    mg = data_reliability(means, ideal)
    f_c, mg_c = max(f, 1e-9), max(mg, 1e-9)
    score = round(100.0 * (f_c ** _W_FINDER) * (mg_c ** _W_DATA), 1)
    mn = min_scannable_modules(gray, ideal)
    return StructuralResult(score, round(f, 3), round(ct, 3), round(mg, 3), mn, n, was_localized)
