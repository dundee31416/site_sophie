"""Smoke test the Phase-7 plan changes:
- Auto-AI on cover upload (BackgroundTasks fires, pending flags set)
- File watcher: drawing path (1 file -> 1 Drawing work)
- File watcher: book path (1 file -> 1 PendingFile row)
- Pending assemble (PendingFile rows -> new Work + auto-AI)
- Move + Split page endpoints

Skips the actual Gemini wall-clock wait (~30s) and just confirms wiring.
"""
import base64
import io
import os
import sys
import time
from pathlib import Path

import httpx

BASE = "http://localhost:8000"
ADMIN_USER = "admin"
ADMIN_PASS = os.environ.get("ADMIN_PASSWORD", "admin")
AUTHOR_USER = "p7-author"
AUTHOR_PASS = "p7-hunter"

# 1x1 transparent PNG (~67 bytes)
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

INBOX_ROOT = Path(os.environ.get("INBOX_ROOT", "/data/inbox"))
STORAGE_ROOT = Path(os.environ.get("STORAGE_ROOT", "/data/storage"))


def ok(msg: str) -> None:
    print(f"  [OK ] {msg}")


def fail(msg: str) -> None:
    print(f"  [FAIL] {msg}")
    sys.exit(1)


def main() -> None:
    print("== Phase-7 smoke ==")

    # 0. Login as admin, ensure test author exists
    admin = httpx.Client(base_url=BASE, timeout=15.0)
    r = admin.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login: {r.status_code} {r.text}"
    ok("admin logged in")

    # Delete any pre-existing test author + works
    r = admin.get("/api/admin/authors")
    existing = next((a for a in r.json() if a["username"] == AUTHOR_USER), None)
    if existing:
        admin.delete(f"/api/admin/authors/{existing['id']}")

    r = admin.post(
        "/api/admin/authors",
        json={"username": AUTHOR_USER, "password": AUTHOR_PASS, "display_name": "Phase7"},
    )
    assert r.status_code == 201, f"create author: {r.status_code} {r.text}"
    ok(f"created author {AUTHOR_USER}")

    # 1. Login as author
    author = httpx.Client(base_url=BASE, timeout=15.0)
    r = author.post("/api/auth/login", json={"username": AUTHOR_USER, "password": AUTHOR_PASS})
    assert r.status_code == 200, f"author login: {r.status_code}"
    ok("author logged in")

    # 2. Create a Book work
    r = author.post(
        "/api/me/works",
        json={"section": "book", "title": "Phase 7 Test Book"},
    )
    assert r.status_code == 201, f"create work: {r.status_code} {r.text}"
    work = r.json()
    book_id = work["id"]
    assert work["cover_enhance_pending"] is False
    assert work["cover_restyle_pending"] is False
    assert work["cover_variant"] is None
    ok(f"created Book id={book_id}, pending flags all False")

    # 3. Upload a cover — confirm pending flags flip True in the response
    r = author.post(
        f"/api/me/works/{book_id}/cover",
        files={"file": ("cover.png", io.BytesIO(TINY_PNG), "image/png")},
    )
    assert r.status_code == 200, f"upload cover: {r.status_code} {r.text}"
    work = r.json()
    assert work["cover_path"] is not None
    if not work["cover_enhance_pending"]:
        fail("after cover upload, cover_enhance_pending should be True")
    if not work["cover_restyle_pending"]:
        fail("after cover upload, cover_restyle_pending should be True")
    ok("cover uploaded; both cover_*_pending flags set True (BackgroundTasks queued)")

    # 4. cover_variant patch
    r = author.patch(f"/api/me/works/{book_id}", json={"cover_variant": "enhanced"})
    assert r.status_code == 200, f"patch cover_variant: {r.status_code} {r.text}"
    assert r.json()["cover_variant"] == "enhanced"
    ok("cover_variant=enhanced persisted")
    r = author.patch(f"/api/me/works/{book_id}", json={"cover_variant": None})
    assert r.status_code == 200
    ok("cover_variant cleared back to None")

    # 5. Upload a page — confirm enhance_pending + transcribe_pending flip True for books
    r = author.post(
        f"/api/me/works/{book_id}/pages",
        files=[("files", ("p1.png", io.BytesIO(TINY_PNG), "image/png"))],
    )
    assert r.status_code == 201, f"upload page: {r.status_code} {r.text}"
    pages = r.json()
    assert len(pages) == 1
    p = pages[0]
    if not p["enhance_pending"]:
        fail("book page should have enhance_pending=True after upload")
    if not p["transcribe_pending"]:
        fail("book page should have transcribe_pending=True after upload")
    page_id = p["id"]
    ok(f"book page id={page_id}: both per-page pending flags True")

    # 6. Drawing work — page upload should NOT set pending flags
    r = author.post("/api/me/works", json={"section": "drawing", "title": "Dessin test"})
    drawing_id = r.json()["id"]
    r = author.post(
        f"/api/me/works/{drawing_id}/pages",
        files=[("files", ("d1.png", io.BytesIO(TINY_PNG), "image/png"))],
    )
    assert r.status_code == 201
    dpage = r.json()[0]
    if dpage["enhance_pending"]:
        fail("drawing page should NOT have enhance_pending=True")
    if dpage["transcribe_pending"]:
        fail("drawing page should NOT have transcribe_pending=True")
    ok("drawing page: pending flags both False (no auto-AI on drawings)")

    # 7. File watcher: drawing path
    drawing_inbox = INBOX_ROOT / AUTHOR_USER / "drawing"
    drawing_inbox.mkdir(parents=True, exist_ok=True)
    watcher_drawing = drawing_inbox / "watcher_test.png"
    watcher_drawing.write_bytes(TINY_PNG)
    ok(f"dropped {watcher_drawing}")

    # Wait for watcher to pick it up. Default stability is 2s, plus DB write.
    found_drawing = None
    for _ in range(30):
        time.sleep(1)
        r = author.get("/api/me/works")
        rows = r.json()
        drawing_works = [w for w in rows if w["section"] == "drawing" and w["title"].startswith("Dessin du")]
        if drawing_works:
            found_drawing = drawing_works[0]
            break
    if found_drawing is None:
        fail("watcher did not create a Drawing work after 30s")
    ok(f"watcher created Drawing work id={found_drawing['id']} title='{found_drawing['title']}'")

    if watcher_drawing.exists():
        fail(f"watcher should have moved the file; it's still at {watcher_drawing}")
    ok("watcher moved the source file off inbox")

    # 8. File watcher: book path -> PendingFile
    book_inbox = INBOX_ROOT / AUTHOR_USER / "book"
    book_inbox.mkdir(parents=True, exist_ok=True)
    watcher_book = book_inbox / "watcher_book.png"
    watcher_book.write_bytes(TINY_PNG)
    ok(f"dropped {watcher_book}")

    pending_rows = []
    for _ in range(30):
        time.sleep(1)
        r = author.get("/api/me/pending")
        pending_rows = r.json()
        if pending_rows:
            break
    if not pending_rows:
        fail("watcher did not create a PendingFile after 30s")
    ok(f"watcher created PendingFile (count={len(pending_rows)})")

    # 9. Assemble pending into a new book
    pending_ids = [pf["id"] for pf in pending_rows]
    r = author.post(
        "/api/me/pending/assemble",
        json={"section": "book", "file_ids": pending_ids, "title": None},
    )
    assert r.status_code == 201, f"assemble: {r.status_code} {r.text}"
    new_book = r.json()
    assert new_book["title"].startswith("Livre du"), f"auto-title wrong: {new_book['title']}"
    ok(f"assembled into new Book id={new_book['id']} title='{new_book['title']}'")

    # Pending tray should be empty now
    r = author.get("/api/me/pending")
    if r.json():
        fail(f"pending tray should be empty, got: {r.json()}")
    ok("pending tray cleared")

    # New book should have 1 page with pending flags set
    r = author.get(f"/api/me/works/{new_book['id']}")
    detail = r.json()
    assert len(detail["pages"]) == len(pending_ids)
    if not all(p["enhance_pending"] for p in detail["pages"]):
        fail("assembled book pages should all have enhance_pending=True")
    ok("assembled book pages have enhance_pending=True (auto-AI scheduled)")

    # 10. Move page from book → drawing? No — must be same section.
    # Create a second book, then move page across.
    r = author.post("/api/me/works", json={"section": "book", "title": "Phase 7 dst book"})
    dst_book_id = r.json()["id"]
    src_page_id = detail["pages"][0]["id"]
    r = author.post(
        f"/api/me/works/{new_book['id']}/pages/{src_page_id}/move-to/{dst_book_id}",
    )
    assert r.status_code == 200, f"move: {r.status_code} {r.text}"
    ok(f"moved page {src_page_id} from book {new_book['id']} -> {dst_book_id}")
    # Confirm dst has the page now
    r = author.get(f"/api/me/works/{dst_book_id}")
    if not any(p["id"] == src_page_id for p in r.json()["pages"]):
        fail("destination book does not show the moved page")
    ok("dst book has the moved page")

    # 11. Split: upload 2 more pages on dst, then split at page 2
    for _ in range(2):
        author.post(
            f"/api/me/works/{dst_book_id}/pages",
            files=[("files", (f"p.png", io.BytesIO(TINY_PNG), "image/png"))],
        )
    r = author.get(f"/api/me/works/{dst_book_id}")
    pages_sorted = sorted(r.json()["pages"], key=lambda p: p["idx"])
    assert len(pages_sorted) == 3, f"expected 3 pages on dst, got {len(pages_sorted)}"
    target = pages_sorted[1]
    r = author.post(
        f"/api/me/works/{dst_book_id}/pages/{target['id']}/split",
        json={"title": "Suite test"},
    )
    assert r.status_code == 201, f"split: {r.status_code} {r.text}"
    suite = r.json()
    assert suite["title"] == "Suite test"
    ok(f"split into new work '{suite['title']}' id={suite['id']}")
    # Source should have 1 page now; new should have 2
    r = author.get(f"/api/me/works/{dst_book_id}")
    if len(r.json()["pages"]) != 1:
        fail(f"split: source should have 1 page, got {len(r.json()['pages'])}")
    r = author.get(f"/api/me/works/{suite['id']}")
    if len(r.json()["pages"]) != 2:
        fail(f"split: new work should have 2 pages, got {len(r.json()['pages'])}")
    ok("split left 1 page on src, 2 on new work")

    # Cleanup
    admin.delete(f"/api/admin/authors/{r.json()['author_id']}")
    print("\n== all Phase-7 smoke checks passed ==")


if __name__ == "__main__":
    main()
