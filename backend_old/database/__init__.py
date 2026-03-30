"""Database package.

Exposes:
- `Database`: high-level SQLite CRUD service
- dataclass models that mirror DB tables

This replaces the previous standalone `database.py` module.
"""

from .models import Sensor, RadarReading, LidarReading, ThreatEvent
from .sqlite_db import Database

# Backwards-compatible functional API (legacy scripts still do
# `from database import init_db, register_sensor, ...`).
db = Database(auto_init=False)


def init_db() -> None:
    db.init_db()


def register_sensor(message: dict) -> None:
    db.register_sensor(message)


def insert_radar_reading(message: dict) -> None:
    db.insert_radar_reading(message)


def insert_lidar_reading(message: dict) -> None:
    db.insert_lidar_reading(message)


def insert_threat_event(event: dict) -> None:
    db.insert_threat_event(event)


def upsert_sensor_health(
    *,
    sensor_id: str,
    sensor_type: str | None,
    last_seen: str | None,
    last_error: str | None = None,
    last_error_at: str | None = None,
) -> None:
    db.upsert_sensor_health(
        sensor_id=sensor_id,
        sensor_type=sensor_type,
        last_seen=last_seen,
        last_error=last_error,
        last_error_at=last_error_at,
    )

__all__ = [
    "db",
    "Database",
    "init_db",
    "register_sensor",
    "insert_radar_reading",
    "insert_lidar_reading",
    "insert_threat_event",
    "upsert_sensor_health",
    "Sensor",
    "RadarReading",
    "LidarReading",
    "ThreatEvent",
]
