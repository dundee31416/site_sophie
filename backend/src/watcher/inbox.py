"""File watcher for the scanner-fed inbox.

Layout under INBOX_ROOT:

    <author-username>/<section>/<filename>          ← what the printer drops

`<section>` is one of `book`, `comic`, `drawing`, `craft`. Anything else is an error.

For each new file:
- drawings / crafts → immediately create a single-page Work and move the file
  to the storage volume.
- books / comics → move to `<storage>/<author>/pending/` and create a
  PendingFile row. The author assembles works from the UI later.

Unparseable files (wrong author, wrong section, unknown user) are moved to
`<INBOX_ROOT>/_errors/` for manual cleanup.
"""
from __future__ import annotations

import logging
import shutil
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import (
    Page,
    PendingFile,
    PendingSection,
    User,
    Work,
    WorkSection,
)
from src.storage import (
    ensure_dir,
    inbox_errors_dir,
    page_path,
    pending_dir,
)
from src.util import IMAGE_EXTS, slugify, storage_url

logger = logging.getLogger(__name__)

# A file is considered "stable" (done being written) when its mtime + size
# don't change for this many seconds.
STABILITY_SECONDS = 2
# After detecting a file, wait this long before processing.
DEBOUNCE_SECONDS = 1

# OS-generated noise files dropped by Windows/Mac/Linux file browsers when
# the host shares the inbox over SMB/NFS. Silently ignored: no error log,
# not moved to _errors. We delete them so they don't keep re-firing events.
_NOISE_FILENAMES = {
    "Thumbs.db",
    "thumbs.db",
    "desktop.ini",
    ".DS_Store",
    "ehthumbs.db",
    "ehthumbs_vista.db",
}


class InboxHandler(FileSystemEventHandler):
    def __init__(self) -> None:
        super().__init__()
        # Avoid double-processing the same file from rapid-fire events.
        self._inflight: set[str] = set()
        self._inflight_lock = threading.Lock()

    def on_created(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        self._enqueue(Path(event.src_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        self._enqueue(Path(event.src_path))

    def _enqueue(self, path: Path) -> None:
        key = str(path)
        with self._inflight_lock:
            if key in self._inflight:
                return
            self._inflight.add(key)
        threading.Thread(target=self._process_when_stable, args=(path,), daemon=True).start()

    def _process_when_stable(self, path: Path) -> None:
        try:
            self._wait_stable(path)
            process_inbox_file(path)
        except Exception:
            logger.exception("inbox watcher: failed to process %s", path)
            _move_to_errors(path)
        finally:
            with self._inflight_lock:
                self._inflight.discard(str(path))

    @staticmethod
    def _wait_stable(path: Path) -> None:
        time.sleep(DEBOUNCE_SECONDS)
        last = None
        for _ in range(60):  # cap at ~2 min
            if not path.exists():
                raise FileNotFoundError(path)
            stat = path.stat()
            sig = (stat.st_size, int(stat.st_mtime))
            if sig == last:
                return
            last = sig
            time.sleep(STABILITY_SECONDS)
        # Still changing after ~2 min: don't ingest a half-written file.
        raise TimeoutError(f"{path} never stabilized")


def _move_to_errors(path: Path) -> None:
    if not path.exists():
        return
    target = ensure_dir(inbox_errors_dir()) / f"{int(time.time())}_{path.name}"
    try:
        shutil.move(str(path), str(target))
        logger.warning("inbox: moved unprocessable %s -> %s", path, target)
    except Exception:
        logger.exception("inbox: failed to move %s to errors", path)


def process_inbox_file(path: Path) -> None:
    """Ingest one file at <INBOX_ROOT>/<author>/<section>/<filename>."""
    # Silently drop OS-generated noise (Windows thumbnail cache, Mac DS_Store, ...).
    if path.name in _NOISE_FILENAMES or path.name.startswith("."):
        try:
            path.unlink(missing_ok=True)
        except Exception:
            logger.exception("inbox: failed to delete noise file %s", path)
        return

    try:
        rel = path.relative_to(settings.INBOX_ROOT)
    except ValueError:
        logger.warning("inbox: %s is outside INBOX_ROOT, skipping", path)
        return
    parts = rel.parts
    if len(parts) < 3:
        # not <author>/<section>/<file>
        _move_to_errors(path)
        return

    author_username, section_str = parts[0], parts[1]
    if author_username.startswith("_"):  # _errors and similar
        return

    ext = path.suffix.lstrip(".").lower()
    if ext == "jpeg":
        ext = "jpg"
    if ext not in IMAGE_EXTS:
        logger.warning("inbox: %s has unsupported extension", path)
        _move_to_errors(path)
        return

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == author_username))
        if user is None:
            logger.warning("inbox: unknown author %s for %s", author_username, path)
            _move_to_errors(path)
            return

        if section_str == "drawing":
            _ingest_single_image(db, user, WorkSection.drawing, f"Dessin du {_date_fr()}", path, ext)
        elif section_str == "craft":
            _ingest_single_image(db, user, WorkSection.craft, f"Bricolage du {_date_fr()}", path, ext)
        elif section_str in ("book", "comic"):
            _ingest_pending(db, user, PendingSection(section_str), path, ext)
        else:
            logger.warning("inbox: unknown section %s for %s", section_str, path)
            _move_to_errors(path)


def _date_fr() -> str:
    months = {
        1: "janvier", 2: "février", 3: "mars", 4: "avril", 5: "mai", 6: "juin",
        7: "juillet", 8: "août", 9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
    }
    now = datetime.now()
    return f"{now.day} {months[now.month]} {now.year}"


def _unique_slug(base: str, author_id: int, db) -> str:
    slug = base
    suffix = 1
    while db.scalar(select(Work.id).where(Work.author_id == author_id, Work.slug == slug)) is not None:
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


def _ingest_single_image(
    db, user: User, section: WorkSection, title: str, src: Path, ext: str,
) -> None:
    """Create a single-page Work (drawing or craft) directly from one image."""
    # Race between SELECT (in _unique_slug) and INSERT can let two concurrent
    # ingests pick the same slug. Retry a handful of times against the unique
    # constraint before giving up.
    base = slugify(title)
    work: Work | None = None
    last_exc: Exception | None = None
    for attempt in range(5):
        slug = _unique_slug(base, user.id, db)
        work = Work(
            author_id=user.id,
            section=section,
            slug=slug,
            title=title,
        )
        db.add(work)
        try:
            db.flush()
            break
        except IntegrityError as e:
            last_exc = e
            db.rollback()
            work = None
            time.sleep(0.05 * (attempt + 1))
    if work is None:
        logger.error(
            "inbox: failed to create %s work for %s after 5 retries: %s",
            section.value, src, last_exc,
        )
        _move_to_errors(src)
        return

    dst = page_path(user.username, slug, 1, ext)
    ensure_dir(dst.parent)
    shutil.move(str(src), str(dst))

    page = Page(
        work_id=work.id,
        idx=1,
        scan_path=storage_url(dst, settings.STORAGE_ROOT),
    )
    db.add(page)
    db.commit()
    logger.info(
        "inbox: ingested %s %s as work=%s page=%s", section.value, src.name, work.id, page.id,
    )


def _ingest_pending(
    db, user: User, section: PendingSection, src: Path, ext: str,
) -> None:
    ensure_dir(pending_dir(user.username))
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    dst = pending_dir(user.username) / f"{timestamp}_{src.name}"
    shutil.move(str(src), str(dst))

    pending = PendingFile(
        author_id=user.id,
        section=section,
        disk_path=str(dst),
        original_filename=src.name,
        thumbnail_url=storage_url(dst, settings.STORAGE_ROOT),
    )
    db.add(pending)
    db.commit()
    logger.info(
        "inbox: queued pending %s for author=%s section=%s pending_id=%s",
        src.name, user.username, section.value, pending.id,
    )


# ----------------------------- public API -----------------------------

_observer: Observer | None = None


def start_watcher() -> None:
    """Start the watchdog Observer and do a one-time scan to pick up files
    that arrived while the watcher was down."""
    global _observer
    if _observer is not None:
        return
    root = settings.INBOX_ROOT
    ensure_dir(root)
    ensure_dir(inbox_errors_dir())

    # Crash recovery: process anything already sitting in the inbox.
    handler = InboxHandler()
    for f in root.rglob("*"):
        if f.is_file() and not _under_errors(f):
            handler._enqueue(f)

    obs = Observer()
    obs.schedule(handler, str(root), recursive=True)
    obs.daemon = True
    obs.start()
    _observer = obs
    logger.info("inbox watcher started on %s", root)


def stop_watcher() -> None:
    global _observer
    if _observer is None:
        return
    _observer.stop()
    _observer.join(timeout=5)
    _observer = None


def _under_errors(path: Path) -> bool:
    try:
        path.relative_to(inbox_errors_dir())
        return True
    except ValueError:
        return False
