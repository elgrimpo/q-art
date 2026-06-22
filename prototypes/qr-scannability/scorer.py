from __future__ import annotations
import numpy as np
import qrcode
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import zxingcpp
from io import BytesIO


def render_qr(text: str, box_size: int = 10, border: int = 4) -> Image.Image:
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(text)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB")


def _to_rgb_array(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGB"))


def _zxing_text(img: Image.Image) -> str | None:
    results = zxingcpp.read_barcodes(_to_rgb_array(img))
    for r in results:
        if r.text:
            return r.text
    return None


def _opencv_text(img: Image.Image) -> str | None:
    arr = cv2.cvtColor(_to_rgb_array(img), cv2.COLOR_RGB2BGR)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(arr)
    return data or None


def decode_text(img: Image.Image) -> str | None:
    return _zxing_text(img) or _opencv_text(img)


def decode_battery(img: Image.Image, expected: str | None = None) -> dict[str, bool]:
    texts = {"zxing": _zxing_text(img), "opencv": _opencv_text(img)}
    if expected is None:
        return {k: bool(v) for k, v in texts.items()}
    return {k: (v == expected) for k, v in texts.items()}


def is_decodable(img: Image.Image, expected: str) -> bool:
    return any(decode_battery(img, expected=expected).values())


def blend_score(method_b: float, method_a: float | None) -> float:
    raw = method_b if method_a is None else 0.70 * method_b + 0.30 * method_a
    return round(max(0.0, min(100.0, raw)), 1)


def band(score: float) -> str:
    if score <= 0:
        return "Won't scan"
    if score < 40:
        return "Risky"
    if score < 60:
        return "Fragile (scans slowly)"
    if score < 80:
        return "Good"
    return "Excellent"


_WORK_SIZE = 512

# Each axis: (weight, [severity levels], apply_fn(work_img, level) -> PIL.Image)
def _resize_work(img: Image.Image) -> Image.Image:
    w, h = img.size
    scale = _WORK_SIZE / max(w, h)
    if scale >= 1:
        return img.convert("RGB")
    return img.convert("RGB").resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def _apply_downscale(img: Image.Image, factor: float) -> Image.Image:
    if factor >= 1.0:
        return img
    w, h = img.size
    small = img.resize((max(1, int(w * factor)), max(1, int(h * factor))), Image.LANCZOS)
    return small.resize((w, h), Image.NEAREST)


def _apply_blur(img, sigma):
    return img if sigma <= 0 else img.filter(ImageFilter.GaussianBlur(sigma))


def _apply_contrast(img, factor):
    return img if factor >= 1.0 else ImageEnhance.Contrast(img).enhance(factor)


def _apply_rotation(img, deg):
    return img if deg == 0 else img.rotate(deg, expand=True, fillcolor=(255, 255, 255))


def _apply_perspective(img, mag):
    if mag <= 0:
        return img
    arr = np.array(img)
    h, w = arr.shape[:2]
    d = mag * w
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[d, d], [w - d, 0], [w, h], [0, h - d]])
    m = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(arr, m, (w, h), borderValue=(255, 255, 255))
    return Image.fromarray(warped)


def _apply_jpeg(img, quality):
    if quality >= 95:
        return img
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


_AXES = {
    "downscale":   (0.25, [1.0, 0.5, 0.35, 0.25, 0.18, 0.12], _apply_downscale),
    "blur":        (0.25, [0, 1.0, 2.0, 3.0, 4.5, 6.0], _apply_blur),
    "contrast":    (0.20, [1.0, 0.7, 0.5, 0.38, 0.28, 0.2], _apply_contrast),
    "rotation":    (0.10, [0, 5, 10, 15, 22, 30], _apply_rotation),
    "perspective": (0.10, [0, 0.05, 0.1, 0.16, 0.24], _apply_perspective),
    "jpeg":        (0.10, [95, 60, 40, 25, 15], _apply_jpeg),
}


def _breaking_index(work: Image.Image, expected: str, levels, apply_fn) -> int:
    """Highest severity index (0-based) that still decodes correctly."""
    last_ok = 0
    for i, level in enumerate(levels):
        if is_decodable(apply_fn(work, level), expected):
            last_ok = i
    return last_ok


def robustness_score(img, expected: str, reference: Image.Image):
    work = _resize_work(img)
    ref_work = _resize_work(reference)
    breakpoints, contributions = {}, 0.0
    for axis, (weight, levels, apply_fn) in _AXES.items():
        max_idx = len(levels) - 1
        styled_idx = _breaking_index(work, expected, levels, apply_fn)
        ref_idx = _breaking_index(ref_work, expected, levels, apply_fn) or max_idx
        breakpoints[axis] = styled_idx
        sub = min(1.0, styled_idx / ref_idx) if ref_idx else 1.0
        contributions += weight * sub
    return round(100.0 * contributions, 1), breakpoints
