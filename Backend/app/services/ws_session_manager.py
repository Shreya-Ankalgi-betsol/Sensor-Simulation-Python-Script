import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    #  Connection lifecycle 

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        payload = json.dumps({"type": "CONNECTION_CONFIRMED", "payload": {"message": "Connected to threat detection system", "status": "live"}})
        try:
            await websocket.send_text(payload)
            # logger.debug("Connection confirmation sent to client")  
        except Exception as exc:
            logger.warning("Failed to send connection confirmation: %s", exc)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)
       
    

    

    # Broadcast to all clients 

    async def broadcast(self, event: str, data: Any) -> None:
        if not self.active_connections:
            return

        payload = json.dumps({"event": event, "data": data}, default=str)
        dead: set[WebSocket] = set()

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as exc:
                logger.warning("Broadcast failed for a client (%s) — removing.", exc)
                dead.add(connection)

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
        """Broadcast threat summary update to all connected clients."""
        if not self.active_connections:
            return

        payload = json.dumps(
            {"type": "THREAT_SUMMARY_UPDATE", "payload": summary_data},
            default=str,
        )
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