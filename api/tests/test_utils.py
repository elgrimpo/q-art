import pytest
from io import BytesIO
from unittest.mock import patch
from PIL import Image

from api.utils.utils import (
    parse_seed,
    prepare_img2img_request,
    createImagesFilterQuery,
    create_watermark,
    SHORT_PROMPT_THRESHOLD,
    QUALITY_SUFFIX,
)


# ---------------------------------------------------------------------------- #
#                                PARSE SEED                                    #
# ---------------------------------------------------------------------------- #

class TestParseSeed:
    def test_extracts_seed_value(self):
        metadata = "Steps: 30, Sampler: DPM++ 2M Karras, Seed: 12345, Size: 512x512"
        assert parse_seed(metadata) == 12345

    def test_returns_none_when_missing(self):
        assert parse_seed("Steps: 30, Sampler: DPM++ 2M Karras") is None

    def test_returns_int(self):
        assert isinstance(parse_seed("Seed: 99"), int)

    def test_large_seed_value(self):
        assert parse_seed("Seed: 3141592653") == 3141592653


# ---------------------------------------------------------------------------- #
#                         PREPARE IMG2IMG REQUEST                              #
# ---------------------------------------------------------------------------- #

class TestPrepareImg2ImgRequest:
    BASE = dict(
        prompt="a dragon",
        negative_prompt="ugly",
        sd_model="sd-v1-5",
        seed=42,
        image_base64_str="base64string==",
        style_prompt=", cinematic",
    )

    def _req(self, qr_weight=0, style_modifier=0):
        return prepare_img2img_request(**self.BASE, qr_weight=qr_weight, style_modifier=style_modifier)

    def test_qrcode_monster_strength_default(self):
        unit = self._req()["controlnet_units"][1]
        assert unit.strength == round(1.40 + 0 * 0.05, 2)

    def test_qrcode_monster_guidance_start_default(self):
        unit = self._req()["controlnet_units"][1]
        assert unit.guidance_start == round(0.4 - 0 * 0.025, 2)

    def test_qrcode_monster_strength_scales_with_qr_weight(self):
        unit = self._req(qr_weight=2)["controlnet_units"][1]
        assert unit.strength == round(1.40 + 2 * 0.05, 2)

    def test_qrcode_monster_guidance_start_scales_with_qr_weight(self):
        unit = self._req(qr_weight=2)["controlnet_units"][1]
        assert unit.guidance_start == round(0.4 - 2 * 0.025, 2)

    def test_qrcode_monster_guidance_end_scales_with_qr_weight(self):
        unit = self._req(qr_weight=2)["controlnet_units"][1]
        assert unit.guidance_end == round(0.925 + 2 * 0.0125, 2)

    def test_style_modifier_combines_additively_with_qr_weight(self):
        # qr_weight=1 + style_modifier=1 must produce the same request as qr_weight=2 alone.
        combined = self._req(qr_weight=1, style_modifier=1)["controlnet_units"][1]
        solo = self._req(qr_weight=2, style_modifier=0)["controlnet_units"][1]
        assert combined.strength == solo.strength
        assert combined.guidance_start == solo.guidance_start
        assert combined.guidance_end == solo.guidance_end

    def test_top_level_strength_scales_with_combined_weight(self):
        req = self._req(qr_weight=2, style_modifier=-1)
        assert req["strength"] == round(0.925 + 1 * 0.0125, 2)

    def test_always_two_controlnet_units(self):
        assert len(self._req()["controlnet_units"]) == 2

    def test_first_unit_is_brightness(self):
        assert self._req()["controlnet_units"][0].model_name == "control_v1p_sd15_brightness"

    def test_second_unit_is_qrcode_monster(self):
        assert self._req()["controlnet_units"][1].model_name == "control_v1p_sd15_qrcode_monster_v2"

    def test_prompt_is_concatenated(self):
        # Use a long prompt (>= 7 words) so suffix is NOT appended
        long_prompt = "a beautiful dragon soaring over misty mountain peaks"
        base = dict(self.BASE)
        base["prompt"] = long_prompt
        req = prepare_img2img_request(**base, qr_weight=0)
        assert req["prompt"] == long_prompt + self.BASE["style_prompt"]

    def test_brightness_unit_strength_default(self):
        # qr_weight=0, style_modifier=0 (defaults) → strength 0.4
        assert self._req()["controlnet_units"][0].strength == round(0.4 + 0 * 0.025, 2)

    def test_brightness_unit_strength_formula(self):
        assert self._req(qr_weight=-2)["controlnet_units"][0].strength == round(0.4 + -2 * 0.025, 2)
        assert self._req(qr_weight=-1)["controlnet_units"][0].strength == round(0.4 + -1 * 0.025, 2)
        assert self._req(qr_weight=1)["controlnet_units"][0].strength == round(0.4 + 1 * 0.025, 2)
        assert self._req(qr_weight=2)["controlnet_units"][0].strength == round(0.4 + 2 * 0.025, 2)

    def test_brightness_unit_strength_includes_style_modifier(self):
        assert self._req(qr_weight=1, style_modifier=1)["controlnet_units"][0].strength == round(0.4 + 2 * 0.025, 2)

    def test_loras_default_to_empty_list(self):
        assert self._req()["loras"] == []

    def test_loras_passed_through(self):
        from novita_client import Img2V3ImgLoRA
        loras = [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]
        req = prepare_img2img_request(**self.BASE, qr_weight=0, loras=loras)
        assert req["loras"] == loras


# ---------------------------------------------------------------------------- #
#                        SHORT PROMPT QUALITY SUFFIX                           #
# ---------------------------------------------------------------------------- #

class TestShortPromptSuffix:
    BASE = dict(
        negative_prompt="ugly",
        sd_model="sd-v1-5",
        seed=42,
        image_base64_str="base64string==",
        style_prompt="",
        qr_weight=0,
    )

    def test_short_prompt_gets_suffix(self):
        req = prepare_img2img_request(prompt="a cat", **self.BASE)
        assert QUALITY_SUFFIX in req["prompt"]

    def test_long_prompt_unchanged(self):
        long_prompt = "a beautiful dragon soaring over misty mountain peaks at golden hour"
        req = prepare_img2img_request(prompt=long_prompt, **self.BASE)
        assert req["prompt"] == long_prompt + self.BASE["style_prompt"]

    def test_prompt_at_threshold_unchanged(self):
        # A prompt with exactly SHORT_PROMPT_THRESHOLD words must NOT get the suffix
        prompt = " ".join(["word"] * SHORT_PROMPT_THRESHOLD)
        req = prepare_img2img_request(prompt=prompt, **self.BASE)
        assert QUALITY_SUFFIX not in req["prompt"]

    def test_suffix_combined_with_style_prompt(self):
        req = prepare_img2img_request(prompt="a cat", style_prompt=", cinematic", **{
            k: v for k, v in self.BASE.items() if k != "style_prompt"
        })
        assert QUALITY_SUFFIX in req["prompt"]
        assert ", cinematic" in req["prompt"]

    def test_threshold_is_int(self):
        assert isinstance(SHORT_PROMPT_THRESHOLD, int)

    def test_suffix_is_string(self):
        assert isinstance(QUALITY_SUFFIX, str)
        assert len(QUALITY_SUFFIX) > 0


# ---------------------------------------------------------------------------- #
#                                PREPARE DOC                                    #
# ---------------------------------------------------------------------------- #

from api.utils.utils import prepare_doc


class TestPrepareDoc:
    def _req(self):
        return prepare_img2img_request(
            prompt="a dragon",
            negative_prompt="ugly",
            sd_model="sd-v1-5",
            seed=42,
            image_base64_str="base64string==",
            qr_weight=0,
            style_prompt=", cinematic",
        )

    def test_style_id_is_stored_on_the_doc(self):
        doc = prepare_doc(
            self._req(), 42, "https://example.com", 0, "user_1", "a dragon",
            ", cinematic", "Cinematic", style_id="507f1f77bcf86cd799439099",
        )
        assert doc.style_id == "507f1f77bcf86cd799439099"

    def test_style_id_defaults_to_none(self):
        doc = prepare_doc(
            self._req(), 42, "https://example.com", 0, "user_1", "a dragon",
            ", cinematic", "Cinematic",
        )
        assert doc.style_id is None


# ---------------------------------------------------------------------------- #
#                         CREATE IMAGES FILTER QUERY                           #
# ---------------------------------------------------------------------------- #

class TestCreateImagesFilterQuery:
    def test_no_args_returns_empty_query(self):
        assert createImagesFilterQuery() == {}

    def test_user_id_included(self):
        query = createImagesFilterQuery(user_id="user123")
        assert query["user_id"] == "user123"

    def test_exclude_user_id(self):
        query = createImagesFilterQuery(exclude_user_id="user123")
        assert query["user_id"] == {"$ne": "user123"}

    def test_image_style_filter(self):
        query = createImagesFilterQuery(image_style="Cyberpunk")
        assert query["style_title"] == "Cyberpunk"

    def test_time_period_today_adds_created_at(self):
        query = createImagesFilterQuery(time_period="Today")
        assert "created_at" in query
        assert "$gte" in query["created_at"] and "$lte" in query["created_at"]

    def test_time_period_this_week(self):
        assert "created_at" in createImagesFilterQuery(time_period="This Week")

    def test_time_period_this_month(self):
        assert "created_at" in createImagesFilterQuery(time_period="This Month")

    def test_time_period_this_year(self):
        assert "created_at" in createImagesFilterQuery(time_period="This Year")

    def test_liked_by_me_adds_nested_query(self):
        query = createImagesFilterQuery(likes="Liked by me", user_id="user123")
        assert query["likes.userId"] == "user123"

    def test_multiple_filters_combined(self):
        query = createImagesFilterQuery(
            user_id="user123", image_style="Anime", time_period="Today"
        )
        assert query["user_id"] == "user123"
        assert query["style_title"] == "Anime"
        assert "created_at" in query

    def test_filter_query_featured_true(self):
        query = createImagesFilterQuery(None, None, None, None, None, featured=True)
        assert query["featured"] is True

    def test_filter_query_featured_none_omits_key(self):
        query = createImagesFilterQuery(None, None, None, None, None, featured=None)
        assert "featured" not in query


# ---------------------------------------------------------------------------- #
#                             CREATE WATERMARK                                 #
# ---------------------------------------------------------------------------- #

class TestCreateWatermark:
    def _img(self, size=(512, 512)):
        return Image.new("RGB", size, "white")

    def test_returns_pil_image(self):
        result = create_watermark(self._img())
        assert isinstance(result, Image.Image)

    def test_preserves_original_dimensions(self):
        img = self._img((512, 512))
        result = create_watermark(img)
        assert result.size == img.size

    def test_does_not_mutate_original(self):
        img = self._img()
        original_pixel = img.getpixel((0, 0))
        create_watermark(img)
        assert img.getpixel((0, 0)) == original_pixel

    def test_returns_none_when_watermark_file_missing(self):
        with patch("api.utils.utils.Image.open", side_effect=FileNotFoundError):
            result = create_watermark(self._img())
        assert result is None


# ---------------------------------------------------------------------------- #
#                          STRUCTURAL SCORE                                     #
# ---------------------------------------------------------------------------- #

from api.utils.structural_score import structural_score

class TestStructuralScore:
    def test_returns_score_for_plain_image(self):
        img = Image.new("RGB", (512, 512), "white")
        result = structural_score(img, "https://example.com")
        assert isinstance(result.score, float)
        assert 0.0 <= result.score <= 100.0

    def test_plain_qr_scores_high(self):
        import qrcode as qrcode_lib
        qr = qrcode_lib.QRCode(
            error_correction=qrcode_lib.constants.ERROR_CORRECT_H, border=4
        )
        qr.add_data("https://example.com")
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        result = structural_score(img, "https://example.com")
        assert result.score >= 80.0, f"Expected ≥80 for clean QR, got {result.score}"


# ---------------------------------------------------------------------------- #
#                           NORMALIZE QR URL                                   #
# ---------------------------------------------------------------------------- #

from api.utils.utils import normalize_qr_url

class TestNormalizeQrUrl:
    def test_strips_https(self):
        assert normalize_qr_url("https://example.com") == "example.com"

    def test_strips_http(self):
        assert normalize_qr_url("http://example.com") == "example.com"

    def test_strips_www(self):
        assert normalize_qr_url("www.example.com") == "example.com"

    def test_strips_https_and_www(self):
        assert normalize_qr_url("https://www.example.com") == "example.com"

    def test_strips_trailing_slash(self):
        assert normalize_qr_url("https://example.com/") == "example.com"

    def test_preserves_path(self):
        assert normalize_qr_url("https://example.com/menu") == "example.com/menu"

    def test_preserves_path_with_trailing_slash(self):
        assert normalize_qr_url("https://example.com/menu/") == "example.com/menu/"

    def test_already_clean_url_unchanged(self):
        assert normalize_qr_url("example.com") == "example.com"

    def test_preserves_query_string(self):
        assert normalize_qr_url("https://example.com/page?q=1") == "example.com/page?q=1"

    def test_empty_string_unchanged(self):
        assert normalize_qr_url("") == ""
