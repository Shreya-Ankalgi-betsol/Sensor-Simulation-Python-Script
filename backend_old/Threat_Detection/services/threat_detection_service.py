# threat_detection/services/threat_detection_service.py

from typing import Dict, Any
from detectors.radar_detector import RadarDetector
from detectors.lidar_detector import LidarDetector


class ThreatDetectionService:
    """
    Main orchestration service for routing sensor data
    to appropriate detector.
    """

    def __init__(self):

        # Initialize detectors with configurable thresholds
        self.detectors = {
            "radar": RadarDetector(
                velocity_threshold=0.5,
                fast_approach_threshold=2.0,
                rcs_threshold=15.0,
                strong_signal_threshold=10.0,
                snr_noise_floor=3.0,
                stationary_velocity_epsilon=0.1,
            ),
            "lidar": LidarDetector(
                large_volume_threshold=5.0,
                dense_point_threshold=100,
                moving_velocity_threshold=0.5,
                tall_height_threshold=1.5,
                wide_width_threshold=2.0,
                high_density_threshold=40.0,
                min_point_count=10,
                velocity_noise_floor=0.1,
            ),
        }

    def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Entry point for processing sensor data.
        """

        sensor_type = payload.get("type")

        if sensor_type not in self.detectors:
            return self._error_response(
                payload,
                f"Unsupported sensor type: {sensor_type}",
            )

        try:
            detector = self.detectors[sensor_type]
            result = detector.process(payload)

            self._log_detection(result)

            return result

        except Exception as e:
            return self._error_response(payload, str(e))

    

    def _log_detection(self, result: Dict[str, Any]) -> None:
        """
        Simple console logging for now.
        Can later be replaced with structured logging / Kafka publisher.
        """
        if result["detected_objects"]:
            print("DETECTION:", result)
        else:
            print("NO THREAT:", result["sensor_id"])

    def _error_response(self, payload: Dict[str, Any], message: str) -> Dict[str, Any]:

        return {
            "sensor_id": payload.get("sensor_id"),
            "sensor_type": payload.get("type"),
            "timestamp": payload.get("timestamp"),
            "error": message,
            "detected_objects": [],
        }