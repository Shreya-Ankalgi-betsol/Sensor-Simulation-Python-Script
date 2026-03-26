# threat_detection/main.py

import sys
import os
import sqlite3
import json
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.threat_detection_service import ThreatDetectionService
from database import init_db

# Database is in project root
DB_NAME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sensor_data.db")


def fetch_sensor_data_from_db(limit=None):
    """
    Fetch all sensor readings from the database and yield them
    """
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Fetch radar readings
        query = "SELECT sensor_id, raw_detection, timestamp FROM radar_readings"
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        radar_readings = cursor.fetchall()
        
        for sensor_id, raw_detection_json, timestamp in radar_readings:
            yield {
                "sensor_id": sensor_id,
                "type": "radar",
                "timestamp": timestamp,
                "raw_detection": json.loads(raw_detection_json)
            }
        
        # Fetch lidar readings
        query = "SELECT sensor_id, raw_detection, timestamp FROM lidar_readings"
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        lidar_readings = cursor.fetchall()
        
        for sensor_id, raw_detection_json, timestamp in lidar_readings:
            yield {
                "sensor_id": sensor_id,
                "type": "lidar",
                "timestamp": timestamp,
                "raw_detection": json.loads(raw_detection_json)
            }
        
        conn.close()
        
    except sqlite3.OperationalError as e:
        print(f"Database error: {e}")


def process_all_stored_data(limit=None):
    """
    Process all existing sensor data from the database
    """
    # Ensure database is initialized
    init_db()
    
    service = ThreatDetectionService()
    
    data_count = 0
    for payload in fetch_sensor_data_from_db(limit):
        result = service.process(payload)
        data_count += 1
    
    print(f"\nProcessed {data_count} sensor readings from database")


def monitor_real_time(poll_interval=2, batch_size=10):
    """
    Monitor database for new sensor readings in real-time
    Polls the database periodically for new data
    """
    # Ensure database is initialized
    init_db()
    
    service = ThreatDetectionService()
    last_processed_id = {"radar": 0, "lidar": 0}
    
    print("Starting real-time threat detection from database...\n")
    
    try:
        while True:
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            
            # Fetch new radar readings
            cursor.execute(
                "SELECT id, sensor_id, raw_detection, timestamp FROM radar_readings WHERE id > ? LIMIT ?",
                (last_processed_id["radar"], batch_size)
            )
            radar_readings = cursor.fetchall()
            
            for reading_id, sensor_id, raw_detection_json, timestamp in radar_readings:
                payload = {
                    "sensor_id": sensor_id,
                    "type": "radar",
                    "timestamp": timestamp,
                    "raw_detection": json.loads(raw_detection_json)
                }
                service.process(payload)
                last_processed_id["radar"] = reading_id
            
            # Fetch new lidar readings
            cursor.execute(
                "SELECT id, sensor_id, raw_detection, timestamp FROM lidar_readings WHERE id > ? LIMIT ?",
                (last_processed_id["lidar"], batch_size)
            )
            lidar_readings = cursor.fetchall()
            
            for reading_id, sensor_id, raw_detection_json, timestamp in lidar_readings:
                payload = {
                    "sensor_id": sensor_id,
                    "type": "lidar",
                    "timestamp": timestamp,
                    "raw_detection": json.loads(raw_detection_json)
                }
                service.process(payload)
                last_processed_id["lidar"] = reading_id
            
            conn.close()
            
            # Poll interval
            time.sleep(poll_interval)
            
    except KeyboardInterrupt:
        print("\n\nThreat detection monitoring stopped")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Threat Detection using real sensor data")
    parser.add_argument("--mode", choices=["batch", "realtime"], default="realtime",
                        help="Mode: 'batch' to process all existing data, 'realtime' to monitor new data")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limit number of records to process (batch mode only)")
    parser.add_argument("--poll-interval", type=int, default=2,
                        help="Poll interval in seconds (realtime mode only)")
    
    args = parser.parse_args()
    
    if args.mode == "batch":
        process_all_stored_data(args.limit)
    else:
        monitor_real_time(args.poll_interval)