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


def test_robustness_clean_qr_scores_high():
    img = scorer.render_qr("https://qr-ai.co/robust")
    ref = scorer.render_qr("https://qr-ai.co/robust")
    score, breakpoints = scorer.robustness_score(img, "https://qr-ai.co/robust", ref)
    assert score >= 85
    assert set(breakpoints) == {"downscale", "blur", "contrast", "rotation", "perspective", "jpeg"}


def test_robustness_degraded_qr_scores_lower_than_clean():
    # A blurry, low-contrast capture: still decodable when clean, but visibly
    # more fragile than a pristine QR. GaussianBlur(3) alone is too mild to
    # move a breaking point against this tolerant decoder, so we combine a
    # stronger blur with a contrast crush (a realistic poor-photo condition).
    from PIL import ImageFilter, ImageEnhance
    text = "https://qr-ai.co/cmp"
    ref = scorer.render_qr(text)
    clean_score, _ = scorer.robustness_score(scorer.render_qr(text), text, ref)
    degraded_img = ImageEnhance.Contrast(
        scorer.render_qr(text).filter(ImageFilter.GaussianBlur(4))
    ).enhance(0.4)
    assert scorer.decode_text(degraded_img) == text  # still scannable when clean
    degraded_score, _ = scorer.robustness_score(degraded_img, text, ref)
    assert degraded_score < clean_score


def test_robustness_undecodable_image_scores_zero():
    # robustness_score on an image that does not decode even at level 0 must
    # score 0 and honestly report -1 breakpoints (not a false 0).
    rng = np.random.default_rng(7)
    noise = Image.fromarray(rng.integers(0, 255, (300, 300, 3), dtype=np.uint8))
    ref = scorer.render_qr("https://qr-ai.co/ref")
    score, bp = scorer.robustness_score(noise, "https://qr-ai.co/ref", ref)
    assert score == 0.0
    assert all(v == -1 for v in bp.values())
