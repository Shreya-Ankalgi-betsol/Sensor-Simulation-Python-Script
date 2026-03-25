from __future__ import annotations

import os
import sqlite3


def resolve_db_path() -> str:
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidates = [
        os.path.join(project_root, "sensor_data.db"),
        os.path.join(project_root, "backend_old", "SERVER", "sensor_data.db"),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return candidates[0]


def ensure_schema(conn: sqlite3.Connection) -> None:
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


def upsert_defaults(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()

    rows = cursor.execute(
        """
        SELECT sensor_id, sensor_type
        FROM sensors
        ORDER BY sensor_id
        """
    ).fetchall()

    if not rows:
        rows = [
            ("RADAR_1", "radar"),
            ("LIDAR_1", "lidar"),
        ]

    for index, (sensor_id, sensor_type) in enumerate(rows):
        sensor_id = str(sensor_id)
        sensor_type = str(sensor_type)

        latitude = 23.0200 + (index * 0.0015)
        longitude = 72.5700 + (index * 0.0015)

        if sensor_type.lower() == "radar":
            coverage_angle = 120.0
            coverage_range = 150.0
        else:
            coverage_angle = 70.0
            coverage_range = 35.0

        cursor.execute(
            """
            INSERT INTO sensor_metadata (
                sensor_id,
                sensor_type,
                latitude,
                longitude,
                coverage_angle_deg,
                coverage_range_m,
                mount_yaw_deg
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sensor_id) DO UPDATE SET
                sensor_type = excluded.sensor_type,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                coverage_angle_deg = excluded.coverage_angle_deg,
                coverage_range_m = excluded.coverage_range_m
            """,
            (
                sensor_id,
                sensor_type,
                latitude,
                longitude,
                coverage_angle,
                coverage_range,
                0.0,
            ),
        )

    conn.commit()


def main() -> None:
    db_path = resolve_db_path()
    conn = sqlite3.connect(db_path)

    try:
        ensure_schema(conn)
        upsert_defaults(conn)
        print(f"sensor_metadata ready in: {db_path}")
        print("You can manually update lat/lon/coverage values in the sensor_metadata table.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
