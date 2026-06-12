import re
import unicodedata
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}


def with_version(url: str | None, dt: datetime | None) -> str | None:
    """Append a cache-busting ?v= to a /uploads/ URL.

    Storage paths are stable while their content changes (re-enhancing a
    page overwrites the same file), so bare URLs are not safe to cache.
    With the version appended, the CDN/browser can cache them forever.
    """
    if url is None or dt is None or "?" in url:
        return url
    return f"{url}?v={int(dt.timestamp())}"


def slugify(text: str) -> str:
    """Lowercase + strip diacritics + hyphenate. 'À l'école!' -> 'a-l-ecole'."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    lower = ascii_only.lower()
    hyphenated = re.sub(r"[^a-z0-9]+", "-", lower).strip("-")
    return hyphenated or "untitled"


def file_ext(filename: str | None, allowed: set[str]) -> str:
    if filename is None or "." not in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename missing or has no extension",
        )
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "jpeg":
        ext = "jpg"
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}' (allowed: {', '.join(sorted(allowed))})",
        )
    return ext


def save_upload(upload: UploadFile, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as out:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)


def storage_url(path: Path, storage_root: Path) -> str:
    """Convert an absolute storage path to a /uploads/... URL."""
    rel = path.relative_to(storage_root).as_posix()
    return f"/uploads/{rel}"
