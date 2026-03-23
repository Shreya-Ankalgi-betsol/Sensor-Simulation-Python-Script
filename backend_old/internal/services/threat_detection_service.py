# threat_detection/services/threat_detection_service.py

from typing import Dict, Any
from database import Database
from internal.detectors.radar_detector import RadarDetector
from internal.detectors.lidar_detector import LidarDetector
from internal.detectors.temporal_tracker import TemporalTracker


class ThreatDetectionService:
    """
    Main orchestration service for routing sensor data
    to appropriate detector and applying temporal filtering.
    """

    def __init__(self):

        self.db = Database()

        # Temporal confirmation layer
        self.temporal_tracker = TemporalTracker(
            history_size=1,
            confirmation_threshold=1,
        )

        # Initialize detectors
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

            # Step 1: Run detector
            result = detector.process(payload)

            detections = result["detected_objects"]

            # Step 2: Apply temporal confirmation
            confirmed_detections = self.temporal_tracker.update(
                payload["sensor_id"],
                detections,
            )

            # Store confirmed threats in database
            for obj in confirmed_detections:

                threat_event = {
                    "sensor_id": payload["sensor_id"],
                    "sensor_type": payload["type"],
                    "type": obj["type"],
                    "confidence": obj["confidence"],
                    "severity": obj.get("severity"),
                    "timestamp": payload["timestamp"]
                }

                self.db.insert_threat_event(threat_event)

            # Step 3: Replace detections with confirmed threats
            result["detected_objects"] = confirmed_detections

            self._log_detection(result)

            return result

        except Exception as e:
            return self._error_response(payload, str(e))

    # ------------------------------------
    # Logging & Error Handling
    # ------------------------------------

    def _log_detection(self, result: Dict[str, Any]) -> None:

        if result["detected_objects"]:
            print("CONFIRMED THREAT:", result)
        else:
            print("NO CONFIRMED THREAT:", result["sensor_id"])

    def _error_response(self, payload: Dict[str, Any], message: str) -> Dict[str, Any]:

        return {
            "sensor_id": payload.get("sensor_id"),
            "sensor_type": payload.get("type"),
            "timestamp": payload.get("timestamp"),
            "error": message,
            "detected_objects": [],
        }