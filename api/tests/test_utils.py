import pytest
from io import BytesIO
from unittest.mock import patch
from PIL import Image

from api.utils.utils import (
    calculate_credits,
    sufficient_credit,
    parse_seed,
    prepare_img2img_request,
    createImagesFilterQuery,
    create_watermark,
)


# ---------------------------------------------------------------------------- #
#                            CALCULATE CREDITS                                 #
# ---------------------------------------------------------------------------- #

class TestCalculateCredits:
    def test_generate_costs_1(self):
        assert calculate_credits({"generate": "1"}) == 1

    def test_download_true_costs_10(self):
        assert calculate_credits({"download": True}) == 10

    def test_download_false_costs_0(self):
        assert calculate_credits({"download": False}) == 0

    def test_upscale_512_costs_10(self):
        assert calculate_credits({"upscale_resize": 512}) == 10

    def test_upscale_1024_costs_15(self):
        assert calculate_credits({"upscale_resize": 1024}) == 15

    def test_upscale_2048_costs_20(self):
        assert calculate_credits({"upscale_resize": 2048}) == 20

    def test_upscale_4096_costs_25(self):
        assert calculate_credits({"upscale_resize": 4096}) == 25

    def test_no_upscale_costs_0(self):
        assert calculate_credits({"upscale_resize": 0}) == 0

    def test_generate_plus_download(self):
        assert calculate_credits({"generate": "1", "download": True}) == 11

    def test_upscale_plus_download(self):
        assert calculate_credits({"upscale_resize": 1024, "download": True}) == 25

    def test_empty_input_costs_0(self):
        assert calculate_credits({}) == 0


# ---------------------------------------------------------------------------- #
#                            SUFFICIENT CREDIT                                 #
# ---------------------------------------------------------------------------- #

class TestSufficientCredit:
    def test_exact_credits_passes(self):
        assert sufficient_credit({"credits": 1}, {"generate": "1"}) is True

    def test_one_short_fails(self):
        assert sufficient_credit({"credits": 0}, {"generate": "1"}) is False

    def test_surplus_credits_passes(self):
        assert sufficient_credit({"credits": 100}, {"generate": "1", "download": True}) is True

    def test_missing_credits_key_defaults_to_zero(self):
        assert sufficient_credit({}, {"generate": "1"}) is False

    def test_zero_cost_service_always_passes(self):
        # download=False costs 0, so even a user with 0 credits passes
        assert sufficient_credit({"credits": 0}, {"download": False}) is True


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
        assert self._req(0.5)["prompt"] == "a dragon, cinematic"

    def test_brightness_unit_strength_is_fixed(self):
        # Brightness unit strength must not change with qr_weight
        assert self._req(0.0)["controlnet_units"][0].strength == 0.35
        assert self._req(1.0)["controlnet_units"][0].strength == 0.35


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
