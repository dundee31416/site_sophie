from src.models import Page, Work, WorkSection


def _seed_work(db_factory, author, *, section=WorkSection.book, slug="histoire"):
    with db_factory() as db:
        work = Work(
            author_id=author.id,
            section=section,
            slug=slug,
            title="Une histoire",
        )
        db.add(work)
        db.flush()
        page = Page(work_id=work.id, idx=1, scan_path=f"/uploads/sophie/works/{slug}/pages/p001.jpg")
        db.add(page)
        db.commit()
        return work.id


def test_list_authors(client, author, db_factory):
    _seed_work(db_factory, author)
    res = client.get("/api/public/authors")
    assert res.status_code == 200
    (a,) = res.json()
    assert a["username"] == "sophie"
    assert a["work_count"] == 1


def test_list_works_filters_and_versions_urls(client, author, db_factory):
    _seed_work(db_factory, author)
    res = client.get("/api/public/works")
    assert res.status_code == 200
    (w,) = res.json()
    assert w["author_username"] == "sophie"
    # Image URLs must carry the ?v= cache-buster.
    assert "?v=" in w["first_page_path"]

    assert client.get("/api/public/works", params={"section": "comic"}).json() == []
    assert client.get("/api/public/works", params={"author": "nobody"}).json() == []


def test_work_detail_and_404(client, author, db_factory):
    _seed_work(db_factory, author)
    res = client.get("/api/public/works/sophie/histoire")
    assert res.status_code == 200
    detail = res.json()
    assert detail["author_age"] == 7
    assert len(detail["pages"]) == 1
    assert "?v=" in detail["pages"][0]["scan_path"]

    assert client.get("/api/public/works/sophie/nope").status_code == 404
