"""On-the-fly thumbnail generation for /uploads images.

GET /api/thumb/{path}?w=400&v=...  where `path` is the storage-relative
path (whatever follows /uploads/ in an image URL). Thumbnails are
generated with Pillow on first request and cached on disk under
STORAGE_ROOT/.thumbs/w{w}/, then served with immutable cache headers.
The ?v= query param is ignored server-side; it exists so CDN/browser
cache entries roll over when the source image is regenerated.

List views (home page gallery, page thumbnails, pending tray) use these
instead of the raw 5-15 MB scanner files.
"""
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from PIL import Image

from src.config.settings import settings
from src.util import IMAGE_EXTS

router = APIRouter(prefix="/api/thumb", tags=["thumbs"])

# Fixed set of widths so a URL typo can't fill the disk with variants.
_ALLOWED_WIDTHS = (200, 400, 800)
_CACHE_HEADERS = {"Cache-Control": "public, max-age=31536000, immutable"}


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")


def _resolve_source(rel_path: str) -> tuple[Path, Path]:
    """Return (absolute source path, storage-relative path), refusing
    anything that escapes STORAGE_ROOT or isn't a known image type."""
    root = settings.STORAGE_ROOT.resolve()
    src = (root / rel_path).resolve()
    try:
        rel = src.relative_to(root)
    except ValueError:
        raise _not_found()
    if rel.parts and rel.parts[0] == ".thumbs":
        raise _not_found()
    if src.suffix.lstrip(".").lower() not in IMAGE_EXTS or not src.is_file():
        raise _not_found()
    return src, rel


@router.get("/{rel_path:path}")
def get_thumb(
    rel_path: str,
    w: int = Query(default=400),
) -> FileResponse:
    if w not in _ALLOWED_WIDTHS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"w must be one of {_ALLOWED_WIDTHS}",
        )
    src, rel = _resolve_source(rel_path)

    thumb = (settings.STORAGE_ROOT / ".thumbs" / f"w{w}" / rel).with_suffix(".webp")
    if not thumb.exists() or thumb.stat().st_mtime < src.stat().st_mtime:
        try:
            with Image.open(src) as im:
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGB")
                im.thumbnail((w, w * 4))
                thumb.parent.mkdir(parents=True, exist_ok=True)
                # Write to a temp file and rename so concurrent requests
                # never see a half-written thumbnail.
                fd, tmp = tempfile.mkstemp(dir=thumb.parent, suffix=".webp.tmp")
                os.close(fd)
                im.save(tmp, "WEBP", quality=80)
                os.replace(tmp, thumb)
        except OSError:
            raise _not_found()

    return FileResponse(thumb, media_type="image/webp", headers=_CACHE_HEADERS)
