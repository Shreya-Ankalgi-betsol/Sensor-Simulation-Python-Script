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
        # logger.info(  # COMMENTED OUT for debugging sensor updates
        #     "WS client connected. Total connections: %d",
        #     len(self.active_connections),
        # )
        # Send connection confirmation in frontend format
        payload = json.dumps({"type": "CONNECTION_CONFIRMED", "payload": {"message": "Connected to threat detection system", "status": "live"}})
        try:
            await websocket.send_text(payload)
            # logger.debug("Connection confirmation sent to client")  # COMMENTED OUT for debugging sensor updates
        except Exception as exc:
            logger.warning("Failed to send connection confirmation: %s", exc)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # logger.info(  # COMMENTED OUT for debugging sensor updates
        #     "WS client disconnected. Remaining: %d",
        #     len(self.active_connections),
        # )

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

    # Broadcast threat in frontend format (type/payload)

    async def broadcast_threat(self, threat_data: Any) -> None:
        """Broadcast threat detection event to all connected clients in frontend format."""
        if not self.active_connections:
            # logger.debug("No active connections to broadcast threat to")  # COMMENTED OUT for debugging sensor updates
            return

        # Format: {type, payload} - expected by frontend WebSocket listener
        payload = json.dumps({"type": "NEW_THREAT", "payload": threat_data}, default=str)
        dead: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
                # logger.debug("Threat broadcast sent to client")  # COMMENTED OUT for debugging sensor updates
            except Exception as exc:
                logger.warning("Threat broadcast failed for a client (%s) — removing.", exc)
                dead.append(connection)

        for ws in dead:
            self.disconnect(ws)

    async def broadcast_summary_update(self, summary_data: Any) -> None:
        """Broadcast updated threat summary to all connected clients."""
        if not self.active_connections:
            return

        # Format: {type, payload} - consistent with NEW_THREAT format
        payload = json.dumps({"type": "THREAT_SUMMARY_UPDATE", "payload": summary_data}, default=str)
        dead: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as exc:
                logger.warning("Summary broadcast failed for a client (%s) — removing.", exc)
                dead.append(connection)

        for ws in dead:
            self.disconnect(ws)


session_manager = SessionManager()