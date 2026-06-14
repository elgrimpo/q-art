from api.schemas.schemas import ImageDoc, User


def test_image_doc_has_unlocked_not_downloaded():
    fields = ImageDoc.model_fields
    assert "unlocked" in fields
    assert "unlock_pending" in fields
    assert "downloaded" not in fields
    assert fields["unlocked"].default is False
    assert fields["unlock_pending"].default is False


def test_user_has_no_credits_or_payment_history():
    fields = User.model_fields
    assert "credits" not in fields
    assert "payment_history" not in fields
