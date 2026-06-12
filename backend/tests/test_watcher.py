import pytest
from sqlalchemy import select

from src.config.settings import settings
from src.models import Page, PendingFile, Work, WorkSection


@pytest.fixture()
def inbox(client, db_factory, author, monkeypatch):
    """Watcher module with its SessionLocal pointed at the test DB.

    Depends on `client` only for the storage/db monkeypatching it does.
    """
    import src.watcher.inbox as inbox_mod

    return inbox_mod


def _drop(section: str, filename: str, content: bytes = b"x") -> "Path":  # noqa: F821
    path = settings.INBOX_ROOT / "sophie" / section / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def test_noise_files_silently_deleted(inbox):
    path = _drop("drawing", "Thumbs.db")
    inbox.process_inbox_file(path)
    assert not path.exists()
    assert not (settings.INBOX_ROOT / "_errors").exists()


def test_unknown_author_goes_to_errors(inbox):
    path = settings.INBOX_ROOT / "nobody" / "drawing" / "a.jpg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"x")
    inbox.process_inbox_file(path)
    assert not path.exists()
    assert list((settings.INBOX_ROOT / "_errors").iterdir())


def test_unknown_section_goes_to_errors(inbox):
    path = _drop("painting", "a.jpg")
    inbox.process_inbox_file(path)
    assert not path.exists()
    assert list((settings.INBOX_ROOT / "_errors").iterdir())


def test_drawing_creates_single_page_work(inbox, db_factory):
    path = _drop("drawing", "scan.jpg")
    inbox.process_inbox_file(path)
    assert not path.exists()
    with db_factory() as db:
        work = db.scalar(select(Work).where(Work.section == WorkSection.drawing))
        assert work is not None
        assert work.title.startswith("Dessin du ")
        page = db.scalar(select(Page).where(Page.work_id == work.id))
        assert page.idx == 1
        disk = settings.STORAGE_ROOT / page.scan_path[len("/uploads/"):]
        assert disk.exists()


def test_two_drawings_same_day_get_distinct_slugs(inbox, db_factory):
    inbox.process_inbox_file(_drop("drawing", "a.jpg"))
    inbox.process_inbox_file(_drop("drawing", "b.jpg"))
    with db_factory() as db:
        slugs = sorted(db.scalars(select(Work.slug)).all())
    assert len(slugs) == 2
    assert slugs[0] != slugs[1]


def test_book_scan_queues_pending_file(inbox, db_factory):
    path = _drop("book", "page1.jpg")
    inbox.process_inbox_file(path)
    assert not path.exists()
    with db_factory() as db:
        pending = db.scalar(select(PendingFile))
        assert pending is not None
        assert pending.original_filename == "page1.jpg"
        assert pending.section.value == "book"
        from pathlib import Path

        assert Path(pending.disk_path).exists()
