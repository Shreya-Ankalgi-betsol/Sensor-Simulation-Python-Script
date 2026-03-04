# dummy_sensor_stream.py

import random
import time
from datetime import datetime

from services.threat_detection_service import ThreatDetectionService


service = ThreatDetectionService()


def generate_radar_payload():

    return {
        "sensor_id": "radar-1",
        "type": "radar",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "raw_detection": {
            "range_m": random.uniform(1, 100),
            "azimuth_deg": random.uniform(-45, 45),
            "elevation_deg": random.uniform(-5, 5),
            "radial_velocity_mps": random.uniform(-6, 6),
            "rcs_dbsm": random.uniform(5, 40),
            "snr_db": random.uniform(1, 30),
        },
    }


def generate_lidar_payload():

    x_min = random.uniform(-2, 0)
    x_max = x_min + random.uniform(0.5, 4)

    y_min = random.uniform(5, 10)
    y_max = y_min + random.uniform(0.5, 6)

    z_min = 0.0
    z_max = random.uniform(0.5, 3)

    return {
        "sensor_id": "lidar-1",
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
            "centroid": {"x": 0.0, "y": 0.0, "z": 0.0},
            "point_count": random.randint(5, 200),
            "intensity_avg": random.uniform(50, 200),
            "velocity_mps": random.uniform(-2, 2),
            "aspect_ratio": random.uniform(1, 3),
            "point_density_ppm2": random.uniform(10, 80),
        },
    }


def simulate_stream():

    print("Starting dummy sensor stream...\n")

    while True:

        # Randomly choose sensor type
        if random.choice(["radar", "lidar"]) == "radar":
            payload = generate_radar_payload()
        else:
            payload = generate_lidar_payload()

        result = service.process(payload)

        print("OUTPUT:", result)
        print("-" * 80)

        time.sleep(5)  # simulate 1 Hz sensor


if __name__ == "__main__":
    simulate_stream()