import pytest
from io import BytesIO
from unittest.mock import patch
from PIL import Image

from api.utils.utils import (
    parse_seed,
    prepare_img2img_request,
    createImagesFilterQuery,
    create_watermark,
    parse_style_loras,
    SHORT_PROMPT_THRESHOLD,
    QUALITY_SUFFIX,
)
from novita_client import Img2V3ImgLoRA


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

    def _req(self, qr_weight):
        return prepare_img2img_request(**self.BASE, qr_weight=qr_weight)

    def test_qr_weight_0_controlnet_strength(self):
        unit = self._req(0.0)["controlnet_units"][1]
        assert round(unit.strength, 2) == 0.85

    def test_qr_weight_0_guidance_start(self):
        unit = self._req(0.0)["controlnet_units"][1]
        assert round(unit.guidance_start, 2) == 0.40

    def test_qr_weight_1_controlnet_strength(self):
        unit = self._req(1.0)["controlnet_units"][1]
        assert round(unit.strength, 2) == 1.05

    def test_qr_weight_1_guidance_start(self):
        unit = self._req(1.0)["controlnet_units"][1]
        assert round(unit.guidance_start, 2) == 0.37

    def test_qr_weight_half(self):
        unit = self._req(0.5)["controlnet_units"][1]
        assert round(unit.strength, 2) == 0.95
        assert round(unit.guidance_start, 2) == round(0.4 - 0.5 * 0.03, 2)

    def test_always_two_controlnet_units(self):
        assert len(self._req(0.5)["controlnet_units"]) == 2

    def test_first_unit_is_brightness(self):
        assert self._req(0.5)["controlnet_units"][0].model_name == "control_v1p_sd15_brightness"

    def test_second_unit_is_qrcode_monster(self):
        assert self._req(0.5)["controlnet_units"][1].model_name == "control_v1p_sd15_qrcode_monster_v2"

    def test_prompt_is_concatenated(self):
        # Use a long prompt (>= 7 words) so suffix is NOT appended
        long_prompt = "a beautiful dragon soaring over misty mountain peaks"
        base = dict(self.BASE)
        base["prompt"] = long_prompt
        req = prepare_img2img_request(**base, qr_weight=0.5)
        assert req["prompt"] == long_prompt + self.BASE["style_prompt"]

    def test_brightness_unit_strength_is_fixed(self):
        # Brightness unit strength must not change with qr_weight
        assert self._req(0.0)["controlnet_units"][0].strength == 0.35
        assert self._req(1.0)["controlnet_units"][0].strength == 0.35

    def test_loras_default_to_empty_list(self):
        assert self._req(0.5)["loras"] == []

    def test_loras_passed_through(self):
        from novita_client import Img2V3ImgLoRA
        loras = [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]
        req = prepare_img2img_request(**self.BASE, qr_weight=0.5, loras=loras)
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
        qr_weight=0.5,
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
#                           PARSE STYLE LORAS                                  #
# ---------------------------------------------------------------------------- #

class TestParseStyleLoras:
    def test_empty_string_returns_empty(self):
        assert parse_style_loras("") == []

    def test_none_returns_empty(self):
        assert parse_style_loras(None) == []

    def test_empty_json_array_returns_empty(self):
        assert parse_style_loras("[]") == []

    def test_malformed_json_returns_empty(self):
        assert parse_style_loras("not json") == []

    def test_non_list_json_returns_empty(self):
        assert parse_style_loras('{"model_name": "x"}') == []

    def test_single_valid_lora(self):
        result = parse_style_loras('[{"model_name": "LAS_17554", "strength": 0.7}]')
        assert result == [Img2V3ImgLoRA(model_name="LAS_17554", strength=0.7)]

    def test_two_valid_loras(self):
        result = parse_style_loras(
            '[{"model_name": "wuxia2_62008", "strength": 0.8},'
            ' {"model_name": "MoXinV1_12781", "strength": 0.4}]'
        )
        assert result == [
            Img2V3ImgLoRA(model_name="wuxia2_62008", strength=0.8),
            Img2V3ImgLoRA(model_name="MoXinV1_12781", strength=0.4),
        ]

    def test_name_with_spaces_and_parens_preserved(self):
        result = parse_style_loras('[{"model_name": "0mib3(gut auf 1)_47645", "strength": 0.7}]')
        assert result[0].model_name == "0mib3(gut auf 1)_47645"

    def test_missing_model_name_dropped(self):
        assert parse_style_loras('[{"strength": 0.5}]') == []

    def test_blank_model_name_dropped(self):
        assert parse_style_loras('[{"model_name": "   ", "strength": 0.5}]') == []

    def test_missing_strength_defaults_to_one(self):
        result = parse_style_loras('[{"model_name": "x"}]')
        assert result[0].strength == 1.0

    def test_non_numeric_strength_defaults_to_one(self):
        result = parse_style_loras('[{"model_name": "x", "strength": "abc"}]')
        assert result[0].strength == 1.0

    def test_strength_clamped_high(self):
        result = parse_style_loras('[{"model_name": "x", "strength": 5}]')
        assert result[0].strength == 1.5

    def test_strength_clamped_low(self):
        result = parse_style_loras('[{"model_name": "x", "strength": -2}]')
        assert result[0].strength == 0.0

    def test_caps_at_six_loras(self):
        entries = ",".join(f'{{"model_name": "m{i}", "strength": 0.5}}' for i in range(10))
        result = parse_style_loras(f"[{entries}]")
        assert len(result) == 6

    def test_non_dict_entries_skipped(self):
        result = parse_style_loras('["just a string", {"model_name": "ok", "strength": 0.5}]')
        assert result == [Img2V3ImgLoRA(model_name="ok", strength=0.5)]


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
