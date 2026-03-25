import sqlite3
import json

DB_NAME = "sensor_data.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()   #A cursor is an object used to execute SQL queries and fetch results from the database.

    # Sensors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT UNIQUE,
        sensor_type TEXT
    )
    """)

    # Radar readings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS radar_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT,
        raw_detection TEXT,
        timestamp TEXT
    )
    """)

    # LiDAR readings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lidar_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT,
        raw_detection TEXT,
        timestamp TEXT
    )
    """)

    conn.commit()
    conn.close()


# Register sensor if not already stored
def register_sensor(message):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR IGNORE INTO sensors
    (sensor_id, sensor_type)
    VALUES (?, ?)
    """, (
        message["sensor_id"],
        message["type"]
    ))

    conn.commit()
    conn.close()


def insert_radar_reading(message):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    raw_detection_json = json.dumps(message["raw_detection"])

    cursor.execute("""
    INSERT INTO radar_readings
    (sensor_id, raw_detection, timestamp)
    VALUES (?, ?, ?)
    """, (
        message["sensor_id"],
        raw_detection_json,
        message["timestamp"]
    ))

    conn.commit()
    conn.close()


def insert_lidar_reading(message):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    raw_detection_json = json.dumps(message["raw_detection"])

    cursor.execute("""
    INSERT INTO lidar_readings
    (sensor_id, raw_detection, timestamp)
    VALUES (?, ?, ?)
    """, (
        message["sensor_id"],
        raw_detection_json,
        message["timestamp"]
    ))

    conn.commit()
    conn.close()