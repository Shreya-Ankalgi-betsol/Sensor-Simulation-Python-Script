# import socket
# import json
# import random
# import time
# import threading
# from datetime import datetime

# HOST = "127.0.0.1"
# PORT = 6000

# SENSORS = [
#     {"sensor_id": "RADAR_01", "sensor_type": "RADAR", "latitude": 23.0225, "longitude": 72.5714},
#     {"sensor_id": "RADAR_02", "sensor_type": "RADAR", "latitude": 23.0230, "longitude": 72.5720},
#     {"sensor_id": "LIDAR_01", "sensor_type": "LIDAR", "latitude": 23.0210, "longitude": 72.5705},
#     {"sensor_id": "LIDAR_02", "sensor_type": "LIDAR", "latitude": 23.0240, "longitude": 72.5730}
# ]

# def generate_radar():
#     return {
#         "range_m": round(random.uniform(1, 150), 2),
#         "angle_deg": round(random.uniform(-60, 60), 2),
#         "velocity_mps": round(random.uniform(-30, 30), 2),
#         "signal_strength": round(random.uniform(0.1, 1.0), 2)
#     }

# def generate_lidar():
#     points = []
#     for _ in range(50):
#         points.append({
#             "x": round(random.uniform(-20, 20), 2),
#             "y": round(random.uniform(-20, 20), 2),
#             "z": round(random.uniform(0, 5), 2),
#             "intensity": round(random.uniform(0.1, 1.0), 2)
#         })
#     return {"points": points}

# def sensor_thread(sensor):
#     client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
#     client.connect((HOST, PORT))

#     while True:
#         base_data = {
#             "sensor_id": sensor["sensor_id"],
#             "sensor_type": sensor["sensor_type"],
#             "latitude": sensor["latitude"],
#             "longitude": sensor["longitude"],
#             "gpu_usage_percent": round(random.uniform(10, 90), 2),
#             "timestamp": datetime.utcnow().isoformat()
#         }

#         if sensor["sensor_type"] == "RADAR":
#             base_data.update(generate_radar())
#         else:
#             base_data.update(generate_lidar())

#         client.sendall(json.dumps(base_data).encode())
#         time.sleep(2)

# for sensor in SENSORS:
#     threading.Thread(target=sensor_thread, args=(sensor,), daemon=True).start()

# while True:
#     time.sleep(1)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
import time
from Model.sensors import RadarSensor, LidarSensor

HOST = "127.0.0.1"
PORT = 9000

# Ask user how many sensors
num = int(input("How many sensors? "))

sensors = []

for i in range(num):
    sensor_type = input(f"Enter type for sensor {i+1} (RADAR/LIDAR): ").upper()
    latitude = 23.02 + i * 0.001
    longitude = 72.57 + i * 0.001

    if sensor_type == "RADAR":
        sensor = RadarSensor(f"RADAR_{i+1}", latitude, longitude)
    else:
        sensor = LidarSensor(f"LIDAR_{i+1}", latitude, longitude)

    sensors.append(sensor)


def sensor_thread(sensor):
    while True:
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect((HOST, PORT))

            while True:
                try:
                    data = sensor.generate_data()
                    client.sendall(json.dumps(data).encode())
                    time.sleep(2)
                except (ConnectionAbortedError, ConnectionResetError) as ce:
                    print(f"Connection error for {sensor.sensor_id}: {ce}")
                    break
                except Exception as e:
                    print(f"Error sending data from {sensor.sensor_id}: {e}")
                    break
                    
        except ConnectionRefusedError:
            print(f"Cannot connect to server for {sensor.sensor_id}. Retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Fatal error in {sensor.sensor_id}: {e}")
            time.sleep(5)


for sensor in sensors:
    threading.Thread(target=sensor_thread, args=(sensor,), daemon=True).start()


while True:
    time.sleep(5)