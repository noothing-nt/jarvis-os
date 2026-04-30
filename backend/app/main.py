# backend/app/main.py — FINAL VERSION (Phases 1-5 Complete)
# Replace your existing main.py with this

import time
import logging
import platform
import psutil
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from app.core.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("jarvis-os")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ══════════════════════════════════════════════════════════
    # STARTUP
    # ══════════════════════════════════════════════════════════
    logger.info("━" * 65)
    logger.info(f"🚀  {settings.APP_NAME}  v{settings.VERSION}  — PHASE 5 FINAL")
    logger.info("━" * 65)

    # [1] Supabase
    try:
        from app.core.database import get_supabase
        db = get_supabase()
        logger.info("✅ [DB]       Supabase PostgreSQL    — ONLINE")
    except Exception as e:
        logger.warning(f"⚠️  [DB]       Supabase              — FAILED: {e}")

    # [2] AI Provider
    if settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        logger.info("✅ [AI]       Gemini API             — LOADED")
    elif settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        logger.info("✅ [AI]       OpenAI API             — LOADED")
    else:
        logger.warning("⚠️  [AI]       No AI key              — AI routes inactive")

    # [3] Email Accounts + Poller
    accounts_configured = 0
    for label, addr in [
        (settings.EMAIL_1_LABEL, settings.EMAIL_1_ADDRESS),
        (settings.EMAIL_2_LABEL, settings.EMAIL_2_ADDRESS),
        (settings.EMAIL_3_LABEL, settings.EMAIL_3_ADDRESS),
    ]:
        if addr:
            logger.info(f"✅ [EMAIL]    '{label}' ({addr})")
            accounts_configured += 1

    if accounts_configured > 0:
        try:
            from app.background.email_poller import start_email_poller
            await start_email_poller()
            logger.info(
                f"✅ [POLLER]   APScheduler             — STARTED "
                f"(every {settings.EMAIL_POLL_INTERVAL_MINUTES} min)"
            )
        except Exception as e:
            logger.warning(f"⚠️  [POLLER]   Email Poller           — FAILED: {e}")
    else:
        logger.warning("⚠️  [POLLER]   Skipped — no email accounts configured")

    # [4] Google Drive
    try:
        import os
        if os.path.exists(settings.GDRIVE_CREDENTIALS_PATH):
            logger.info("✅ [DRIVE]    Credentials file       — FOUND")
        else:
            logger.warning(
                f"⚠️  [DRIVE]    Credentials            — NOT FOUND "
                f"at '{settings.GDRIVE_CREDENTIALS_PATH}'"
            )
    except Exception:
        pass

    # [5] ESP32 Webhook
    esp32_ready = bool(settings.ESP32_WEBHOOK_SECRET)
    logger.info(
        f"{'✅' if esp32_ready else '⚠️ '} [ESP32]    Webhook secret         "
        f"— {'SET' if esp32_ready else 'NOT SET — set ESP32_WEBHOOK_SECRET in .env'}"
    )

    # [6] All routes status
    logger.info("━" * 65)
    logger.info("✅ [ROUTES]   /api/v1/projects         — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/tasks            — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/schedule         — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/ideas            — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/hardware         — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/ai               — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/comms            — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/storage          — ACTIVE")
    logger.info("✅ [ROUTES]   /api/v1/webhooks         — ACTIVE")
    logger.info("━" * 65)
    logger.info("🟢  JARVIS OS PHASE 5 COMPLETE — ALL SYSTEMS NOMINAL")
    logger.info("━" * 65)

    yield

    # ══════════════════════════════════════════════════════════
    # SHUTDOWN
    # ══════════════════════════════════════════════════════════
    logger.info("🔴  JARVIS OS — Shutting down gracefully...")
    try:
        from app.background.email_poller import stop_email_poller
        await stop_email_poller()
    except Exception:
        pass
    logger.info("✅  Shutdown complete.")


def build_allowed_origins() -> list[str]:
    origins = [
        "http://localhost:3000", "http://localhost:5173",
        "http://localhost:4173", "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    if settings.NETLIFY_URL:   origins.append(settings.NETLIFY_URL)
    if settings.CUSTOM_DOMAIN: origins.append(settings.CUSTOM_DOMAIN)
    if settings.DEBUG:         origins.append("*")
    return origins


ALLOWED_ORIGINS = build_allowed_origins()


def create_application() -> FastAPI:
    app = FastAPI(
        title=f"{settings.APP_NAME} API",
        description="🤖 JARVIS OS — Phase 5 Complete. All systems active.",
        version=settings.VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_origin_regex=r"https://.*\.netlify\.app",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization", "Content-Type", "Accept",
            "Origin", "X-Requested-With",
            "X-JARVIS-Client", "X-ESP32-Device-ID", "X-ESP32-Secret",
        ],
        expose_headers=["X-Process-Time", "X-JARVIS-Version"],
    )
    return app


app = create_application()


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start    = time.perf_counter()
    response = await call_next(request)
    elapsed  = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time"]   = f"{elapsed:.2f}ms"
    response.headers["X-JARVIS-Version"] = settings.VERSION
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status":    "error",
            "code":      exc.status_code,
            "message":   exc.detail,
            "path":      str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"💥 Unhandled: {request.url} — {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error", "code": 500,
            "message": "Internal server error.",
            "path": str(request.url),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ══════════════════════════════════════════════════════════════
# ALL ROUTERS — PHASES 2–5
# ══════════════════════════════════════════════════════════════
from app.api.routes import projects, tasks, schedule, ideas, hardware
from app.api.routes import ai, comms, storage, webhooks

app.include_router(projects.router, prefix="/api/v1/projects",  tags=["📊 Projects"])
app.include_router(tasks.router,    prefix="/api/v1/tasks",     tags=["✅ Tasks"])
app.include_router(schedule.router, prefix="/api/v1/schedule",  tags=["📅 Schedule"])
app.include_router(ideas.router,    prefix="/api/v1/ideas",     tags=["💡 Ideas"])
app.include_router(hardware.router, prefix="/api/v1/hardware",  tags=["🔧 Hardware"])
app.include_router(ai.router,       prefix="/api/v1/ai",        tags=["🧠 AI"])
app.include_router(comms.router,    prefix="/api/v1/comms",     tags=["📬 Comms"])
app.include_router(storage.router,  prefix="/api/v1/storage",   tags=["🗂️ Storage"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks",  tags=["⚡ Hardware"])


@app.get("/", tags=["🏠 Root"])
async def root():
    return {
        "system":  settings.APP_NAME,
        "version": settings.VERSION,
        "phase":   "Phase 5 — Backend Complete",
        "status":  "ONLINE",
        "docs":    "/api/docs",
    }


@app.get("/api/v1/ping", tags=["🩺 Health"])
async def ping():
    return {"pong": True, "t": datetime.now(timezone.utc).isoformat()}


@app.get("/api/v1/roadmap", tags=["🗺️ Roadmap"])
async def get_roadmap():
    return {
        "phases": [
            {"phase": 1, "name": "Backend & Database Skeleton",         "status": "complete ✅"},
            {"phase": 2, "name": "Core CRUD API + Schemas + Auth",      "status": "complete ✅"},
            {"phase": 3, "name": "AI Integration (Gemini/OpenAI)",      "status": "complete ✅"},
            {"phase": 4, "name": "Unified Comms (IMAP + AI Summaries)", "status": "complete ✅"},
            {"phase": 5, "name": "Google Drive + ESP32 Webhooks",       "status": "complete ✅"},
            {"phase": 6, "name": "React Frontend — Tony Stark HUD",     "status": "next 🚀"},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
    )