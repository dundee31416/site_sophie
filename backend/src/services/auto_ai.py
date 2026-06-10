"""Background-task wrappers around the synchronous AI calls.

Each function opens its own DB session because FastAPI's request-scoped
session is closed by the time a BackgroundTask runs. They are designed to be
safe to call after the response has been returned, and to be retryable —
on success they fill in the result column and clear the *_pending flag; on
failure they clear the flag without setting the result and log the error.
"""
from __future__ import annotations

import logging
from pathlib import Path

from src.ai.enhance import enhance_image
from src.ai.restyle import restyle_image
from src.ai.transcribe import transcribe_image
from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import Page, Work
from src.storage import (
    enhanced_cover_path,
    enhanced_page_path,
    restyled_cover_path,
    restyled_page_path,
    url_to_disk,
)
from src.util import storage_url

logger = logging.getLogger(__name__)


def _scan_disk(page: Page) -> Path:
    if page.scan_path is None:
        raise ValueError(f"Page {page.id} has no scan_path")
    return url_to_disk(page.scan_path, settings.STORAGE_ROOT)


def _cover_src_disk(work: Work) -> Path:
    if work.cover_path is None:
        raise ValueError(f"Work {work.id} has no cover_path")
    return url_to_disk(work.cover_path, settings.STORAGE_ROOT)


# ---------- covers ----------

def run_cover_enhance(work_id: int) -> None:
    with SessionLocal() as db:
        work = db.get(Work, work_id)
        if work is None or work.cover_path is None:
            logger.warning("run_cover_enhance: work=%s missing or no cover", work_id)
            return
        try:
            dst = enhanced_cover_path(work.author.username, work.slug)
            enhance_image(_cover_src_disk(work), dst)
            work.enhanced_cover_path = storage_url(dst, settings.STORAGE_ROOT)
        except Exception:
            logger.exception("run_cover_enhance failed for work=%s", work_id)
        finally:
            work.cover_enhance_pending = False
            db.commit()


def run_cover_restyle(work_id: int, extra_instructions: str | None = None) -> None:
    with SessionLocal() as db:
        work = db.get(Work, work_id)
        if work is None or work.cover_path is None:
            logger.warning("run_cover_restyle: work=%s missing or no cover", work_id)
            return
        try:
            dst = restyled_cover_path(work.author.username, work.slug)
            restyle_image(_cover_src_disk(work), dst, extra_instructions)
            work.restyled_cover_path = storage_url(dst, settings.STORAGE_ROOT)
        except Exception:
            logger.exception("run_cover_restyle failed for work=%s", work_id)
        finally:
            work.cover_restyle_pending = False
            db.commit()


# ---------- pages ----------

def run_page_enhance(page_id: int) -> None:
    with SessionLocal() as db:
        page = db.get(Page, page_id)
        if page is None or page.scan_path is None:
            logger.warning("run_page_enhance: page=%s missing or no scan", page_id)
            return
        try:
            dst = enhanced_page_path(page.work.author.username, page.work.slug, page.idx)
            enhance_image(_scan_disk(page), dst)
            page.enhanced_path = storage_url(dst, settings.STORAGE_ROOT)
        except Exception:
            logger.exception("run_page_enhance failed for page=%s", page_id)
        finally:
            page.enhance_pending = False
            db.commit()


def run_page_restyle(page_id: int, extra_instructions: str | None = None) -> None:
    """Optional helper for consistency — pages do not auto-restyle, but the
    PageEditor still calls it manually with extra_instructions."""
    with SessionLocal() as db:
        page = db.get(Page, page_id)
        if page is None or page.scan_path is None:
            return
        try:
            dst = restyled_page_path(page.work.author.username, page.work.slug, page.idx)
            restyle_image(_scan_disk(page), dst, extra_instructions)
            page.restyled_path = storage_url(dst, settings.STORAGE_ROOT)
        except Exception:
            logger.exception("run_page_restyle failed for page=%s", page_id)
        finally:
            db.commit()


def run_page_transcribe(page_id: int) -> None:
    with SessionLocal() as db:
        page = db.get(Page, page_id)
        if page is None or page.scan_path is None:
            logger.warning("run_page_transcribe: page=%s missing or no scan", page_id)
            return
        try:
            text = transcribe_image(_scan_disk(page))
            page.text = text if text != "" else None
        except Exception:
            logger.exception("run_page_transcribe failed for page=%s", page_id)
        finally:
            page.transcribe_pending = False
            db.commit()
