from api.schemas.schemas import ImageDoc, User


def test_image_doc_has_unlocked_not_downloaded():
    fields = ImageDoc.model_fields
    assert "unlocked" in fields
    assert "unlock_pending" in fields
    assert "featured" in fields
    assert "downloaded" not in fields
    assert fields["unlocked"].default is False
    assert fields["unlock_pending"].default is False
    assert fields["featured"].default is False


def test_image_doc_has_is_hero():
    fields = ImageDoc.model_fields
    assert "is_hero" in fields
    assert fields["is_hero"].default is False


def test_user_has_no_credits_or_payment_history():
    fields = User.model_fields
    assert "credits" not in fields
    assert "payment_history" not in fields


def test_image_doc_has_scannability_score():
    fields = ImageDoc.model_fields
    assert "scannability_score" in fields
    assert fields["scannability_score"].default is None


def test_image_doc_has_style_id():
    fields = ImageDoc.model_fields
    assert "style_id" in fields
    assert fields["style_id"].default is None


def test_style_schema_has_expected_fields():
    from api.schemas.schemas import Style

    fields = Style.model_fields
    for name in ("style_key", "version", "is_active", "title", "prompt", "loras", "style_modifier", "sd_model"):
        assert name in fields
    assert fields["is_active"].default is True


def test_style_lora_schema_has_model_name_and_strength():
    from api.schemas.schemas import StyleLora

    fields = StyleLora.model_fields
    assert "model_name" in fields
    assert "strength" in fields


def test_style_parses_a_mongo_style_doc():
    from api.schemas.schemas import Style

    doc = {
        "_id": "507f1f77bcf86cd799439099",
        "style_key": "ukiyo-e",
        "version": 1,
        "is_active": True,
        "title": "Ukiyo-e",
        "prompt": "ukiyo-e, woodblock print",
        "loras": [{"model_name": "LAS_17554", "strength": 0.7}],
        "style_modifier": -1,
        "sd_model": "colorful_v31_62333.safetensors",
    }
    style = Style(**doc)
    assert style.id == "507f1f77bcf86cd799439099"
    assert style.loras[0].model_name == "LAS_17554"
    assert style.loras[0].strength == 0.7
