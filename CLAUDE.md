# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Lisons!** — a website where children ("authors") publish their handwritten/drawn storybooks. A scanner drops images into an inbox; the backend ingests them, optionally runs Google Gemini AI on them (cleanup, re-illustration, French transcription), and serves them to a public reader. FastAPI + SQLAlchemy/Postgres backend, React + Vite + TypeScript frontend, deployed to a self-hosted TrueNAS box via Woodpecker CI → GHCR.

## Commands

Backend (run from `backend/`, needs a Python 3.12 venv with `requirements-dev.txt`):
```bash
ruff check src tests          # lint (CI gates on this)
pytest -q                     # full suite
pytest tests/test_auth.py -q  # single file
pytest tests/test_auth.py::test_login_sets_cookie  # single test
uvicorn src.main:app --reload # run locally (expects Postgres + env vars)
```
Tests need no DB/network: `conftest.py` pins `DATABASE_URL=sqlite://`, empty `GEMINI_API_KEY`, and temp storage dirs **before** importing `src` (settings is a module-level singleton built at import time).

Frontend (run from `frontend/`):
```bash
npm run dev     # Vite dev server on :5173, proxies /api and /uploads
npm run build   # tsc -b && vite build
npm run lint    # eslint (CI gates on this; CI also runs `tsc -b --force`)
```
For `npm run dev` outside docker, set `VITE_API_TARGET=http://localhost:8000` (defaults to `http://backend:8000` for compose).

Full stack: `docker compose up` (dev, hot-reload). Prod compose is `docker-compose.prod.yml` (GHCR images, env-driven).

## Architecture

**Ingestion is filesystem-driven, not upload-driven.** `src/watcher/inbox.py` runs a watchdog `Observer` started in the FastAPI lifespan. Scanner drops files at `INBOX_ROOT/<author-username>/<section>/<file>`. The watcher waits for the file to stabilize (mtime+size unchanged), then:
- `drawing` / `craft` (the `SINGLE_IMAGE_SECTIONS`) → immediately creates a one-page `Work` and moves the file into storage.
- `book` / `comic` → moves to `<storage>/<author>/pending/` and creates a `PendingFile` row; the author assembles works from the UI later (`/me/pending`).
- Anything unparseable → moved to `INBOX_ROOT/_errors/`. OS noise (`Thumbs.db`, `.DS_Store`, dotfiles) is silently deleted.
On startup the watcher re-scans the inbox for crash recovery.

**Storage layout** is computed, not stored as a tree — see `src/storage.py` for the canonical path functions (`page_path`, `enhanced_cover_path`, etc.). Everything lives under `STORAGE_ROOT/<author>/works/<slug>/`. The DB stores `/uploads/...` URLs (via `storage_url`), and `url_to_disk` converts back. `STORAGE_ROOT` is mounted at `/uploads` as static files in `main.py`.

**AI is fire-and-forget background work.** Routers set a `*_pending` flag on the row and queue a FastAPI `BackgroundTask` from `src/services/auto_ai.py`. Each task opens its **own** `SessionLocal` (the request session is closed by the time it runs), writes the result path on success, and **always clears the pending flag** in `finally`. Because tasks die with the process, `main.py` clears all orphaned `*_pending` flags on startup. AI calls go through `src/ai/` (`client.py` wraps the Gemini client and returns HTTP 503 if `GEMINI_API_KEY` is unset; `enhance.py`/`restyle.py`/`transcribe.py` are the three operations). Drawings/crafts auto-enhance; pages restyle only on manual trigger.

**Image variants.** A `Work`/`Page` can have a raw scan plus `enhanced` and `restyled` versions (the `DigitalVariant` enum). `digital_variant` selects which one the reader shows; `cover_variant` does the same for the cover. The public API resolves the right path (e.g. `_first_page_path` in `public.py`).

**Thumbnails** (`src/routers/thumbs.py`): `GET /api/thumb/{rel_path}?w=400` generates a WebP on first request with Pillow, caches it under `STORAGE_ROOT/.thumbs/w{w}/`, and serves it `immutable`. Only widths 200/400/800 are allowed (a typo can't fill the disk). List views use these instead of the 5–15 MB raw scans.

**Cache-busting:** raw `/uploads/` URLs are unsafe to cache because re-enhancing overwrites the same file. `with_version(url, updated_at)` appends `?v=<timestamp>`; `updated_at` on `Page`/`Work` is bumped on every change. Note: Cloudflare in front of prod bypasses cache for `/uploads/*` (see auto-memory).

**Auth:** JWT in an httpOnly cookie (`settings.COOKIE_NAME`). `src/auth/deps.py` exposes `get_current_user`, `require_admin`, `require_author_or_admin`. Roles: `admin`, `author`. `COOKIE_SECURE=true` is the "running in prod" marker — `settings.py` refuses to start with weak `JWT_SECRET`/`ADMIN_PASSWORD` when it's set.

### Router map (all prefixed `/api`)
- `auth` — login/logout (sets cookie)
- `admin` (`/api/admin`, admin-only) — manage authors
- `me` (`/api/me`) — current author's profile/avatar
- `works` (`/api/me/works`), `pages` (`/api/me/works/{id}/pages`), `pending` (`/api/me/pending`) — authoring + AI triggers
- `public` (`/api/public`) — unauthenticated reader feed
- `thumbs` (`/api/thumb`) — on-demand thumbnails

### Frontend
React Router SPA. `src/api/*.ts` wrap `apiFetch` (`client.ts`), which always sends `credentials: "include"` and throws `ApiError`. Auth state in `src/auth/AuthContext.tsx`; `ProtectedRoute` gates `/me/*` (author) and `/admin/*` (admin). Bilingual via `src/i18n/` (`LanguageContext` + `translations.ts`). Public reader is `/lecture/:author/:slug`.

## Migrations

Alembic, autorun on container start via `backend/entrypoint.sh` (`alembic upgrade head` → `python -m src.seed_admin` → start uvicorn). Migrations live in `src/database/migrations/versions/`. After changing a model in `src/models/`, generate a revision and review it before committing. Tests use `Base.metadata.create_all` (not migrations), so a model change that lacks a migration passes tests but breaks deploy.

## Deploy

`.woodpecker.yml`: on push to `main` only — lint+test both sides, build backend/frontend images, push to GHCR tagged `latest` + short SHA, SCP compose file and `docker compose up -d` on the TrueNAS host over SSH. Prod `.env` lives on the host (not in the repo); the deploy aborts if it's missing. See the auto-memory files for host details and backup strategy.

## Note

The `clean-drawing`, `enhance-drawing-ai`, `restyle-drawing-ai`, `extract-drawing`, and `transcribe-page` subagents (in `.claude/agents/`) are author-tooling for preparing scans offline; they operate on loose files in `scans/`, `drawings/`, `enhanced/`, etc. at the repo root and do **not** touch the app DB or `data.jsx`.
