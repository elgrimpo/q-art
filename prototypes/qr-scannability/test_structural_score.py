import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageDraw

import scorer
import structural_score as ss

URL = "https://qr-ai.co/struct"


def _clean(url=URL):
    # render_qr uses border=4, full-frame — matches ideal_matrix's grid
    return scorer.render_qr(url).convert("RGB")


def _finder_boxes(img, n):
    """Pixel rectangles of the 3 finder regions for an N-module full-frame image."""
    w, h = img.size
    step_x, step_y = w / n, h / n
    b = ss._BORDER
    spans = [(b, b), (b, n - b - 7), (n - b - 7, b)]  # (row0, col0)
    return [(int(c0*step_x), int(r0*step_y), int((c0+7)*step_x), int((r0+7)*step_y))
            for r0, c0 in spans]


def test_clean_qr_scores_high():
    res = ss.structural_score(_clean(), URL)
    assert res.finder > 0.9
    assert res.margin > 0.9
    assert res.score >= 80


def test_painting_over_finders_collapses_finder_term():
    img = _clean()
    n = ss.ideal_matrix(URL).shape[0]
    d = ImageDraw.Draw(img)
    for box in _finder_boxes(img, n):
        d.rectangle(box, fill=(128, 128, 128))   # flat gray kills finder structure
    res = ss.structural_score(img, URL)
    assert res.finder < 0.3
    assert res.score < ss.structural_score(_clean(), URL).score


def test_low_contrast_lowers_contrast_term():
    faded = ImageEnhance.Contrast(_clean()).enhance(0.15)
    res = ss.structural_score(faded, URL)
    clean = ss.structural_score(_clean(), URL)
    assert res.contrast < clean.contrast


def test_corrupting_data_lowers_margin_but_not_finders():
    img = _clean()
    n = ss.ideal_matrix(URL).shape[0]
    w, h = img.size
    # paint random noise over the central data region, leaving the finder corners
    rng = np.random.default_rng(0)
    arr = np.array(img)
    y0, y1 = int(h * 0.4), int(h * 0.6)
    x0, x1 = int(w * 0.4), int(w * 0.6)
    arr[y0:y1, x0:x1] = rng.integers(0, 255, arr[y0:y1, x0:x1].shape, dtype=np.uint8)
    res = ss.structural_score(Image.fromarray(arr), URL)
    clean = ss.structural_score(_clean(), URL)
    assert res.margin < clean.margin
    assert res.finder > 0.8                     # finders untouched


def test_inverted_polarity_still_scores_high():
    inverted = ImageOps.invert(_clean())
    res = ss.structural_score(inverted, URL)
    assert res.finder > 0.9
    assert res.margin > 0.9
    assert res.score >= 80


def test_min_scannable_modules_smaller_for_clean_than_corrupted():
    clean = ss.structural_score(_clean(), URL)
    assert clean.min_modules <= 8              # clean QR is found even when small


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
