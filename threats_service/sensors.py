import random
import math
from datetime import datetime


# Base Sensor Class
class Sensor:
    def __init__(self, sensor_id, latitude, longitude, coverage_radius_m=50.0):
        self.sensor_id = sensor_id
        self.latitude = latitude
        self.longitude = longitude
        self.coverage_radius_m = coverage_radius_m
        # 0 deg means facing geographic north.
        self.heading_deg = 0.0
        self._background_cluster = None

    def _effective_coverage_radius(self):
        return max(float(self.coverage_radius_m), 1.0)

    def _sample_clustered_background_polar(self, angular_spread_deg=12.0):
        """Sample a clustered random point constrained by configured coverage radius."""
        coverage_m = self._effective_coverage_radius()

        needs_new_cluster = (
            self._background_cluster is None
            or self._background_cluster["ttl"] <= 0
            or self._background_cluster["coverage_m"] != coverage_m
            or random.random() < 0.08
        )

        if needs_new_cluster:
            # sqrt keeps area distribution uniform across entire circle, including boundary zones.
            center_range_m = max(1.0, math.sqrt(random.random()) * coverage_m)
            center_azimuth_deg = random.uniform(-180.0, 180.0)
            cluster_radius_m = max(0.8, min(coverage_m * 0.08, 18.0))
            self._background_cluster = {
                "center_range_m": center_range_m,
                "center_azimuth_deg": center_azimuth_deg,
                "cluster_radius_m": cluster_radius_m,
                "coverage_m": coverage_m,
                "ttl": random.randint(6, 14),
            }

        cluster = self._background_cluster
        cluster["ttl"] -= 1

        cluster["center_range_m"] = min(
            coverage_m,
            max(
                1.0,
                cluster["center_range_m"]
                + random.uniform(-cluster["cluster_radius_m"] * 0.12, cluster["cluster_radius_m"] * 0.12),
            ),
        )
        cluster["center_azimuth_deg"] = (
            cluster["center_azimuth_deg"] + random.uniform(-2.5, 2.5) + 180.0
        ) % 360.0 - 180.0

        range_m = min(
            coverage_m,
            max(
                1.0,
                cluster["center_range_m"] + random.gauss(0.0, cluster["cluster_radius_m"] * 0.35),
            ),
        )
        azimuth_deg = (
            cluster["center_azimuth_deg"] + random.gauss(0.0, angular_spread_deg * 0.35) + 180.0
        ) % 360.0 - 180.0

        return round(range_m, 2), round(azimuth_deg, 2)

    def _meters_to_latlng(self, north_m, east_m):
        earth_radius_m = 6378137.0
        lat0_rad = math.radians(self.latitude)
        dlat_deg = math.degrees(north_m / earth_radius_m)
        dlng_deg = math.degrees(east_m / (earth_radius_m * max(math.cos(lat0_rad), 1e-8)))
        return self.latitude + dlat_deg, self.longitude + dlng_deg

    def _relative_offsets_m(self, object_lat, object_lng):
        earth_radius_m = 6378137.0
        lat0_rad = math.radians(self.latitude)
        dlat_rad = math.radians(object_lat - self.latitude)
        dlng_rad = math.radians(object_lng - self.longitude)

        north_m = dlat_rad * earth_radius_m
        east_m = dlng_rad * earth_radius_m * max(math.cos(lat0_rad), 1e-8)
        return north_m, east_m

    def _normalize_signed_angle(self, angle_deg):
        wrapped = (angle_deg + 180.0) % 360.0 - 180.0
        return wrapped

    def _destination_from_range_bearing(self, range_m, bearing_deg):
        """Approximate destination lat/lng for short distances around the sensor."""
        earth_radius_m = 6378137.0
        lat0_rad = math.radians(self.latitude)

        north_m = range_m * math.cos(math.radians(bearing_deg))
        east_m = range_m * math.sin(math.radians(bearing_deg))

        dlat_deg = math.degrees(north_m / earth_radius_m)
        dlng_deg = math.degrees(east_m / (earth_radius_m * max(math.cos(lat0_rad), 1e-8)))

        return round(self.latitude + dlat_deg, 7), round(self.longitude + dlng_deg, 7)

    def _compute_global_position(self, range_m, azimuth_deg):
        global_bearing_deg = (self.heading_deg + azimuth_deg) % 360
        object_lat, object_lng = self._destination_from_range_bearing(range_m, global_bearing_deg)
        return {
            "object_lat": object_lat,
            "object_lng": object_lng,
            "bearing_deg": round(global_bearing_deg, 2),
            "range_m": round(range_m, 2),
        }

    def _observation_from_track(self, track):
        north_m, east_m = self._relative_offsets_m(track["lat"], track["lng"])
        range_m = math.sqrt(north_m**2 + east_m**2)
        if range_m < 0.01:
            return None

        bearing_deg = (math.degrees(math.atan2(east_m, north_m)) + 360.0) % 360.0
        azimuth_deg = self._normalize_signed_angle(bearing_deg - self.heading_deg)

        if range_m > max(self.coverage_radius_m, 1.0):
            return None

        return {
            "range_m": range_m,
            "bearing_deg": bearing_deg,
            "azimuth_deg": azimuth_deg,
            "north_m": north_m,
            "east_m": east_m,
        }

    def get_metadata(self):
        return {
            "sensor_id": self.sensor_id,
        }


# Radar Sensor Class
class RadarSensor(Sensor):
    def generate_background_data(self):
        threat_mode = random.random() < 0.15

        if threat_mode:
            radial_velocity_mps = round(random.uniform(-30, 30), 2)
            rcs_dbsm = round(random.uniform(20, 45), 2)
            snr_db = round(random.uniform(12, 35), 2)
        else:
            radial_velocity_mps = round(random.uniform(-0.4, 0.4), 2)
            rcs_dbsm = round(random.uniform(0, 18), 2)
            snr_db = round(random.uniform(0, 12), 2)

        range_m, azimuth_deg = self._sample_clustered_background_polar(angular_spread_deg=14.0)
        derived_position = self._compute_global_position(range_m, azimuth_deg)

        return {
            "sensor_id": self.sensor_id,
            "type": "radar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "lat": self.latitude,
            "lng": self.longitude,
            "raw_detection": {
                "range_m": range_m,
                "azimuth_deg": azimuth_deg,
                "elevation_deg": round(random.uniform(-30, 30), 2),
                "radial_velocity_mps": radial_velocity_mps,
                "rcs_dbsm": rcs_dbsm,
                "snr_db": snr_db,
                "derived_position": derived_position,
            },
        }

    def generate_data(self, track=None):
        if track is None:
            return self.generate_background_data()

        observation = self._observation_from_track(track)
        if observation is None:
            return None

        range_m = round(observation["range_m"], 2)
        azimuth_deg = round(observation["azimuth_deg"], 2)
        elevation_deg = round(random.uniform(-3.0, 3.0), 2)

        unit_n = observation["north_m"] / observation["range_m"]
        unit_e = observation["east_m"] / observation["range_m"]
        radial_velocity_mps = round(track["v_north_mps"] * unit_n + track["v_east_mps"] * unit_e, 2)

        object_type = track.get("object_type", "unknown")
        if object_type == "drone":
            rcs_base, snr_base = 14.0, 12.0
        elif object_type == "vehicle":
            rcs_base, snr_base = 24.0, 14.0
        else:
            rcs_base, snr_base = 10.0, 10.0

        attenuation = max(0.4, 1.0 - (observation["range_m"] / max(self.coverage_radius_m, 1.0)) * 0.5)
        rcs_dbsm = round(max(-10.0, rcs_base * attenuation + random.uniform(-3.0, 3.0)), 2)
        snr_db = round(max(0.5, snr_base * attenuation + random.uniform(-2.0, 2.0)), 2)

        derived_position = {
            "object_lat": round(track["lat"], 7),
            "object_lng": round(track["lng"], 7),
            "bearing_deg": round(observation["bearing_deg"], 2),
            "range_m": range_m,
        }

        return {
            "sensor_id": self.sensor_id,
            "type": "radar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "lat": self.latitude,
            "lng": self.longitude,
            "raw_detection": {
                "track_id": track.get("track_id"),
                "object_type": object_type,
                "object_state": track.get("state", "moving"),
                "range_m": range_m,
                "azimuth_deg": azimuth_deg,
                "elevation_deg": elevation_deg,
                "radial_velocity_mps": radial_velocity_mps,
                "rcs_dbsm": rcs_dbsm,
                "snr_db": snr_db,
                "derived_position": derived_position,
            },
        }


# Lidar Sensor Class
class LidarSensor(Sensor):
    def generate_background_data(self):
        threat_mode = random.random() < 0.15

        range_m, azimuth_deg = self._sample_clustered_background_polar(angular_spread_deg=10.0)
        azimuth_rad = math.radians(azimuth_deg)
        centroid_x = round(range_m * math.sin(azimuth_rad), 2)
        centroid_y = round(range_m * math.cos(azimuth_rad), 2)

        if threat_mode:
            # Larger box (more likely to exceed large-volume threshold)
            width = random.uniform(1.5, 7.0)
            depth = random.uniform(1.5, 7.5)
            height = random.uniform(2.0, 4.0)
            z_min = round(random.uniform(0, 0.5), 2)
            z_max = round(z_min + height, 2)
            point_count = random.randint(160, 400)
            velocity_mps = round(random.uniform(-5, 5), 2)
            point_density_ppm2 = round(random.uniform(55, 120), 2)
        else:
            # Small, sparse box (usually below thresholds)
            width = random.uniform(0.4, 1.5)
            depth = random.uniform(0.6, 1.8)
            height = random.uniform(0.3, 1.2)
            z_min = round(random.uniform(0, 0.2), 2)
            z_max = round(z_min + height, 2)
            point_count = random.randint(5, 120)
            velocity_mps = round(random.uniform(-0.3, 0.3), 2)
            point_density_ppm2 = round(random.uniform(5, 45), 2)

        x_min = round(centroid_x - width / 2, 2)
        x_max = round(centroid_x + width / 2, 2)
        y_min = round(centroid_y - depth / 2, 2)
        y_max = round(centroid_y + depth / 2, 2)
        centroid_z = round((z_min + z_max) / 2, 2)
        derived_position = self._compute_global_position(range_m, azimuth_deg)

        return {
            "sensor_id": self.sensor_id,
            "type": "lidar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "lat": self.latitude,
            "lng": self.longitude,
            "raw_detection": {
                "bounding_box": {
                    "x_min": x_min,
                    "y_min": y_min,
                    "z_min": z_min,
                    "x_max": x_max,
                    "y_max": y_max,
                    "z_max": z_max,
                },
                "centroid": {
                    "x": centroid_x,
                    "y": centroid_y,
                    "z": centroid_z,
                },
                "point_count": point_count,
                "intensity_avg": round(random.uniform(150, 250), 2),
                "velocity_mps": velocity_mps,
                "aspect_ratio": round(random.uniform(1.0, 3.0), 2),
                "point_density_ppm2": point_density_ppm2,
                "derived_position": derived_position,
            },
        }

    def generate_data(self, track=None):
        if track is None:
            return self.generate_background_data()

        observation = self._observation_from_track(track)
        if observation is None:
            return None

        heading_rad = math.radians(self.heading_deg)
        north_m = observation["north_m"]
        east_m = observation["east_m"]

        centroid_y = north_m * math.cos(heading_rad) + east_m * math.sin(heading_rad)
        centroid_x = -north_m * math.sin(heading_rad) + east_m * math.cos(heading_rad)

        object_type = track.get("object_type", "unknown")
        if object_type == "drone":
            width, depth, height = 1.2, 1.2, 0.8
            point_count = random.randint(90, 220)
            base_density = 52.0
        elif object_type == "vehicle":
            width, depth, height = 2.8, 4.5, 2.0
            point_count = random.randint(180, 450)
            base_density = 70.0
        else:
            width, depth, height = 0.7, 0.7, 1.8
            point_count = random.randint(40, 180)
            base_density = 45.0

        width *= random.uniform(0.85, 1.15)
        depth *= random.uniform(0.85, 1.15)
        height *= random.uniform(0.9, 1.1)

        x_min = round(centroid_x - width / 2, 2)
        x_max = round(centroid_x + width / 2, 2)
        y_min = round(centroid_y - depth / 2, 2)
        y_max = round(centroid_y + depth / 2, 2)
        z_min = round(0.0, 2)
        z_max = round(height, 2)

        speed_mps = math.sqrt(track["v_north_mps"] ** 2 + track["v_east_mps"] ** 2)
        point_density_ppm2 = round(max(5.0, base_density + random.uniform(-8, 8)), 2)

        derived_position = {
            "object_lat": round(track["lat"], 7),
            "object_lng": round(track["lng"], 7),
            "bearing_deg": round(observation["bearing_deg"], 2),
            "range_m": round(observation["range_m"], 2),
        }

        return {
            "sensor_id": self.sensor_id,
            "type": "lidar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "lat": self.latitude,
            "lng": self.longitude,
            "raw_detection": {
                "track_id": track.get("track_id"),
                "object_type": object_type,
                "object_state": track.get("state", "moving"),
                "bounding_box": {
                    "x_min": x_min,
                    "y_min": y_min,
                    "z_min": z_min,
                    "x_max": x_max,
                    "y_max": y_max,
                    "z_max": z_max,
                },
                "centroid": {
                    "x": round(centroid_x, 2),
                    "y": round(centroid_y, 2),
                    "z": round((z_min + z_max) / 2, 2),
                },
                "point_count": point_count,
                "intensity_avg": round(random.uniform(150, 250), 2),
                "velocity_mps": round(speed_mps if track.get("state") == "moving" else 0.0, 2),
                "aspect_ratio": round(max(0.8, depth / max(width, 0.3)), 2),
                "point_density_ppm2": point_density_ppm2,
                "derived_position": derived_position,
            },
        }