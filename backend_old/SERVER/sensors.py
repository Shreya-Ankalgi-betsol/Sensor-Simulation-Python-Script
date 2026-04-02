import random
from datetime import datetime


# Base Sensor Class
class Sensor:
    def __init__(self, sensor_id, latitude, longitude):
        self.sensor_id = sensor_id
        self.latitude = latitude
        self.longitude = longitude

    def get_metadata(self):
        return {
            "sensor_id": self.sensor_id,
        }


# Radar Sensor Class
class RadarSensor(Sensor):
    def generate_data(self):
        # Most frames should look "normal" (non-threat), with occasional
        # threat-like bursts so detections are not constant.
        threat_mode = random.random() < 0.25

        if threat_mode:
            radial_velocity_mps = round(random.uniform(-30, 30), 2)
            rcs_dbsm = round(random.uniform(20, 45), 2)
            snr_db = round(random.uniform(12, 35), 2)
        else:
            radial_velocity_mps = round(random.uniform(-0.4, 0.4), 2)
            rcs_dbsm = round(random.uniform(0, 18), 2)
            snr_db = round(random.uniform(0, 12), 2)

        return {
            "sensor_id": self.sensor_id,
            "type": "radar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
                "lat": self.latitude,
                "lng": self.longitude,
            "raw_detection": {
                "range_m": round(random.uniform(1, 150), 2),
                "azimuth_deg": round(random.uniform(-60, 60), 2),
                "elevation_deg": round(random.uniform(-30, 30), 2),
                "radial_velocity_mps": radial_velocity_mps,
                "rcs_dbsm": rcs_dbsm, # Radar Cross Section (dBsm = decibels relative to 1 square meter)
                                                              #Meaning: How strongly the object reflects radar signal 
                "snr_db": snr_db, #Signal-to-Noise Ratio (decibels)
                                                            #Meaning: How clear the radar return is above background noise
            },
        }


# Lidar Sensor Class
class LidarSensor(Sensor):
    def generate_data(self):
        # Most frames should look "normal" (small cluster), with occasional
        # larger/dense objects to trigger detections.
        threat_mode = random.random() < 0.25

        if threat_mode:
            # Larger box (more likely to exceed large-volume threshold)
            x_min = round(random.uniform(-8, -1), 2)
            x_max = round(random.uniform(1, 8), 2)
            y_min = round(random.uniform(5, 10), 2)
            y_max = round(random.uniform(12, 20), 2)
            z_min = round(random.uniform(0, 0.5), 2)
            z_max = round(random.uniform(2, 4), 2)
            point_count = random.randint(160, 400)
            velocity_mps = round(random.uniform(-5, 5), 2)
            point_density_ppm2 = round(random.uniform(55, 120), 2)
        else:
            # Small, sparse box (usually below thresholds)
            x_min = round(random.uniform(-1.0, -0.2), 2)
            x_max = round(random.uniform(0.2, 1.0), 2)
            y_min = round(random.uniform(5, 6), 2)
            y_max = round(random.uniform(6.2, 7.5), 2)
            z_min = round(random.uniform(0, 0.2), 2)
            z_max = round(random.uniform(0.3, 1.2), 2)
            point_count = random.randint(5, 120)
            velocity_mps = round(random.uniform(-0.3, 0.3), 2)
            point_density_ppm2 = round(random.uniform(5, 45), 2)

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
                    "x": round((x_min + x_max) / 2, 2),
                    "y": round((y_min + y_max) / 2, 2),
                    "z": round((z_min + z_max) / 2, 2),
                },
                "point_count": point_count,
                "intensity_avg": round(random.uniform(150, 250), 2),
                "velocity_mps": velocity_mps,
                "aspect_ratio": round(random.uniform(1.0, 3.0), 2),
                "point_density_ppm2": point_density_ppm2,
            },
        }