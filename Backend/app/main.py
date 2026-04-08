import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_tables
from app.db.session import AsyncSessionLocal
from app.services.tcp_ingest_server import tcp_ingest_server
from app.services.ingestion_service import ingestion_service
from app.routers import (
    analytics_router,
    ingest_router,
    sensor_router,
    threat_router,
    user_router,
    websocket_router,
)

# Logging 

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


async def _stale_sensor_watcher_loop(interval_seconds: int = 2) -> None:
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await ingestion_service.mark_stale_sensors_inactive(session)
                await session.commit()
        except Exception as exc:
            logger.warning("Failed stale-sensor watcher iteration: %s", exc)

        await asyncio.sleep(interval_seconds)


#  Lifespan 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting %s ...", settings.app_name)
    await create_tables()
    logger.info("Database tables ready.")
    stale_watcher_task = asyncio.create_task(_stale_sensor_watcher_loop())
    if settings.tcp_ingest_enabled:
        try:
            await tcp_ingest_server.start()
        except OSError as exc:
            logger.warning("TCP ingest server could not start: %s", exc)
    yield
    # Shutdown
    stale_watcher_task.cancel()
    try:
        await stale_watcher_task
    except asyncio.CancelledError:
        pass

    if settings.tcp_ingest_enabled and tcp_ingest_server.is_running:
        await tcp_ingest_server.stop()
    logger.info("Shutting down %s.", settings.app_name)


#  App factory 

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Real-time sensor surveillance API. "
        "REST endpoints for sensors, threats, analytics and users. "
        "WebSocket endpoint for live event streaming."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


#  CORS 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers 

app.include_router(sensor_router)
app.include_router(ingest_router)
app.include_router(threat_router)
app.include_router(analytics_router)
app.include_router(websocket_router)
app.include_router(user_router)


# Health check 

@app.get(
    "/api/health",
    tags=["Health"],
    summary="Health check",
    description="Returns the current status of the API.",
)
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "1.0.0",
    }