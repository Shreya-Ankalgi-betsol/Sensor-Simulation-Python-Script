import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    #  Connection lifecycle 

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "WS client connected. Total connections: %d",
            len(self.active_connections),
        )
        await self.send_to_client(
            websocket,
            event="auth_confirmed",
            data={"message": "Connected to Sensor Simulation", "status": "live"},
        )

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "WS client disconnected. Remaining: %d",
            len(self.active_connections),
        )

    #  Listening loop 

    # async def listen(self, websocket: WebSocket) -> None:
    #     try:
    #         while True:
    #             raw = await websocket.receive_text()
    #             try:
    #                 msg = json.loads(raw)
    #             except json.JSONDecodeError:
    #                 logger.warning("WS received non-JSON message: %s", raw[:200])
    #                 continue

    #             event = msg.get("event", "")
    #             logger.debug("WS unhandled client event: %s", event)

    #     except Exception as exc:
    #         logger.info("WS connection closed: %s", exc)
    #     finally:
    #         self.disconnect(websocket)

    # Send to single client 

    async def send_to_client(
        self, websocket: WebSocket, event: str, data: Any) -> None:
        payload = json.dumps({"event": event, "data": data})
        try:
            await websocket.send_text(payload)
        except Exception as exc:
            logger.warning("Failed to send to client: %s", exc)
            self.disconnect(websocket)

    # Broadcast to all clients 

    async def broadcast(self, event: str, data: Any) -> None:
        if not self.active_connections:
            return

        payload = json.dumps({"event": event, "data": data}, default=str)
        dead: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as exc:
                logger.warning("Broadcast failed for a client (%s) — removing.", exc)
                dead.append(connection)

        for ws in dead:
            self.disconnect(ws)


session_manager = SessionManager()