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


def enhanced_cover_path(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "cover_enhanced.png"


def restyled_cover_path(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "cover_restyled.png"


def pages_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "pages"


def page_path(author_username: str, work_slug: str, idx: int, ext: str = "jpg") -> Path:
    return pages_dir(author_username, work_slug) / f"p{idx:03d}.{ext}"


def digital_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "digital"


def digital_page_path(author_username: str, work_slug: str, idx: int) -> Path:
    return digital_dir(author_username, work_slug) / f"p{idx:03d}.html"


def enhanced_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "enhanced"


def enhanced_page_path(author_username: str, work_slug: str, idx: int) -> Path:
    return enhanced_dir(author_username, work_slug) / f"p{idx:03d}.png"


def restyled_dir(author_username: str, work_slug: str) -> Path:
    return work_dir(author_username, work_slug) / "restyled"


def restyled_page_path(author_username: str, work_slug: str, idx: int) -> Path:
    return restyled_dir(author_username, work_slug) / f"p{idx:03d}.png"


def url_to_disk(url: str, storage_root: Path) -> Path:
    """Convert a /uploads/<rel> URL back to its absolute storage path."""
    if not url.startswith("/uploads/"):
        raise ValueError(f"Not an uploads URL: {url}")
    return storage_root / url[len("/uploads/") :]


def ensure_dir(p: Path) -> Path:
    p.mkdir(parents=True, exist_ok=True)
    return p


def pending_dir(author_username: str) -> Path:
    return author_dir(author_username) / "pending"


def inbox_root() -> Path:
    from src.config.settings import settings
    return settings.INBOX_ROOT


def inbox_author_section_dir(author_username: str, section: str) -> Path:
    return inbox_root() / author_username / section


def inbox_errors_dir() -> Path:
    return inbox_root() / "_errors"
