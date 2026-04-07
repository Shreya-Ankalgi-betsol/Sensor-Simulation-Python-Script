"""
WebSocket message schema for real-time threat detection events.
Defines the contract between backend and frontend for WebSocket communication.
"""

from typing import Any, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class WebSocketMessage(BaseModel):
    """Base WebSocket message"""
    type: str
    payload: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConnectionConfirmed(BaseModel):
    """Sent when client connects to WebSocket"""
    type: Literal["CONNECTION_CONFIRMED"]
    payload: dict = Field(
        default={
            "message": "Connected to threat detection system",
            "status": "live"
        }
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ThreatDetectedPayload(BaseModel):
    """Threat detection event data"""
    threat_id: str
    sensor_id: str
    sensor_type: Literal["radar", "lidar"]
    severity: Literal["low", "medium", "high", "critical"]
    detected_objects: int
    object_types: list[str] = []
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: datetime


class ThreatDetected(BaseModel):
    """Broadcast when threats are detected"""
    type: Literal["threat_detected"]
    payload: ThreatDetectedPayload
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ThreatClearedPayload(BaseModel):
    """Threat cleared event data"""
    sensor_id: str
    cleared_at: datetime


class ThreatCleared(BaseModel):
    """Broadcast when threats are cleared"""
    type: Literal["threat_cleared"]
    payload: ThreatClearedPayload
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ThreatAcknowledgedPayload(BaseModel):
    """Threat acknowledged event data"""
    threat_id: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: datetime


class ThreatAcknowledged(BaseModel):
    """Broadcast when threat is acknowledged"""
    type: Literal["threat_acknowledged"]
    payload: ThreatAcknowledgedPayload
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HeartbeatMessage(BaseModel):
    """Keep-alive message to prevent timeout"""
    type: Literal["heartbeat"]
    payload: dict = Field(default={"status": "alive"})
    timestamp: datetime = Field(default_factory=datetime.utcnow)
