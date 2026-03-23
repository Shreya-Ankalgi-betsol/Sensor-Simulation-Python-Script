"""Database package.

Exposes:
- `Database`: high-level SQLite CRUD service
- dataclass models that mirror DB tables

This replaces the previous standalone `database.py` module.
"""

from .models import Sensor, RadarReading, LidarReading, ThreatEvent
from .sqlite_db import Database

__all__ = [
    "Database",
    "Sensor",
    "RadarReading",
    "LidarReading",
    "ThreatEvent",
]
