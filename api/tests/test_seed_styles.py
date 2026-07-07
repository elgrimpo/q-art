from api.scripts.seed_styles import STYLES, slugify


class TestSeedStylesData:
    def test_thirteen_styles(self):
        assert len(STYLES) == 13

    def test_every_style_has_required_fields(self):
        for style in STYLES:
            assert isinstance(style["title"], str) and style["title"]
            assert isinstance(style["prompt"], str)
            assert isinstance(style["loras"], list)
            assert isinstance(style["style_modifier"], (int, float))
            assert isinstance(style["sd_model"], str) and style["sd_model"]

    def test_every_lora_entry_has_model_name_and_strength(self):
        for style in STYLES:
            for lora in style["loras"]:
                assert isinstance(lora["model_name"], str) and lora["model_name"]
                assert isinstance(lora["strength"], (int, float))

    def test_titles_are_unique(self):
        titles = [s["title"] for s in STYLES]
        assert len(titles) == len(set(titles))

    def test_no_style_embeds_a_lora_tag_in_its_prompt(self):
        for style in STYLES:
            assert "<lora:" not in style["prompt"].lower()

    def test_random_is_not_included(self):
        titles = [s["title"] for s in STYLES]
        assert "Random" not in titles


class TestSlugify:
    def test_simple_title(self):
        assert slugify("Ukiyo-e") == "ukiyo-e"

    def test_title_with_spaces(self):
        assert slugify("Low Poly Art") == "low-poly-art"

    def test_title_with_mixed_case(self):
        assert slugify("Chinese art") == "chinese-art"
