"""QR decoder battery.

Real phone cameras read AI-styled QR codes far better than the basic open-source
decoders.  A scannability score built on a weak decoder reports false "won't
scan" results (verified: zxing + OpenCV read only 16/113 real Q-Art codes that a
phone reads ~95/113).  This module layers the strongest decoders available so the
scorer's notion of "decodable" tracks a real camera:

    1. Apple Vision  (macOS only) — the iPhone camera's own detector lineage;
       the single best proxy for phone scanning.  ~73/113 on real samples.
    2. WeChat        (OpenCV contrib CNN detector + super-resolution) — catches
       a few codes Vision misses; also the fallback on non-macOS.
    3. zxing-cpp     — fast ZXing-lineage decoder; final fallback.

Each decoder is `fn(PIL.Image) -> str | None`.  `decode_text` returns the first
hit in priority order; `primary_decoder` picks the single strongest decoder that
reads a given (clean) image, which the robustness sweep then uses consistently.
"""
from __future__ import annotations
import io
from pathlib import Path
import numpy as np
import cv2
import zxingcpp
from PIL import Image

_MODELS = Path(__file__).resolve().parent / "models"


# ----------------------------------------------------------------------------
# Apple Vision (macOS) — best phone proxy, decodes in-memory from PNG bytes
# ----------------------------------------------------------------------------
try:
    import Vision
    import Quartz
    from Foundation import NSData
    _VISION_AVAILABLE = True
except Exception:  # non-macOS or pyobjc missing — gracefully skip Vision
    _VISION_AVAILABLE = False

_VISION_MAXSIDE = 2048  # cap to bound memory/time on very large originals


def _pil_to_cgimage(img: Image.Image):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    raw = buf.getvalue()
    data = NSData.dataWithBytes_length_(raw, len(raw))
    src = Quartz.CGImageSourceCreateWithData(data, None)
    if src is None:
        return None
    return Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)


def vision_text(img: Image.Image) -> str | None:
    if not _VISION_AVAILABLE:
        return None
    w, h = img.size
    if max(w, h) > _VISION_MAXSIDE:
        sc = _VISION_MAXSIDE / max(w, h)
        img = img.convert("RGB").resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    cg = _pil_to_cgimage(img)
    if cg is None:
        return None
    req = Vision.VNDetectBarcodesRequest.alloc().init()
    try:
        req.setSymbologies_([Vision.VNBarcodeSymbologyQR])
    except Exception:
        pass
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, {})
    handler.performRequests_error_([req], None)
    for r in (req.results() or []):
        v = r.payloadStringValue()
        if v:
            return str(v)
    return None


# ----------------------------------------------------------------------------
# WeChat CNN detector (OpenCV contrib) — needs bundled model files
# ----------------------------------------------------------------------------
_WECHAT = None
if hasattr(cv2, "wechat_qrcode"):
    try:
        _WECHAT = cv2.wechat_qrcode.WeChatQRCode(
            str(_MODELS / "detect.prototxt"), str(_MODELS / "detect.caffemodel"),
            str(_MODELS / "sr.prototxt"), str(_MODELS / "sr.caffemodel"),
        )
    except Exception:  # models missing/corrupt — skip WeChat
        _WECHAT = None

_WECHAT_MAXSIDE = 512  # empirically the strongest scale for this detector


def wechat_text(img: Image.Image) -> str | None:
    if _WECHAT is None:
        return None
    rgb = img.convert("RGB")
    w, h = rgb.size
    if max(w, h) > _WECHAT_MAXSIDE:
        sc = _WECHAT_MAXSIDE / max(w, h)
        rgb = rgb.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
    try:
        texts, _ = _WECHAT.detectAndDecode(bgr)
    except Exception:
        return None
    for t in texts:
        if t:
            return str(t)
    return None


# ----------------------------------------------------------------------------
# zxing-cpp — fast final fallback
# ----------------------------------------------------------------------------
def zxing_text(img: Image.Image) -> str | None:
    for r in zxingcpp.read_barcodes(np.array(img.convert("RGB"))):
        if r.text:
            return r.text
    return None


# ----------------------------------------------------------------------------
# Battery — priority order: Vision > WeChat > zxing
# ----------------------------------------------------------------------------
DECODERS: list[tuple[str, object]] = [
    ("vision", vision_text),
    ("wechat", wechat_text),
    ("zxing", zxing_text),
]
DECODER_NAMES = [name for name, _ in DECODERS]


def decode_text(img: Image.Image) -> str | None:
    """First successful decode in priority order, or None."""
    for _, fn in DECODERS:
        text = fn(img)
        if text:
            return text
    return None


def decode_battery(img: Image.Image, expected: str | None = None) -> dict[str, bool]:
    """Per-decoder result. With `expected`, each entry is whether that decoder
    read exactly that payload; without it, whether the decoder read anything."""
    out = {}
    for name, fn in DECODERS:
        text = fn(img)
        out[name] = (text == expected) if expected is not None else bool(text)
    return out


def is_decodable(img: Image.Image, expected: str) -> bool:
    """True if ANY decoder reads `expected` (short-circuits in priority order)."""
    for _, fn in DECODERS:
        if fn(img) == expected:
            return True
    return False


def primary_decoder(clean_img: Image.Image, expected: str):
    """The single strongest decoder (priority order) that reads `clean_img` as
    `expected`, returned as a `fn(img) -> str|None`.  The robustness sweep uses
    one consistent decoder for both the styled image and its clean reference so
    the breaking-point comparison is fair.  Returns None if none decode it."""
    for _, fn in DECODERS:
        if fn(clean_img) == expected:
            return fn
    return None
