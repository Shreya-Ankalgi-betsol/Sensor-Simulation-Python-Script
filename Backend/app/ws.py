from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json
import logging
from datetime import datetime

#  Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ws")


# Connection manager 
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("Client connected | total=%d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("Client disconnected | total=%d", len(self.active_connections))

    async def send_text(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)


manager = ConnectionManager()


#  Per-client sensor stream
async def _per_client_stream(websocket: WebSocket):
    """Send periodic server data."""
    try:
        while True:
            payload = {
                "type": "sensor_update",
                "source": "server",
                "ts": datetime.utcnow().isoformat() + "Z",
                "data": {"random": __import__("random").random()},
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1)
    except Exception:
        pass  # socket closed → exit silently


#  Main WebSocket endpoint 
async def sensors_ws(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_text(json.dumps({"type": "welcome", "source": "server"}))
    stream_task = asyncio.create_task(_per_client_stream(websocket))

    try:
       
        while True:
            msg = await websocket.receive()

            # Client disconnected 
            if msg["type"] == "websocket.disconnect":
                break

            if msg.get("text") is not None:
                logger.info("[Client→Server TEXT] %s", msg["text"])

            elif msg.get("bytes") is not None:
                logger.info("[Client→Server BYTES] %d bytes", len(msg["bytes"]))

    except WebSocketDisconnect:
        pass  # abrupt disconnect (e.g. browser killed)
    finally:
        stream_task.cancel()
        manager.disconnect(websocket)