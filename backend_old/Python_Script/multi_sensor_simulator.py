
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
import time

try:
    from model.sensors import RadarSensor, LidarSensor
except ModuleNotFoundError:
    from Model.sensors import RadarSensor, LidarSensor

HOST = "127.0.0.1"
PORT = 9000

sensors = []

# Ask user sensor counts by type
radar_count = int(input("How many RADAR sensors? "))
lidar_count = int(input("How many LIDAR sensors? "))

for index in range(radar_count):
    latitude = 23.02 + index * 0.001
    longitude = 72.57 + index * 0.001
    sensors.append(RadarSensor(f"RADAR_{index+1}", latitude, longitude))

for index in range(lidar_count):
    latitude = 23.05 + index * 0.001
    longitude = 72.60 + index * 0.001
    sensors.append(LidarSensor(f"LIDAR_{index+1}", latitude, longitude))


def sensor_thread(sensor):
    while True:
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect((HOST, PORT))

            while True:
                try:
                    data = sensor.generate_data()
                    client.sendall((json.dumps(data) + "\n").encode())
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