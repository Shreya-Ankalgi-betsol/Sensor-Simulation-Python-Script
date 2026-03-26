from __future__ import annotations

import json
import math
import os
import sqlite3
from datetime import datetime
from typing import Any

from flask import Flask, jsonify, render_template

app = Flask(__name__, template_folder="templates")


class SensorMapRepository:
    def __init__(self, db_path: str | None = None) -> None:
        self.db_path = db_path or self._resolve_db_path()
        self._ensure_metadata_table()

    def _resolve_db_path(self) -> str:
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        candidates = [
            os.path.join(project_root, "sensor_data.db"),
            os.path.join(project_root, "backend_old", "sensor_data.db"),
            os.path.join(project_root, "backend_old", "SERVER", "sensor_data.db"),
        ]
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return candidates[0]

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _ensure_metadata_table(self) -> None:
        conn = self._connect()
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_metadata (
                sensor_id TEXT PRIMARY KEY,
                sensor_type TEXT,
                latitude REAL,
                longitude REAL,
                coverage_angle_deg REAL,
                coverage_range_m REAL,
                mount_yaw_deg REAL DEFAULT 0
            )
            """
        )
        conn.commit()
        conn.close()

    def get_sensor_metadata(self) -> dict[str, dict[str, Any]]:
        conn = self._connect()
        cursor = conn.cursor()

        rows = cursor.execute(
            """
            SELECT sm.sensor_id,
                   COALESCE(sm.sensor_type, s.sensor_type) as sensor_type,
                   sm.latitude,
                   sm.longitude,
                   sm.coverage_angle_deg,
                   sm.coverage_range_m,
                   sm.mount_yaw_deg
            FROM sensor_metadata sm
            LEFT JOIN sensors s ON s.sensor_id = sm.sensor_id
            """
        ).fetchall()

        conn.close()

        metadata: dict[str, dict[str, Any]] = {}
        for row in rows:
            metadata[str(row[0])] = {
                "sensor_id": str(row[0]),
                "sensor_type": str(row[1]) if row[1] is not None else "unknown",
                "latitude": float(row[2]),
                "longitude": float(row[3]),
                "coverage_angle_deg": float(row[4]),
                "coverage_range_m": float(row[5]),
                "mount_yaw_deg": float(row[6] if row[6] is not None else 0.0),
            }

        return metadata

    def get_recent_radar(self, limit: int = 300) -> list[dict[str, Any]]:
        conn = self._connect()
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT sensor_id, raw_detection, timestamp
            FROM radar_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        conn.close()

        records: list[dict[str, Any]] = []
        for sensor_id, raw_detection_text, timestamp in reversed(rows):
            raw_detection = json.loads(raw_detection_text) if raw_detection_text else {}
            records.append(
                {
                    "sensor_id": str(sensor_id),
                    "raw_detection": raw_detection,
                    "timestamp": str(timestamp),
                }
            )
        return records

    def get_recent_lidar(self, limit: int = 300) -> list[dict[str, Any]]:
        conn = self._connect()
        cursor = conn.cursor()
        rows = cursor.execute(
            """
            SELECT sensor_id, raw_detection, timestamp
            FROM lidar_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        conn.close()

        records: list[dict[str, Any]] = []
        for sensor_id, raw_detection_text, timestamp in reversed(rows):
            raw_detection = json.loads(raw_detection_text) if raw_detection_text else {}
            records.append(
                {
                    "sensor_id": str(sensor_id),
                    "raw_detection": raw_detection,
                    "timestamp": str(timestamp),
                }
            )
        return records

    def get_recent_threats(self, limit: int = 50) -> list[dict[str, Any]]:
        conn = self._connect()
        cursor = conn.cursor()

        try:
            rows = cursor.execute(
                """
                SELECT id, sensor_id, sensor_type, threat_type, confidence, severity, timestamp
                FROM threat_events
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        except sqlite3.OperationalError:
            # threat_events table not present yet
            rows = []
        finally:
            conn.close()

        threats: list[dict[str, Any]] = []
        for row in reversed(rows):
            threats.append(
                {
                    "id": int(row[0]),
                    "sensor_id": str(row[1]),
                    "sensor_type": str(row[2]),
                    "threat_type": str(row[3]),
                    "confidence": float(row[4]) if row[4] is not None else 0.0,
                    "severity": row[5],
                    "timestamp": str(row[6]),
                }
            )

        return threats


def meters_to_latlon(base_lat: float, base_lon: float, dx_m: float, dy_m: float) -> tuple[float, float]:
    lat = base_lat + (dy_m / 111_111.0)
    lon = base_lon + (dx_m / (111_111.0 * max(0.1, math.cos(math.radians(base_lat)))))
    return lat, lon


def radar_point_to_latlon(sensor_meta: dict[str, Any], raw: dict[str, Any]) -> tuple[float, float] | None:
    if not all(field in raw for field in ["range_m", "azimuth_deg"]):
        return None

    range_m = float(raw["range_m"])
    azimuth = float(raw["azimuth_deg"]) + float(sensor_meta.get("mount_yaw_deg", 0.0))
    azimuth_rad = math.radians(azimuth)

    dx_m = range_m * math.cos(azimuth_rad)
    dy_m = range_m * math.sin(azimuth_rad)

    return meters_to_latlon(sensor_meta["latitude"], sensor_meta["longitude"], dx_m, dy_m)


def lidar_point_to_latlon(sensor_meta: dict[str, Any], raw: dict[str, Any]) -> tuple[float, float] | None:
    centroid = raw.get("centroid")
    if not isinstance(centroid, dict):
        return None
    if not all(field in centroid for field in ["x", "y"]):
        return None

    dx_m = float(centroid["x"])
    dy_m = float(centroid["y"])

    return meters_to_latlon(sensor_meta["latitude"], sensor_meta["longitude"], dx_m, dy_m)


def parse_timestamp(ts: str) -> float:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/map-data")
def map_data():
    repo = SensorMapRepository()

    metadata = repo.get_sensor_metadata()

    trajectories: dict[str, list[dict[str, Any]]] = {}

    for reading in repo.get_recent_radar(limit=400):
        sensor_id = reading["sensor_id"]
        if sensor_id not in metadata:
            continue
        point = radar_point_to_latlon(metadata[sensor_id], reading["raw_detection"])
        if point is None:
            continue
        trajectories.setdefault(sensor_id, []).append(
            {
                "timestamp": reading["timestamp"],
                "latitude": point[0],
                "longitude": point[1],
            }
        )

    for reading in repo.get_recent_lidar(limit=400):
        sensor_id = reading["sensor_id"]
        if sensor_id not in metadata:
            continue
        point = lidar_point_to_latlon(metadata[sensor_id], reading["raw_detection"])
        if point is None:
            continue
        trajectories.setdefault(sensor_id, []).append(
            {
                "timestamp": reading["timestamp"],
                "latitude": point[0],
                "longitude": point[1],
            }
        )

    for sensor_id in trajectories:
        trajectories[sensor_id].sort(key=lambda item: parse_timestamp(item["timestamp"]))
        trajectories[sensor_id] = trajectories[sensor_id][-80:]

    sensors = list(metadata.values())

    return jsonify(
        {
            "db_path": repo.db_path,
            "sensors": sensors,
            "trajectories": trajectories,
        }
    )


@app.route("/api/threats")
def threats():
    repo = SensorMapRepository()
    return jsonify(
        {
            "db_path": repo.db_path,
            "threats": repo.get_recent_threats(limit=50),
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
