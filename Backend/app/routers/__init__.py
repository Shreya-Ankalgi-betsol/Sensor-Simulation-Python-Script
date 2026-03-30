from app.routers.sensor import router as sensor_router
from app.routers.threat import router as threat_router
from app.routers.analytics import router as analytics_router
from app.routers.websocket import router as websocket_router
from app.routers.user import router as user_router
from app.routers.ingest import router as ingest_router

__all__ = [
    "sensor_router",
    "threat_router",
    "analytics_router",
    "websocket_router",
    "user_router",
    "ingest_router",
]
