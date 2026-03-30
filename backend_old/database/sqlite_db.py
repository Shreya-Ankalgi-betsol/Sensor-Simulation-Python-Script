from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from .models import LidarReading, RadarReading, ThreatEvent


class Database:
    """SQLite CRUD service.

    The goal is to expose a single object (`db`) that provides all DB operations,
    so callers don't import dozens of standalone functions.
    """

    def __init__(self, db_path: Optional[str] = None, *, auto_init: bool = True):
        self.db_path = db_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "sensor_data.db",
        )

        if auto_init:
            self.init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    # -------------------------
    # Schema
    # -------------------------

    def init_db(self) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sensors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT UNIQUE,
                sensor_type TEXT
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS radar_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT,
                raw_detection TEXT,
                timestamp TEXT
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS lidar_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT,
                raw_detection TEXT,
                timestamp TEXT
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS threat_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT,
                sensor_type TEXT,
                threat_type TEXT,
                confidence REAL,
                severity TEXT,
                timestamp TEXT
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_health (
                sensor_id TEXT PRIMARY KEY,
                sensor_type TEXT,
                last_seen TEXT,
                last_error_at TEXT,
                last_error TEXT
            )
            """
        )

        conn.commit()
        conn.close()

    # -------------------------
    # Sensor health
    # -------------------------

    def upsert_sensor_health(
        self,
        *,
        sensor_id: str,
        sensor_type: str | None,
        last_seen: str | None,
        last_error: str | None = None,
        last_error_at: str | None = None,
    ) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        if last_error is not None and last_error_at is None:
            last_error_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        cursor.execute(
            """
            INSERT INTO sensor_health (sensor_id, sensor_type, last_seen, last_error_at, last_error)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(sensor_id) DO UPDATE SET
                sensor_type = COALESCE(excluded.sensor_type, sensor_health.sensor_type),
                last_seen = COALESCE(excluded.last_seen, sensor_health.last_seen),
                last_error_at = COALESCE(excluded.last_error_at, sensor_health.last_error_at),
                last_error = COALESCE(excluded.last_error, sensor_health.last_error)
            """,
            (
                sensor_id,
                sensor_type,
                last_seen,
                last_error_at,
                last_error,
            ),
        )

        conn.commit()
        conn.close()

    # -------------------------
    # Writes (CRUD)
    # -------------------------

    def register_sensor(self, message: dict[str, Any]) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT OR IGNORE INTO sensors (sensor_id, sensor_type)
            VALUES (?, ?)
            """,
            (
                message["sensor_id"],
                message["type"],
            ),
        )

        conn.commit()
        conn.close()

    def insert_radar_reading(self, message: dict[str, Any]) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        raw_detection_json = json.dumps(message["raw_detection"])

        cursor.execute(
            """
            INSERT INTO radar_readings (sensor_id, raw_detection, timestamp)
            VALUES (?, ?, ?)
            """,
            (
                message["sensor_id"],
                raw_detection_json,
                message["timestamp"],
            ),
        )

        conn.commit()
        conn.close()

    def insert_lidar_reading(self, message: dict[str, Any]) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        raw_detection_json = json.dumps(message["raw_detection"])

        cursor.execute(
            """
            INSERT INTO lidar_readings (sensor_id, raw_detection, timestamp)
            VALUES (?, ?, ?)
            """,
            (
                message["sensor_id"],
                raw_detection_json,
                message["timestamp"],
            ),
        )

        conn.commit()
        conn.close()

    def insert_threat_event(self, event: dict[str, Any]) -> None:
        conn = self._connect()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO threat_events (sensor_id, sensor_type, threat_type, confidence, severity, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                event["sensor_id"],
                event["sensor_type"],
                event["type"],
                float(event["confidence"]),
                event.get("severity"),
                event["timestamp"],
            ),
        )

        conn.commit()
        conn.close()

    # -------------------------
    # Reads (examples)
    # -------------------------

    def select_lidar_readings(self, *, limit: int = 50) -> list[LidarReading]:
        conn = self._connect()
        cursor = conn.cursor()

        rows = cursor.execute(
            """
            SELECT id, sensor_id, raw_detection, timestamp
            FROM lidar_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        conn.close()

        readings: list[LidarReading] = []
        for row in rows:
            raw_detection = json.loads(row[2]) if row[2] else {}
            readings.append(
                LidarReading(
                    id=int(row[0]),
                    sensor_id=str(row[1]),
                    raw_detection=raw_detection,
                    timestamp=str(row[3]),
                )
            )
        return readings

    def select_radar_readings(self, *, limit: int = 50) -> list[RadarReading]:
        conn = self._connect()
        cursor = conn.cursor()

        rows = cursor.execute(
            """
            SELECT id, sensor_id, raw_detection, timestamp
            FROM radar_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        conn.close()

        readings: list[RadarReading] = []
        for row in rows:
            raw_detection = json.loads(row[2]) if row[2] else {}
            readings.append(
                RadarReading(
                    id=int(row[0]),
                    sensor_id=str(row[1]),
                    raw_detection=raw_detection,
                    timestamp=str(row[3]),
                )
            )
        return readings

    def select_threat_events(self, *, limit: int = 50) -> list[ThreatEvent]:
        conn = self._connect()
        cursor = conn.cursor()

        rows = cursor.execute(
            """
            SELECT id, sensor_id, sensor_type, threat_type, confidence, severity, timestamp
            FROM threat_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        conn.close()

        events: list[ThreatEvent] = []
        for row in rows:
            events.append(
                ThreatEvent(
                    id=int(row[0]),
                    sensor_id=str(row[1]),
                    sensor_type=str(row[2]),
                    threat_type=str(row[3]),
                    confidence=float(row[4]),
                    severity=row[5],
                    timestamp=str(row[6]),
                )
            )
        return events
