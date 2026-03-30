from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SensorIngestPayload(BaseModel):
    sensor_id: str
    type: Literal["radar", "lidar"]
    timestamp: datetime
    raw_detection: dict[str, Any]
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    location: str | None = None


class SensorIngestResponse(BaseModel):
    sensor_id: str
    sensor_type: Literal["radar", "lidar"]
    sensor_status: Literal["active", "inactive", "error"]
    detected_objects: int
    saved_threats: int
    timestamp: datetime
