import numpy as np
import pytest
from PIL import Image

import decoders
import scorer


def _clean_qr(text="https://qr-ai.co/dec"):
    return scorer.render_qr(text)


def _noise(seed=0, n=256):
    rng = np.random.default_rng(seed)
    return Image.fromarray(rng.integers(0, 255, (n, n, 3), dtype=np.uint8))


def test_decode_text_reads_clean_qr():
    assert decoders.decode_text(_clean_qr("https://qr-ai.co/round")) == "https://qr-ai.co/round"


def test_battery_has_all_three_decoder_keys():
    battery = decoders.decode_battery(_clean_qr())
    assert set(battery) == {"vision", "wechat", "zxing"}
    assert any(battery.values())  # at least one decoder reads a clean QR


def test_battery_expected_marks_only_matching_payload():
    battery = decoders.decode_battery(_clean_qr("https://qr-ai.co/x"), expected="https://qr-ai.co/x")
    assert all(isinstance(v, bool) for v in battery.values())
    assert any(battery.values())


def test_zxing_always_available_reads_clean_qr():
    # zxing is the dependency-light fallback that must work on every platform.
    assert decoders.zxing_text(_clean_qr("https://qr-ai.co/zx")) == "https://qr-ai.co/zx"


def test_primary_decoder_returns_a_working_reader():
    img = _clean_qr("https://qr-ai.co/prim")
    fn = decoders.primary_decoder(img, "https://qr-ai.co/prim")
    assert callable(fn)
    assert fn(img) == "https://qr-ai.co/prim"


def test_decoders_reject_noise():
    noise = _noise()
    assert decoders.decode_text(noise) is None
    assert not any(decoders.decode_battery(noise).values())
    assert decoders.primary_decoder(noise, "anything") is None


@pytest.mark.skipif(not decoders._VISION_AVAILABLE, reason="Apple Vision is macOS-only")
def test_vision_reads_clean_qr_on_macos():
    assert decoders.vision_text(_clean_qr("https://qr-ai.co/vis")) == "https://qr-ai.co/vis"


@pytest.mark.skipif(decoders._WECHAT is None, reason="WeChat detector/models unavailable")
def test_wechat_reads_clean_qr_when_available():
    assert decoders.wechat_text(_clean_qr("https://qr-ai.co/we")) == "https://qr-ai.co/we"
