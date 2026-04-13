
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
import time
import math
import random
from urllib.request import Request, urlopen
from sensors import RadarSensor, LidarSensor

HOST = "127.0.0.1"
PORT = 9000
BACKEND_API_BASE = os.getenv("BACKEND_API_BASE", "http://127.0.0.1:8000")
SENSOR_LIST_URL = f"{BACKEND_API_BASE}/api/v1/sensors"
SENSOR_SYNC_INTERVAL_SECONDS = int(os.getenv("SENSOR_SYNC_INTERVAL_SECONDS", "5"))
SEND_INTERVAL_SECONDS = float(os.getenv("SENSOR_SEND_INTERVAL_SECONDS", "2"))
WORLD_TICK_SECONDS = float(os.getenv("WORLD_TICK_SECONDS", "1"))
MIN_ACTIVE_OBJECTS = int(os.getenv("MIN_ACTIVE_OBJECTS", "3"))
MAX_ACTIVE_OBJECTS = int(os.getenv("MAX_ACTIVE_OBJECTS", "8"))

sensor_threads = {}
sensor_lock = threading.Lock()


class ObjectWorld:
    def __init__(self):
        self._lock = threading.Lock()
        self._tracks = {}
        self._next_track_number = 1
        self._center_lat = 15.8856
        self._center_lng = 74.52
        self._rng = random.Random()
        self._last_print_time = 0.0
        self._fov_by_sensor_type = {
            "radar": 120.0,
            "lidar": 100.0,
        }
        self._max_center_distance_m = 850.0

    def _meters_to_latlng(self, lat0, lng0, north_m, east_m):
        earth_radius_m = 6378137.0
        lat0_rad = math.radians(lat0)
        dlat_deg = math.degrees(north_m / earth_radius_m)
        dlng_deg = math.degrees(east_m / (earth_radius_m * max(math.cos(lat0_rad), 1e-8)))
        return lat0 + dlat_deg, lng0 + dlng_deg

    def _relative_offsets_m(self, lat0, lng0, lat1, lng1):
        earth_radius_m = 6378137.0
        lat0_rad = math.radians(lat0)
        dlat_rad = math.radians(lat1 - lat0)
        dlng_rad = math.radians(lng1 - lng0)
        north_m = dlat_rad * earth_radius_m
        east_m = dlng_rad * earth_radius_m * max(math.cos(lat0_rad), 1e-8)
        return north_m, east_m

    def _build_track(self):
        object_type = self._rng.choices(
            ["person", "drone", "vehicle"],
            weights=[0.5, 0.25, 0.25],
            k=1,
        )[0]

        spawn_radius_m = self._rng.uniform(40.0, 320.0)
        spawn_angle = self._rng.uniform(0.0, 2 * math.pi)
        north_m = math.cos(spawn_angle) * spawn_radius_m
        east_m = math.sin(spawn_angle) * spawn_radius_m
        lat, lng = self._meters_to_latlng(self._center_lat, self._center_lng, north_m, east_m)

        if object_type == "person":
            speed = self._rng.uniform(0.7, 2.4)
            ttl_seconds = self._rng.uniform(40.0, 120.0)
        elif object_type == "drone":
            speed = self._rng.uniform(4.0, 15.0)
            ttl_seconds = self._rng.uniform(35.0, 110.0)
        else:
            speed = self._rng.uniform(3.0, 12.0)
            ttl_seconds = self._rng.uniform(50.0, 160.0)

        heading = self._rng.uniform(0.0, 2 * math.pi)
        v_north_mps = math.cos(heading) * speed
        v_east_mps = math.sin(heading) * speed

        track_id = f"OBJ-{self._next_track_number:04d}"
        self._next_track_number += 1

        return {
            "track_id": track_id,
            "object_type": object_type,
            "lat": lat,
            "lng": lng,
            "v_north_mps": v_north_mps,
            "v_east_mps": v_east_mps,
            "state": "moving",
            "age_seconds": 0.0,
            "ttl_seconds": ttl_seconds,
            "stop_remaining_seconds": 0.0,
            "resume_v_north_mps": 0.0,
            "resume_v_east_mps": 0.0,
        }

    def set_center_from_sensors(self, backend_sensors):
        valid_coords = []
        for sensor_payload in backend_sensors:
            try:
                valid_coords.append(
                    (
                        float(sensor_payload.get("lat", 0.0)),
                        float(sensor_payload.get("lng", 0.0)),
                    )
                )
            except (TypeError, ValueError):
                continue

        if not valid_coords:
            return

        with self._lock:
            self._center_lat = sum(lat for lat, _ in valid_coords) / len(valid_coords)
            self._center_lng = sum(lng for _, lng in valid_coords) / len(valid_coords)

    def _distance_from_center(self, track):
        north_m, east_m = self._relative_offsets_m(
            self._center_lat,
            self._center_lng,
            track["lat"],
            track["lng"],
        )
        return math.sqrt(north_m**2 + east_m**2)

    def _tick_track(self, track, dt):
        track["age_seconds"] += dt

        if track["state"] == "stopped":
            track["stop_remaining_seconds"] -= dt
            if track["stop_remaining_seconds"] <= 0:
                track["state"] = "moving"
                track["v_north_mps"] = track["resume_v_north_mps"]
                track["v_east_mps"] = track["resume_v_east_mps"]
            return

        current_speed = math.sqrt(track["v_north_mps"] ** 2 + track["v_east_mps"] ** 2)
        if current_speed > 0:
            heading = math.atan2(track["v_east_mps"], track["v_north_mps"])
            heading += self._rng.uniform(-0.2, 0.2) * dt
            current_speed *= self._rng.uniform(0.95, 1.05)
            track["v_north_mps"] = math.cos(heading) * current_speed
            track["v_east_mps"] = math.sin(heading) * current_speed

        north_delta = track["v_north_mps"] * dt
        east_delta = track["v_east_mps"] * dt
        track["lat"], track["lng"] = self._meters_to_latlng(
            track["lat"],
            track["lng"],
            north_delta,
            east_delta,
        )

        if self._rng.random() < 0.05 * dt:
            track["state"] = "stopped"
            track["stop_remaining_seconds"] = self._rng.uniform(4.0, 12.0)
            track["resume_v_north_mps"] = track["v_north_mps"]
            track["resume_v_east_mps"] = track["v_east_mps"]
            track["v_north_mps"] = 0.0
            track["v_east_mps"] = 0.0

    def tick(self, dt):
        with self._lock:
            expired_track_ids = []
            for track_id, track in self._tracks.items():
                self._tick_track(track, dt)
                if track["age_seconds"] >= track["ttl_seconds"]:
                    expired_track_ids.append(track_id)
                    continue

                if self._distance_from_center(track) > self._max_center_distance_m:
                    expired_track_ids.append(track_id)

            for track_id in expired_track_ids:
                self._tracks.pop(track_id, None)

            while len(self._tracks) < MIN_ACTIVE_OBJECTS:
                track = self._build_track()
                self._tracks[track["track_id"]] = track

            if len(self._tracks) < MAX_ACTIVE_OBJECTS and self._rng.random() < 0.15:
                track = self._build_track()
                self._tracks[track["track_id"]] = track

            now = time.time()
            if now - self._last_print_time >= 10:
                self._last_print_time = now
                moving_count = sum(1 for t in self._tracks.values() if t["state"] == "moving")
                stopped_count = len(self._tracks) - moving_count
                print(
                    "World tick | "
                    f"active_objects={len(self._tracks)} "
                    f"moving={moving_count} stopped={stopped_count}"
                )

    def visible_tracks_for_sensor(self, sensor):
        sensor_type = sensor.__class__.__name__.replace("Sensor", "").lower()
        fov_deg = self._fov_by_sensor_type.get(sensor_type, 120.0)

        visible = []
        with self._lock:
            for track in self._tracks.values():
                north_m, east_m = self._relative_offsets_m(
                    sensor.latitude,
                    sensor.longitude,
                    track["lat"],
                    track["lng"],
                )
                range_m = math.sqrt(north_m**2 + east_m**2)
                if range_m > max(sensor.coverage_radius_m, 1.0):
                    continue

                bearing_deg = (math.degrees(math.atan2(east_m, north_m)) + 360.0) % 360.0
                azimuth_deg = (bearing_deg - sensor.heading_deg + 180.0) % 360.0 - 180.0
                if abs(azimuth_deg) > (fov_deg / 2.0):
                    continue

                visible.append(dict(track))

        return visible


world = ObjectWorld()


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
        coverage_radius_m = float(sensor_payload.get("coverage_radius_m", 50.0))
    except (TypeError, ValueError):
        latitude = 0.0
        longitude = 0.0
        coverage_radius_m = 50.0

    if sensor_type == "radar":
        sensor = RadarSensor(sensor_id, latitude, longitude, coverage_radius_m)
        sensor.heading_deg = (sum(ord(ch) for ch in sensor_id) % 360)
        return sensor
    if sensor_type == "lidar":
        sensor = LidarSensor(sensor_id, latitude, longitude, coverage_radius_m)
        sensor.heading_deg = (sum(ord(ch) for ch in sensor_id) % 360)
        return sensor

    return None


def _refresh_sensor_coordinates(sensor, sensor_payload):
    try:
        sensor.latitude = float(sensor_payload.get("lat", sensor.latitude))
        sensor.longitude = float(sensor_payload.get("lng", sensor.longitude))
        sensor.coverage_radius_m = float(
            sensor_payload.get("coverage_radius_m", sensor.coverage_radius_m)
        )
    except (TypeError, ValueError):
        # Keep the last known coordinates if the backend payload is malformed.
        pass


def sensor_thread(sensor, stop_event):
    while not stop_event.is_set():
        client = None
        try:
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.settimeout(3)
            client.connect((HOST, PORT))

            while not stop_event.is_set():
                try:
                    visible_tracks = world.visible_tracks_for_sensor(sensor)

                    payloads = []
                    for track in visible_tracks:
                        data = sensor.generate_data(track)
                        if data is not None:
                            payloads.append(data)

                    if not payloads:
                        payloads.append(sensor.generate_data())

                    for payload in payloads:
                        client.sendall(json.dumps(payload).encode())

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
                    existing_stream = sensor_threads[sensor.sensor_id]
                    existing_sensor = existing_stream["sensor"]
                    _refresh_sensor_coordinates(existing_sensor, sensor_payload)
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
                    "sensor": sensor,
                }
                thread.start()
                new_streams += 1
                print(
                    f"Started stream for {sensor.sensor_id} "
                    f"({sensor.latitude}, {sensor.longitude})"
                )

        world.set_center_from_sensors(backend_sensors)

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


def world_thread(stop_event):
    while not stop_event.is_set():
        world.tick(WORLD_TICK_SECONDS)
        if stop_event.wait(WORLD_TICK_SECONDS):
            break


print(f"Fetching sensors from: {SENSOR_LIST_URL}")
print("Create sensors from frontend/admin; simulator will auto-start streams.")

world_stop_event = threading.Event()
threading.Thread(target=world_thread, args=(world_stop_event,), daemon=True).start()
threading.Thread(target=sync_sensors_from_backend, daemon=True).start()


while True:
    time.sleep(30)