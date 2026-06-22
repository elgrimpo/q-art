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


def test_margin_clean_qr_near_full():
    text = "https://qr-ai.co/margin"
    score = scorer.margin_score(scorer.render_qr(text), text)
    assert score is not None and score >= 90


def test_margin_returns_none_on_unlocalizable():
    rng = np.random.default_rng(1)
    noise = Image.fromarray(rng.integers(0, 255, (300, 300, 3), dtype=np.uint8))
    assert scorer.margin_score(noise, "https://qr-ai.co/x") is None


def test_score_plain_qr_is_excellent():
    res = scorer.score_image(scorer.render_qr("https://qr-ai.co/excellent"), "plain.png")
    assert res.score >= 80
    assert res.band == "Excellent"
    assert res.decoded_url == "https://qr-ai.co/excellent"


def test_score_corrupted_qr_is_low():
    rng = np.random.default_rng(0)
    arr = np.array(scorer.render_qr("https://qr-ai.co/corrupt").convert("L"))
    mask = rng.random(arr.shape) < 0.18           # flip 18% of pixels
    arr[mask] = 255 - arr[mask]
    corrupted = Image.fromarray(arr).convert("RGB")
    res = scorer.score_image(corrupted, "corrupt.png")
    assert res.score < 40                          # Risky or Won't scan


def test_score_noise_is_zero():
    rng = np.random.default_rng(2)
    noise = Image.fromarray(rng.integers(0, 255, (256, 256, 3), dtype=np.uint8))
    res = scorer.score_image(noise, "noise.png")
    assert res.score == 0
    assert res.band == "Won't scan"
    assert res.decoded_url is None


def test_score_decodable_but_degraded_lands_midrange():
    # A blurry, low-contrast capture: still scannable, but visibly more fragile
    # than a pristine QR. Exercises the full score_image path with BOTH methods
    # producing real intermediate values — the product's core "scannable but
    # slow" case, which the extreme fixtures (clean/corrupted/noise) miss.
    from PIL import ImageFilter, ImageEnhance
    text = "https://qr-ai.co/midband"
    degraded = ImageEnhance.Contrast(
        scorer.render_qr(text).filter(ImageFilter.GaussianBlur(4))
    ).enhance(0.4)
    res = scorer.score_image(degraded, "degraded.png")
    assert res.decoded_url == text                  # still scannable when clean
    assert res.method_b is not None and res.method_a is not None
    assert 0 < res.score < 100                       # strictly intermediate
    assert res.method_b < 100                        # Method B is the discriminator
    assert res.method_a < 100                        # Method A also registers degradation


def test_format_result_contains_key_lines():
    res = scorer.score_image(scorer.render_qr("https://qr-ai.co/fmt"), "fmt.png")
    text = scorer.format_result(res)
    assert "fmt.png" in text
    assert "Excellent" in text
    assert "https://qr-ai.co/fmt" in text
    assert "downscale" in text


def test_cli_skips_unreadable_file_and_continues(tmp_path, capsys):
    import score_qr
    scorer.render_qr("https://qr-ai.co/cli-good").save(tmp_path / "good.png")
    (tmp_path / "bad.png").write_bytes(b"not an image")
    rc = score_qr.main(["score_qr.py", str(tmp_path)])
    out = capsys.readouterr().out
    assert rc == 0
    assert "good.png" in out          # the valid image was still scored
    assert "WARNING" in out and "bad.png" in out  # the bad file was skipped, not fatal
    assert "SUMMARY" in out           # the summary table still printed
