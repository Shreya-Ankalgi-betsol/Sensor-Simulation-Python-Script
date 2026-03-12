# threat_detection/main.py

from services.threat_detection_service import ThreatDetectionService


def simulate_stream():

    service = ThreatDetectionService()

    radar_payload = {
        "sensor_id": "radar-1",
        "type": "radar",
        "timestamp": "2026-02-25T12:05:00Z",
        "raw_detection": {
            "range_m": 25.5,
            "azimuth_deg": -15.2,
            "elevation_deg": 2.1,
            "radial_velocity_mps": -4.5,
            "rcs_dbsm": 28.5,
            "snr_db": 22.3,
        },
    }

    lidar_payload = {
        "sensor_id": "lidar-1",
        "type": "lidar",
        "timestamp": "2026-02-25T12:05:01Z",
        "raw_detection": {
            "bounding_box": {
                "x_min": -1.2,
                "y_min": 10.5,
                "z_min": 0.1,
                "x_max": 2.1,
                "y_max": 15.3,
                "z_max": 2.0,
            },
            "centroid": {"x": 0.45, "y": 12.9, "z": 0.95},
            "point_count": 156,
            "intensity_avg": 185.2,
            "velocity_mps": 0.8,
            "aspect_ratio": 1.94,
            "point_density_ppm2": 45.3,
        },
    }

    service.process(radar_payload)
    service.process(lidar_payload)


if __name__ == "__main__":
    simulate_stream()