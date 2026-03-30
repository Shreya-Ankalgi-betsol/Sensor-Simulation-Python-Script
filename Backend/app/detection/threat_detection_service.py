from typing import Any

from app.detection.lidar_detector import LidarDetector
from app.detection.radar_detector import RadarDetector
from app.detection.temporal_tracker import TemporalTracker


class ThreatDetectionService:
    def __init__(self):
        self.temporal_tracker = TemporalTracker(
            history_size=1,
            confirmation_threshold=1,
        )
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

    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        sensor_type = payload.get("type")

        if sensor_type not in self.detectors:
            return self._error_response(payload, f"Unsupported sensor type: {sensor_type}")

        try:
            detector = self.detectors[sensor_type]
            result = detector.process(payload)

            detections = result["detected_objects"]
            confirmed_detections = self.temporal_tracker.update(payload["sensor_id"], detections)
            result["detected_objects"] = confirmed_detections

            return result
        except Exception as exc:
            return self._error_response(payload, str(exc))

    def _error_response(self, payload: dict[str, Any], message: str) -> dict[str, Any]:
        return {
            "sensor_id": payload.get("sensor_id"),
            "sensor_type": payload.get("type"),
            "timestamp": payload.get("timestamp"),
            "error": message,
            "detected_objects": [],
        }
