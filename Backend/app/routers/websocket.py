import logging

from fastapi import APIRouter, WebSocket

from app.services.ws_session_manager import session_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await session_manager.connect(websocket)
    try:
        while True:
            await websocket.receive()
    except Exception as exc:
        logger.info("WS connection closed: %s", exc)
    finally:
        session_manager.disconnect(websocket)