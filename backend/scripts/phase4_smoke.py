"""Phase 4 backend smoke test.

Runs from inside the backend container against localhost:8000. Uses httpx
(already in requirements-dev). Creates a tiny PNG in memory, hits every Phase 4
endpoint, asserts expected results, and prints a one-line summary per step.
"""
from __future__ import annotations

import base64
import sys
from io import BytesIO
from pathlib import Path

import httpx

BASE = "http://localhost:8000"

# Smallest valid 1x1 transparent PNG (67 bytes).
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


def png() -> tuple[str, BytesIO, str]:
    return ("p.png", BytesIO(PNG_BYTES), "image/png")


def check(label: str, ok: bool, detail: str = "") -> None:
    flag = "OK " if ok else "FAIL"
    print(f"  [{flag}] {label}{(': ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main() -> None:
    admin = httpx.Client(base_url=BASE)
    author = httpx.Client(base_url=BASE)

    # 1. Admin login
    r = admin.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    check("admin login", r.status_code == 200, str(r.status_code))

    # 2. Create test author (delete any leftover first)
    existing = admin.get("/api/admin/authors").json()
    for a in existing:
        if a["username"] == "p4-author":
            admin.delete(f"/api/admin/authors/{a['id']}")
    r = admin.post(
        "/api/admin/authors",
        json={"username": "p4-author", "password": "hunter2", "display_name": "P4 Author"},
    )
    check("create author", r.status_code == 201, str(r.status_code))

    # 3. Author login
    r = author.post("/api/auth/login", json={"username": "p4-author", "password": "hunter2"})
    check("author login", r.status_code == 200, str(r.status_code))

    # 4. PATCH profile
    r = author.patch("/api/me", json={"age": 9, "color": "#8c5bd0", "bio": "Phase 4 test"})
    check("PATCH /api/me", r.status_code == 200 and r.json()["age"] == 9)

    # 5. Change password
    r = author.post(
        "/api/me/password",
        json={"current_password": "hunter2", "new_password": "hunter3"},
    )
    check("change password", r.status_code == 204, str(r.status_code))

    # 6. Wrong current password → 400
    r = author.post(
        "/api/me/password",
        json={"current_password": "wrong", "new_password": "hunter4"},
    )
    check("wrong current pwd → 400", r.status_code == 400, str(r.status_code))

    # 7. Re-login with new password
    r = author.post("/api/auth/login", json={"username": "p4-author", "password": "hunter3"})
    check("re-login new pwd", r.status_code == 200, str(r.status_code))

    # 8. Upload avatar
    r = author.post("/api/me/avatar", files={"file": png()})
    check(
        "upload avatar",
        r.status_code == 200 and r.json()["avatar_path"] == "/uploads/p4-author/avatar.png",
        r.json().get("avatar_path", ""),
    )

    # 9. Create work
    r = author.post(
        "/api/me/works",
        json={"section": "book", "title": "Mon Premier Livre", "blurb": "Test", "year": 2026},
    )
    check("create work", r.status_code == 201, str(r.status_code))
    work = r.json()
    wid = work["id"]
    check("slug auto", work["slug"] == "mon-premier-livre", work["slug"])

    # 10. Upload 3 pages
    files = [("files", png()), ("files", png()), ("files", png())]
    r = author.post(f"/api/me/works/{wid}/pages", files=files)
    check("upload 3 pages", r.status_code == 201, str(r.status_code))
    pages = r.json()
    check("3 pages created idx 1..3", [p["idx"] for p in pages] == [1, 2, 3])

    # 11. Upload cover
    r = author.post(f"/api/me/works/{wid}/cover", files={"file": png()})
    check(
        "upload cover",
        r.status_code == 200
        and r.json()["cover_path"] == "/uploads/p4-author/works/mon-premier-livre/cover.png",
        r.json().get("cover_path", ""),
    )

    # 12. GET work with pages
    r = author.get(f"/api/me/works/{wid}")
    detail = r.json()
    check("GET work", r.status_code == 200 and len(detail["pages"]) == 3)

    # 13. Reorder pages (reverse)
    page_ids = [p["id"] for p in sorted(detail["pages"], key=lambda p: -p["idx"])]
    r = author.patch(f"/api/me/works/{wid}/pages/order", json={"page_ids": page_ids})
    reordered = r.json()
    check("reorder reverse", r.status_code == 200 and [p["id"] for p in reordered] == page_ids)
    check("idx now 1..3 in new order", [p["idx"] for p in reordered] == [1, 2, 3])

    # 14. Delete the page now at idx=2
    middle = next(p for p in reordered if p["idx"] == 2)
    r = author.delete(f"/api/me/works/{wid}/pages/{middle['id']}")
    check("delete middle page", r.status_code == 204, str(r.status_code))

    # 15. GET work again, 2 pages remain
    r = author.get(f"/api/me/works/{wid}")
    pages_left = r.json()["pages"]
    check("2 pages left", len(pages_left) == 2)

    # 16. Check files on disk
    storage = Path("/data/storage/p4-author")
    check("avatar file exists", (storage / "avatar.png").exists())
    work_root = storage / "works" / "mon-premier-livre"
    check("cover file exists", (work_root / "cover.png").exists())
    page_files = sorted((work_root / "pages").iterdir())
    check("2 page files remain", len(page_files) == 2, str([p.name for p in page_files]))

    # 17. Update work (rename and set is_new)
    r = author.patch(f"/api/me/works/{wid}", json={"title": "Nouveau Titre", "is_new": True})
    check("PATCH work", r.status_code == 200 and r.json()["is_new"] is True)
    check("PATCH does not re-slug", r.json()["slug"] == "mon-premier-livre")

    # 18. Cross-author isolation: admin can't fetch via /api/me/works (no works of admin's)
    r = admin.get("/api/me/works")
    check("admin /api/me/works empty", r.status_code == 200 and r.json() == [])

    # 19. Admin attempting to GET p4-author's work via /me path is denied (not theirs)
    r = admin.get(f"/api/me/works/{wid}")
    check("admin can't read author's work", r.status_code == 404, str(r.status_code))

    # 20. Delete the work (cascades pages + removes folder)
    r = author.delete(f"/api/me/works/{wid}")
    check("delete work", r.status_code == 204, str(r.status_code))
    check("work folder gone", not work_root.exists())
    check("avatar still there", (storage / "avatar.png").exists())

    # 21. Cleanup test author
    admin.delete(f"/api/admin/authors/{author.cookies.get('lisons_session') and 0 or 0}")  # noop
    # find by listing
    rows = admin.get("/api/admin/authors").json()
    for a in rows:
        if a["username"] == "p4-author":
            r = admin.delete(f"/api/admin/authors/{a['id']}")
            check("cleanup author", r.status_code == 204)

    print("\n  All 21 checks passed.")


if __name__ == "__main__":
    main()
