

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
import time
from sensors import RadarSensor, LidarSensor

HOST = "127.0.0.1"
PORT = 9000

def _read_non_negative_int(prompt: str) -> int:
    while True:
        raw = input(prompt).strip()
        try:
            value = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue

        if value < 0:
            print("Please enter 0 or a positive number.")
            continue

        return value


radar_count = _read_non_negative_int("How many RADAR sensors? ")
lidar_count = _read_non_negative_int("How many LIDAR sensors? ")

sensors = []

base_lat = 23.02
base_lon = 72.57
coord_step = 0.001
coord_index = 0

for i in range(radar_count):
    latitude = base_lat + coord_index * coord_step
    longitude = base_lon + coord_index * coord_step
    coord_index += 1
    sensors.append(RadarSensor(f"RADAR_{i+1}", latitude, longitude))

for i in range(lidar_count):
    latitude = base_lat + coord_index * coord_step
    longitude = base_lon + coord_index * coord_step
    coord_index += 1
    sensors.append(LidarSensor(f"LIDAR_{i+1}", latitude, longitude))


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