from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class Sensor:
    sensor_id: str
    sensor_type: str


@dataclass(frozen=True)
class RadarReading:
    id: int
    sensor_id: str
    raw_detection: dict[str, Any]
    timestamp: str


@dataclass(frozen=True)
class LidarReading:
    id: int
    sensor_id: str
    raw_detection: dict[str, Any]
    timestamp: str


@dataclass(frozen=True)
class ThreatEvent:
    id: int
    sensor_id: str
    sensor_type: str
    threat_type: str
    confidence: float
    severity: Optional[str]
    timestamp: str
