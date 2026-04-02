
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
import time
from urllib.request import Request, urlopen
from sensors import RadarSensor, LidarSensor

HOST = "127.0.0.1"
PORT = 9000
BACKEND_API_BASE = os.getenv("BACKEND_API_BASE", "http://127.0.0.1:8000")
SENSOR_LIST_URL = f"{BACKEND_API_BASE}/api/v1/sensors"
SENSOR_SYNC_INTERVAL_SECONDS = int(os.getenv("SENSOR_SYNC_INTERVAL_SECONDS", "5"))
SEND_INTERVAL_SECONDS = float(os.getenv("SENSOR_SEND_INTERVAL_SECONDS", "2"))

sensor_threads = {}
sensor_lock = threading.Lock()


def _fetch_backend_sensors():
    request = Request(SENSOR_LIST_URL, headers={"Accept": "application/json"})
    with urlopen(request, timeout=10) as response:
        status_code = getattr(response, "status", None)
        if status_code != 200:
            raise RuntimeError(f"Unexpected response {status_code} from {SENSOR_LIST_URL}")

        payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, list):
            raise RuntimeError("Expected sensor list response from backend")
        return payload


def _build_sensor(sensor_payload):
    sensor_id = str(sensor_payload.get("sensor_id", "")).strip()
    sensor_type = str(sensor_payload.get("sensor_type", "")).strip().lower()

    if not sensor_id:
        return None

    try:
        latitude = float(sensor_payload.get("lat", 0.0))
        longitude = float(sensor_payload.get("lng", 0.0))
    except (TypeError, ValueError):
        latitude = 0.0
        longitude = 0.0

    if sensor_type == "radar":
        return RadarSensor(sensor_id, latitude, longitude)
    if sensor_type == "lidar":
        return LidarSensor(sensor_id, latitude, longitude)

    return None


def sensor_thread(sensor, stop_event):
    while not stop_event.is_set():
        client = None
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.settimeout(3)
            client.connect((HOST, PORT))

            while not stop_event.is_set():
                try:
                    data = sensor.generate_data()
                    client.sendall(json.dumps(data).encode())
                    if stop_event.wait(SEND_INTERVAL_SECONDS):
                        break
                except (ConnectionAbortedError, ConnectionResetError) as ce:
                    print(f"Connection error for {sensor.sensor_id}: {ce}")
                    break
                except socket.timeout:
                    continue
                except Exception as e:
                    print(f"Error sending data from {sensor.sensor_id}: {e}")
                    break
                    
        except ConnectionRefusedError:
            if stop_event.is_set():
                break
            print(f"Cannot connect to server for {sensor.sensor_id}. Retrying in 5 seconds...")
            if stop_event.wait(5):
                break
        except Exception as e:
            if stop_event.is_set():
                break
            print(f"Fatal error in {sensor.sensor_id}: {e}")
            if stop_event.wait(5):
                break
        finally:
            if client is not None:
                try:
                    client.close()
                except Exception:
                    pass

    print(f"Stopped stream for {sensor.sensor_id}")


def sync_sensors_from_backend():
    while True:
        try:
            backend_sensors = _fetch_backend_sensors()
        except Exception as exc:
            print(f"Failed to fetch sensors from backend: {exc}")
            time.sleep(SENSOR_SYNC_INTERVAL_SECONDS)
            continue

        new_streams = 0
        stopped_streams = 0
        radar_count = 0
        lidar_count = 0
        current_sensor_ids = set()

        for sensor_payload in backend_sensors:
            sensor = _build_sensor(sensor_payload)
            if sensor is None:
                continue

            current_sensor_ids.add(sensor.sensor_id)

            if isinstance(sensor, RadarSensor):
                radar_count += 1
            elif isinstance(sensor, LidarSensor):
                lidar_count += 1

            with sensor_lock:
                if sensor.sensor_id in sensor_threads:
                    continue

                stop_event = threading.Event()

                thread = threading.Thread(
                    target=sensor_thread,
                    args=(sensor, stop_event),
                    daemon=True,
                    name=f"sensor-stream-{sensor.sensor_id}",
                )
                sensor_threads[sensor.sensor_id] = {
                    "thread": thread,
                    "stop_event": stop_event,
                }
                thread.start()
                new_streams += 1
                print(
                    f"Started stream for {sensor.sensor_id} "
                    f"({sensor.latitude}, {sensor.longitude})"
                )

        with sensor_lock:
            removed_sensor_ids = [
                sensor_id for sensor_id in list(sensor_threads.keys())
                if sensor_id not in current_sensor_ids
            ]

            for sensor_id in removed_sensor_ids:
                stream = sensor_threads.pop(sensor_id)
                stream["stop_event"].set()
                stopped_streams += 1
                print(f"Sensor removed from backend; stopping stream: {sensor_id}")

        print(
            "Sensor sync complete | "
            f"total={len(backend_sensors)} radar={radar_count} lidar={lidar_count} "
            f"active_streams={len(sensor_threads)} new_streams={new_streams} "
            f"stopped_streams={stopped_streams}"
        )

        time.sleep(SENSOR_SYNC_INTERVAL_SECONDS)


print(f"Fetching sensors from: {SENSOR_LIST_URL}")
print("Create sensors from frontend/admin; simulator will auto-start streams.")

threading.Thread(target=sync_sensors_from_backend, daemon=True).start()


while True:
    time.sleep(30)