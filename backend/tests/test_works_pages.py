import io

from PIL import Image

from src.config.settings import settings
from src.models import Page, Work
from src.util import storage_url


def _png_bytes(color=(200, 30, 30), size=(40, 40)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def _create_work(client, title="Mon livre", section="book") -> dict:
    res = client.post("/api/me/works", json={"section": section, "title": title})
    assert res.status_code == 201, res.text
    return res.json()


def _add_page(db_factory, work: dict, idx: int, username="sophie") -> int:
    """Insert a page row with a real file on disk behind it."""
    from src.storage import page_path

    dest = page_path(username, work["slug"], idx, "png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(_png_bytes())
    with db_factory() as db:
        page = Page(
            work_id=work["id"],
            idx=idx,
            scan_path=storage_url(dest, settings.STORAGE_ROOT),
        )
        db.add(page)
        db.commit()
        return page.id


def test_create_work_slugifies_and_dedupes(logged_in):
    w1 = _create_work(logged_in, title="À l'école!")
    w2 = _create_work(logged_in, title="À l'école!")
    assert w1["slug"] == "a-l-ecole"
    assert w2["slug"] == "a-l-ecole-2"


def test_requires_auth(client):
    assert client.get("/api/me/works").status_code == 401


def test_upload_pages_sets_auto_ai_flags(logged_in, db_factory):
    work = _create_work(logged_in)
    res = logged_in.post(
        f"/api/me/works/{work['id']}/pages",
        files=[("files", ("scan.png", _png_bytes(), "image/png"))],
    )
    assert res.status_code == 201, res.text
    (page,) = res.json()
    # Books auto-enhance + auto-transcribe.
    assert page["enhance_pending"] is True
    assert page["transcribe_pending"] is True
    assert page["scan_path"].startswith("/uploads/")
    assert "?v=" in page["scan_path"]
    # Without a Gemini key the background jobs fail and clear their flags
    # instead of leaving the UI spinning (TestClient runs them inline).
    with db_factory() as db:
        db_page = db.get(Page, page["id"])
        assert db_page.enhance_pending is False
        assert db_page.transcribe_pending is False


def test_single_image_work_rejects_multiple_files(logged_in):
    work = _create_work(logged_in, title="Dessin", section="drawing")
    res = logged_in.post(
        f"/api/me/works/{work['id']}/pages",
        files=[
            ("files", ("a.png", _png_bytes(), "image/png")),
            ("files", ("b.png", _png_bytes(), "image/png")),
        ],
    )
    assert res.status_code == 400


def test_reorder_rejects_bad_permutation(logged_in, db_factory):
    work = _create_work(logged_in)
    p1 = _add_page(db_factory, work, 1)
    _add_page(db_factory, work, 2)
    res = logged_in.patch(
        f"/api/me/works/{work['id']}/pages/order", json={"page_ids": [p1, 999]}
    )
    assert res.status_code == 400


def test_reorder_pages(logged_in, db_factory):
    work = _create_work(logged_in)
    p1 = _add_page(db_factory, work, 1)
    p2 = _add_page(db_factory, work, 2)
    p3 = _add_page(db_factory, work, 3)
    res = logged_in.patch(
        f"/api/me/works/{work['id']}/pages/order", json={"page_ids": [p3, p1, p2]}
    )
    assert res.status_code == 200
    got = {p["id"]: p["idx"] for p in res.json()}
    assert got == {p3: 1, p1: 2, p2: 3}


def test_split_work_at_page(logged_in, db_factory):
    work = _create_work(logged_in, title="Grand livre")
    for i in (1, 2, 3, 4):
        _add_page(db_factory, work, i)
    pages = logged_in.get(f"/api/me/works/{work['id']}").json()["pages"]
    page3 = next(p for p in pages if p["idx"] == 3)

    res = logged_in.post(
        f"/api/me/works/{work['id']}/pages/{page3['id']}/split",
        json={"title": "La suite"},
    )
    assert res.status_code == 201, res.text
    new_work = res.json()
    assert new_work["title"] == "La suite"

    src_pages = logged_in.get(f"/api/me/works/{work['id']}").json()["pages"]
    dst_pages = logged_in.get(f"/api/me/works/{new_work['id']}").json()["pages"]
    assert [p["idx"] for p in src_pages] == [1, 2]
    assert [p["idx"] for p in dst_pages] == [1, 2]


def test_move_page_to_other_work(logged_in, db_factory):
    w1 = _create_work(logged_in, title="Livre un")
    w2 = _create_work(logged_in, title="Livre deux")
    p1 = _add_page(db_factory, w1, 1)
    _add_page(db_factory, w2, 1)

    res = logged_in.post(f"/api/me/works/{w1['id']}/pages/{p1}/move-to/{w2['id']}")
    assert res.status_code == 200, res.text
    assert res.json()["idx"] == 2

    assert logged_in.get(f"/api/me/works/{w1['id']}").json()["pages"] == []


def test_delete_page_removes_file(logged_in, db_factory):
    work = _create_work(logged_in)
    pid = _add_page(db_factory, work, 1)
    with db_factory() as db:
        url = db.get(Page, pid).scan_path
    disk = settings.STORAGE_ROOT / url[len("/uploads/"):]
    assert disk.exists()

    res = logged_in.delete(f"/api/me/works/{work['id']}/pages/{pid}")
    assert res.status_code == 204
    assert not disk.exists()


def test_ai_endpoints_503_without_gemini_key(logged_in, db_factory):
    work = _create_work(logged_in)
    pid = _add_page(db_factory, work, 1)
    for op in ("transcribe", "enhance", "restyle"):
        res = logged_in.post(f"/api/me/works/{work['id']}/pages/{pid}/{op}")
        assert res.status_code == 503, f"{op}: {res.status_code}"
    # The 503 preflight must not leave pending flags behind.
    with db_factory() as db:
        page = db.get(Page, pid)
        assert not page.enhance_pending
        assert not page.transcribe_pending
        assert not page.restyle_pending


def test_cannot_touch_other_authors_work(logged_in, db_factory):
    from tests.conftest import PASSWORD_HASH
    from src.models import User, UserRole

    with db_factory() as db:
        other = User(username="leo", password_hash=PASSWORD_HASH, role=UserRole.author)
        db.add(other)
        db.flush()
        foreign = Work(author_id=other.id, section="book", slug="secret", title="Secret")
        db.add(foreign)
        db.commit()
        foreign_id = foreign.id

    assert logged_in.get(f"/api/me/works/{foreign_id}").status_code == 404
    assert logged_in.delete(f"/api/me/works/{foreign_id}").status_code == 404
