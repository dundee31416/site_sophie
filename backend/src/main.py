from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.config.settings import settings
from src.routers import admin as admin_router
from src.routers import auth as auth_router
from src.routers import me as me_router
from src.routers import pages as pages_router
from src.routers import public as public_router
from src.routers import works as works_router
from src.storage import ensure_dir

app = FastAPI(title="Lisons! API")

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
app.include_router(public_router.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
