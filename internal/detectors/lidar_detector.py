# threat_detection/detectors/lidar_detector.py

from typing import Dict, Any, List
from .base_detector import BaseDetector
from .severity_engine import SeverityEngine


class LidarDetector(BaseDetector):

    def __init__(
        self,
        large_volume_threshold: float = 5.0,
        dense_point_threshold: int = 100,
        moving_velocity_threshold: float = 0.5,
        tall_height_threshold: float = 1.5,
        wide_width_threshold: float = 2.0,
        high_density_threshold: float = 40.0,
        min_point_count: int = 10,
        velocity_noise_floor: float = 0.1,
    ):
        self.large_volume_threshold = large_volume_threshold
        self.dense_point_threshold = dense_point_threshold
        self.moving_velocity_threshold = moving_velocity_threshold
        self.tall_height_threshold = tall_height_threshold
        self.wide_width_threshold = wide_width_threshold
        self.high_density_threshold = high_density_threshold
        self.min_point_count = min_point_count
        self.velocity_noise_floor = velocity_noise_floor
        self.severity_engine = SeverityEngine()

    def detect(self, raw: Dict[str, Any]) -> List[Dict[str, Any]]:

        self._validate_lidar_physics(raw)

        bbox = raw["bounding_box"]

        width = bbox["x_max"] - bbox["x_min"]
        depth = bbox["y_max"] - bbox["y_min"]
        height = bbox["z_max"] - bbox["z_min"]
        volume = width * depth * height

        point_count = raw["point_count"]
        density = raw["point_density_ppm2"]
        velocity = raw["velocity_mps"]

        detections = []

        # Reject low-point noise clusters
        if point_count < self.min_point_count:
            return detections

        # ------------------------
        # 1️⃣ LARGE OBJECT
        # ------------------------
        score = 0.0

        if volume > self.large_volume_threshold:
            score += 0.5
        if point_count > self.dense_point_threshold:
            score += 0.3
        if density > self.high_density_threshold:
            score += 0.2

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_LARGE", score, volume, point_count, velocity)
            )

        # ------------------------
        # 2️⃣ DENSE OBJECT
        # ------------------------
        score = 0.0

        if point_count > self.dense_point_threshold:
            score += 0.5
        if density > self.high_density_threshold:
            score += 0.3
        if volume > (self.large_volume_threshold * 0.5):
            score += 0.2

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_DENSE", score, volume, point_count, velocity)
            )

        # ------------------------
        # 3️⃣ MOVING OBJECT
        # ------------------------
        score = 0.0

        if abs(velocity) > self.moving_velocity_threshold:
            score += 0.5
        if point_count > self.dense_point_threshold:
            score += 0.3
        if density > self.high_density_threshold:
            score += 0.2

        # Damp small velocities
        if abs(velocity) < self.velocity_noise_floor:
            score *= 0.7

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_MOVING", score, volume, point_count, velocity)
            )

        # ------------------------
        # 4️⃣ TALL OBJECT
        # ------------------------
        score = 0.0

        if height > self.tall_height_threshold:
            score += 0.6
        if volume > (self.large_volume_threshold * 0.5):
            score += 0.4

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_TALL", score, volume, point_count, velocity)
            )

        # ------------------------
        # 5️⃣ WIDE OBJECT
        # ------------------------
        score = 0.0

        if width > self.wide_width_threshold:
            score += 0.6
        if point_count > self.dense_point_threshold:
            score += 0.4

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_WIDE", score, volume, point_count, velocity)
            )

        # ------------------------
        # 6️⃣ HIGH POINT DENSITY
        # ------------------------
        score = 0.0

        if density > self.high_density_threshold:
            score += 0.7
        if point_count > self.dense_point_threshold:
            score += 0.3

        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("LIDAR_OBJECT_HIGH_POINT_DENSITY", score, volume, point_count, velocity)
            )

        return detections

    # ------------------------------------
    # Helper Methods
    # ------------------------------------

    def _build_object(self, object_type: str, score: float, volume: float, point_count: int, velocity: float):
        severity = self.severity_engine.classify(confidence=score, velocity=velocity)
        return {
            "type": object_type,
            "confidence": score,
            "severity": severity,
            "metadata": {
                "volume": volume,
                "point_count": point_count,
                "velocity_mps": velocity,
            },
        }

    def _validate_lidar_physics(self, raw: Dict[str, Any]):

        bbox = raw["bounding_box"]

        if not (bbox["x_min"] < bbox["x_max"]):
            raise ValueError("Invalid LiDAR bounding box (x)")
        if not (bbox["y_min"] < bbox["y_max"]):
            raise ValueError("Invalid LiDAR bounding box (y)")
        if not (bbox["z_min"] < bbox["z_max"]):
            raise ValueError("Invalid LiDAR bounding box (z)")

        if raw["point_count"] < 0:
            raise ValueError("Invalid LiDAR point count")

        if raw["point_density_ppm2"] < 0:
            raise ValueError("Invalid LiDAR density")

        if not (-50 <= raw["velocity_mps"] <= 50):
            raise ValueError("Invalid LiDAR velocity")