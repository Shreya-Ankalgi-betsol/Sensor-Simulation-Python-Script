import sqlite3

DB_NAME = "sensor_data.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Sensors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT UNIQUE,
        sensor_type TEXT,
        latitude REAL,
        longitude REAL
    )
    """)

    # Radar table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS radar_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT,
        range_m REAL,
        angle_deg REAL,
        velocity_mps REAL,
        signal_strength REAL,
        gpu_usage_percent REAL,
        timestamp TEXT
    )
    """)

    # LiDAR table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lidar_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT,
        points TEXT,
        gpu_usage_percent REAL,
        timestamp TEXT
    )
    """)

    conn.commit()
    conn.close()


def insert_radar_reading(message):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO radar_readings
    (sensor_id, range_m, angle_deg, velocity_mps, signal_strength, gpu_usage_percent, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        message["sensor_id"],
        message["range_m"],
        message["angle_deg"],
        message["velocity_mps"],
        message["signal_strength"],
        message["gpu_usage_percent"],
        message["timestamp"]
    ))

    conn.commit()
    conn.close()


def insert_lidar_reading(message):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO lidar_readings
    (sensor_id, points, gpu_usage_percent, timestamp)
    VALUES (?, ?, ?, ?)
    """, (
        message["sensor_id"],
        json.dumps(message["points"]),
        message["gpu_usage_percent"],
        message["timestamp"]
    ))

    conn.commit()
    conn.close()


