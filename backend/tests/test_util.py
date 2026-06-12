from datetime import datetime, timezone

from src.util import slugify, with_version


def test_slugify_strips_accents_and_punctuation():
    assert slugify("À l'école!") == "a-l-ecole"
    assert slugify("  Mon   Grand Livre  ") == "mon-grand-livre"
    assert slugify("!!!") == "untitled"


def test_with_version_appends_timestamp():
    dt = datetime(2026, 6, 12, 12, 0, 0, tzinfo=timezone.utc)
    assert with_version("/uploads/a/b.jpg", dt) == f"/uploads/a/b.jpg?v={int(dt.timestamp())}"


def test_with_version_passthroughs():
    dt = datetime.now(timezone.utc)
    assert with_version(None, dt) is None
    assert with_version("/uploads/a.jpg", None) == "/uploads/a.jpg"
    # Never double-version.
    assert with_version("/uploads/a.jpg?v=1", dt) == "/uploads/a.jpg?v=1"
