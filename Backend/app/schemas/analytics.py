import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.sensor import SensorType
from app.models.threat_log import ThreatSeverity


class BucketBy(str, enum.Enum):
    minute = "minute"
    hour = "hour"
    day = "day"


# ── Shared filter ─────────────────────────────────────────────────────────────

class AnalyticsFilter(BaseModel):
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None
    location: Optional[list[str]] = None
    sensor_type: Optional[list[SensorType]] = None
    severity: Optional[list[ThreatSeverity]] = None
    threat_type: Optional[list[str]] = None
    bucket_by: BucketBy = BucketBy.hour


# ── A: Threat Timeline ────────────────────────────────────────────────────────

class ThreatTimelinePoint(BaseModel):
    bucket: datetime
    count: int


class ThreatTimelineOut(BaseModel):
    data: list[ThreatTimelinePoint]
    bucket_by: str


# ── B: Threats Per Sensor ─────────────────────────────────────────────────────

class ThreatPerSensorPoint(BaseModel):
    sensor_id: str
    sensor_type: str
    location: str
    count: int


class ThreatsPerSensorOut(BaseModel):
    data: list[ThreatPerSensorPoint]


# ── C: Severity Breakdown ─────────────────────────────────────────────────────

class SeverityBreakdownPoint(BaseModel):
    severity: str
    count: int


class SeverityBreakdownOut(BaseModel):
    data: list[SeverityBreakdownPoint]
    total: int


# ── D: Threat Type Breakdown ──────────────────────────────────────────────────

class ThreatTypeBreakdownPoint(BaseModel):
    threat_type: str
    count: int


class ThreatTypeBreakdownOut(BaseModel):
    data: list[ThreatTypeBreakdownPoint]
    total: int