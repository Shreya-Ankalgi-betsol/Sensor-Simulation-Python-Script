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
            "latitude": self.latitude,
            "longitude": self.longitude
        }


# Radar Sensor Class
class RadarSensor(Sensor):
    def generate_data(self):
        return {
            **self.get_metadata(),
            "sensor_type": "RADAR",
            "range_m": round(random.uniform(1, 150), 2),
            "angle_deg": round(random.uniform(-60, 60), 2),
            "velocity_mps": round(random.uniform(-30, 30), 2),
            "signal_strength": round(random.uniform(0.1, 1.0), 2),
            "gpu_usage_percent": round(random.uniform(10, 90), 2),
            "timestamp": datetime.utcnow().isoformat()
        }


# Lidar Sensor Class
class LidarSensor(Sensor):
    def generate_data(self):
        points = []

        for _ in range(20):
            points.append({
                "x": round(random.uniform(-20, 20), 2),
                "y": round(random.uniform(-20, 20), 2),
                "z": round(random.uniform(0, 5), 2),
                "intensity": round(random.uniform(0.1, 1.0), 2)
            })

        return {
            **self.get_metadata(),
            "sensor_type": "LIDAR",
            "points": points,
            "gpu_usage_percent": round(random.uniform(10, 90), 2),
            "timestamp": datetime.utcnow().isoformat()
        }