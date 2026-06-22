from __future__ import annotations
import numpy as np
import qrcode
from PIL import Image
import cv2
import zxingcpp


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
