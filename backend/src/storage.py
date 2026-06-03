from pathlib import Path

from src.config.settings import settings


def author_dir(author_username: str) -> Path:
    return settings.STORAGE_ROOT / author_username


def avatar_path(author_username: str, ext: str = "jpg") -> Path:
    return author_dir(author_username) / f"avatar.{ext}"


def work_dir(author_username: str, work_slug: str) -> Path:
    return author_dir(author_username) / "works" / work_slug


def cover_path(author_username: str, work_slug: str, ext: str = "jpg") -> Path:
    return work_dir(author_username, work_slug) / f"cover.{ext}"


def pages_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "pages"


def page_path(author_username: str, work_slug: str, idx: int, ext: str = "jpg") -> Path:
    return pages_dir(author_username, work_slug) / f"p{idx:03d}.{ext}"


def digital_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "digital"


def digital_page_path(author_username: str, work_slug: str, idx: int) -> Path:
    return digital_dir(author_username, work_slug) / f"p{idx:03d}.html"


def ensure_dir(p: Path) -> Path:
    p.mkdir(parents=True, exist_ok=True)
    return p
