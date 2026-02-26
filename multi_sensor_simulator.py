import socket
import json
import random
import time
import threading
from datetime import datetime

HOST = "127.0.0.1"
PORT = 6000

SENSORS = [
    {"sensor_id": "RADAR_01", "sensor_type": "RADAR", "latitude": 23.0225, "longitude": 72.5714},
    {"sensor_id": "RADAR_02", "sensor_type": "RADAR", "latitude": 23.0230, "longitude": 72.5720},
    {"sensor_id": "LIDAR_01", "sensor_type": "LIDAR", "latitude": 23.0210, "longitude": 72.5705},
    {"sensor_id": "LIDAR_02", "sensor_type": "LIDAR", "latitude": 23.0240, "longitude": 72.5730}
]

def generate_radar():
    return {
        "range_m": round(random.uniform(1, 150), 2),
        "angle_deg": round(random.uniform(-60, 60), 2),
        "velocity_mps": round(random.uniform(-30, 30), 2),
        "signal_strength": round(random.uniform(0.1, 1.0), 2)
    }

def generate_lidar():
    points = []
    for _ in range(50):
        points.append({
            "x": round(random.uniform(-20, 20), 2),
            "y": round(random.uniform(-20, 20), 2),
            "z": round(random.uniform(0, 5), 2),
            "intensity": round(random.uniform(0.1, 1.0), 2)
        })
    return {"points": points}

def sensor_thread(sensor):
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((HOST, PORT))

    while True:
        base_data = {
            "sensor_id": sensor["sensor_id"],
            "sensor_type": sensor["sensor_type"],
            "latitude": sensor["latitude"],
            "longitude": sensor["longitude"],
            "gpu_usage_percent": round(random.uniform(10, 90), 2),
            "timestamp": datetime.utcnow().isoformat()
        }

        if sensor["sensor_type"] == "RADAR":
            base_data.update(generate_radar())
        else:
            base_data.update(generate_lidar())

        client.sendall(json.dumps(base_data).encode())
        time.sleep(2)

for sensor in SENSORS:
    threading.Thread(target=sensor_thread, args=(sensor,), daemon=True).start()

while True:
    time.sleep(1)