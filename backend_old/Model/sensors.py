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
        return {
            "sensor_id": self.sensor_id,
            "type": "radar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "raw_detection": {
                "range_m": round(random.uniform(1, 150), 2),
                "azimuth_deg": round(random.uniform(-60, 60), 2),
                "elevation_deg": round(random.uniform(-30, 30), 2),
                "radial_velocity_mps": round(random.uniform(-30, 30), 2),
                "rcs_dbsm": round(random.uniform(15, 40), 2),
                "snr_db": round(random.uniform(10, 35), 2),
            },
        }


# Lidar Sensor Class
class LidarSensor(Sensor):
    def generate_data(self):
        # Generate bounding box
        x_min = round(random.uniform(-20, 0), 2)
        x_max = round(random.uniform(1, 20), 2)
        y_min = round(random.uniform(5, 15), 2)
        y_max = round(random.uniform(16, 30), 2)
        z_min = round(random.uniform(0, 1), 2)
        z_max = round(random.uniform(2, 5), 2)

        return {
            "sensor_id": self.sensor_id,
            "type": "lidar",
            "timestamp": datetime.utcnow().isoformat() + "Z",
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
                "point_count": random.randint(100, 300),
                "intensity_avg": round(random.uniform(150, 250), 2),
                "velocity_mps": round(random.uniform(-5, 5), 2),
                "aspect_ratio": round(random.uniform(1.0, 3.0), 2),
                "point_density_ppm2": round(random.uniform(30, 100), 2),
            },
        }