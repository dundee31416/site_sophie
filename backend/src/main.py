import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import update

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import Page, Work
from src.routers import admin as admin_router
from src.routers import auth as auth_router
from src.routers import me as me_router
from src.routers import pages as pages_router
from src.routers import pending as pending_router
from src.routers import public as public_router
from src.routers import thumbs as thumbs_router
from src.routers import works as works_router
from src.storage import ensure_dir
from src.watcher.inbox import start_watcher, stop_watcher

logger = logging.getLogger(__name__)


def _clear_stuck_pending_flags() -> None:
    """AI jobs run as in-process background tasks, so they die with the
    server — any *_pending flag still set at startup is an orphan. Clear
    them all so the UI doesn't spin forever."""
    with SessionLocal() as db:
        n1 = db.execute(
            update(Work)
            .where(
                (Work.cover_enhance_pending.is_(True)) | (Work.cover_restyle_pending.is_(True)),
            )
            .values(cover_enhance_pending=False, cover_restyle_pending=False)
        ).rowcount
        n2 = db.execute(
            update(Page)
            .where(
                (Page.enhance_pending.is_(True))
                | (Page.transcribe_pending.is_(True))
                | (Page.restyle_pending.is_(True)),
            )
            .values(enhance_pending=False, transcribe_pending=False, restyle_pending=False)
        ).rowcount
        db.commit()
        if n1 or n2:
            logger.info("startup: cleared %d stuck work flags, %d stuck page flags", n1, n2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _clear_stuck_pending_flags()
    try:
        start_watcher()
    except Exception:
        logger.exception("failed to start inbox watcher")
    yield
    stop_watcher()


app = FastAPI(title="Lisons! API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_dir(settings.STORAGE_ROOT)
app.mount("/uploads", StaticFiles(directory=settings.STORAGE_ROOT), name="uploads")

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(me_router.router)
app.include_router(works_router.router)
app.include_router(pages_router.router)
app.include_router(pending_router.router)
app.include_router(public_router.router)
app.include_router(thumbs_router.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
