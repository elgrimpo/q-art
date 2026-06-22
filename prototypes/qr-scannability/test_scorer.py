def test_dependencies_import():
    import numpy  # noqa: F401
    import cv2  # noqa: F401
    import qrcode  # noqa: F401
    import zxingcpp  # noqa: F401
    from PIL import Image  # noqa: F401


from PIL import Image
import numpy as np
import scorer


def test_render_qr_roundtrips():
    img = scorer.render_qr("https://qr-ai.co/test")
    assert scorer.decode_text(img) == "https://qr-ai.co/test"


def test_battery_reads_clean_qr():
    img = scorer.render_qr("https://qr-ai.co/abc")
    battery = scorer.decode_battery(img, expected="https://qr-ai.co/abc")
    assert battery["zxing"] is True
    assert any(battery.values())


def test_battery_rejects_noise():
    rng = np.random.default_rng(0)
    noise = Image.fromarray(rng.integers(0, 255, (256, 256, 3), dtype=np.uint8))
    assert scorer.is_decodable(noise, "anything") is False


import pytest


def test_blend_uses_both_when_a_present():
    assert scorer.blend_score(80.0, 60.0) == pytest.approx(74.0)


def test_blend_falls_back_to_b_when_a_none():
    assert scorer.blend_score(55.0, None) == pytest.approx(55.0)


def test_blend_clamps():
    assert scorer.blend_score(200.0, 200.0) == 100.0
    assert scorer.blend_score(-5.0, None) == 0.0


@pytest.mark.parametrize("score,expected", [
    (0, "Won't scan"), (20, "Risky"), (50, "Fragile (scans slowly)"),
    (70, "Good"), (95, "Excellent"),
])
def test_band(score, expected):
    assert scorer.band(score) == expected
