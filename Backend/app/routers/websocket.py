import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketDisconnect
from app.services.ws_session_manager import session_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])



import asyncio

@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await session_manager.connect(websocket)

    async def send_heartbeat():
        try:
            while True:
                await asyncio.sleep(30)  # Ping interval in seconds
                await websocket.send_text("ping")
        except Exception:
            # If sending fails, the main loop will handle disconnect
            pass

    ping_task = asyncio.create_task(send_heartbeat())

    try:
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected cleanly.")
    except Exception as exc:
        logger.info("WS connection closed: %s", exc)
    finally:
        ping_task.cancel()
        await asyncio.gather(ping_task, return_exceptions=True)
        session_manager.disconnect(websocket)