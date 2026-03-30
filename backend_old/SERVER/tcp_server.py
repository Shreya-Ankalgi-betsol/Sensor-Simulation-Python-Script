

import socket
import json
import threading
import sys
import os

# Allow importing database.py if server is inside another folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, register_sensor, insert_radar_reading, insert_lidar_reading, upsert_sensor_health
from internal.services.threat_detection_service import ThreatDetectionService

HOST = "127.0.0.1"
PORT = 9000

# Initialize database
init_db()

# Initialize threat detection (process messages as they arrive)
threat_service = ThreatDetectionService()

def handle_client(conn, addr):
    print("Connected by", addr)

    while True:
        try:
            data = conn.recv(4096)

            if not data:
                break

            message = json.loads(data.decode())

            print("Received:", message)

            # Mark sensor as seen (assumes continuous stream => active)
            try:
                upsert_sensor_health(
                    sensor_id=str(message.get("sensor_id")),
                    sensor_type=str(message.get("type")) if message.get("type") is not None else None,
                    last_seen=str(message.get("timestamp")) if message.get("timestamp") is not None else None,
                )
            except Exception as health_error:
                print("Sensor health update error:", health_error)

            # Real-time threat detection on the incoming message
            try:
                detection = threat_service.process(message)
                if detection.get("detected_objects"):
                    print("THREAT:", detection)
            except Exception as detect_error:
                print("Threat detection error:", detect_error)
                try:
                    upsert_sensor_health(
                        sensor_id=str(message.get("sensor_id")),
                        sensor_type=str(message.get("type")) if message.get("type") is not None else None,
                        last_seen=str(message.get("timestamp")) if message.get("timestamp") is not None else None,
                        last_error=str(detect_error),
                    )
                except Exception:
                    pass

            try:
                # Register sensor metadata
                register_sensor(message)

                # Insert sensor reading
                if message.get("type") == "radar":
                    insert_radar_reading(message)

                elif message.get("type") == "lidar":
                    insert_lidar_reading(message)

            except Exception as db_error:
                print("Database error:", db_error)
                try:
                    upsert_sensor_health(
                        sensor_id=str(message.get("sensor_id")),
                        sensor_type=str(message.get("type")) if message.get("type") is not None else None,
                        last_seen=str(message.get("timestamp")) if message.get("timestamp") is not None else None,
                        last_error=str(db_error),
                    )
                except Exception:
                    pass
                continue

        except json.JSONDecodeError as je:
            print("JSON decode error:", je)
            continue

        except Exception as e:
            print("Error:", e)
            break

    try:
        conn.close()
    except:
        pass

    print("Connection closed:", addr)


# Create TCP server
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen()

print(f"TCP Server listening on {HOST}:{PORT}")


# Accept clients
while True:
    conn, addr = server.accept()

    threading.Thread(
        target=handle_client,
        args=(conn, addr),
        daemon=True
    ).start()