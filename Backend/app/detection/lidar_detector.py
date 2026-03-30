from typing import Any

from app.detection.base_detector import BaseDetector


class LidarDetector(BaseDetector):
    def __init__(
        self,
        large_volume_threshold: float,
        dense_point_threshold: int,
        moving_velocity_threshold: float,
        tall_height_threshold: float,
        wide_width_threshold: float,
        high_density_threshold: float,
        min_point_count: int,
        velocity_noise_floor: float,
    ):
        self.large_volume_threshold = large_volume_threshold
        self.dense_point_threshold = dense_point_threshold
        self.moving_velocity_threshold = moving_velocity_threshold
        self.tall_height_threshold = tall_height_threshold
        self.wide_width_threshold = wide_width_threshold
        self.high_density_threshold = high_density_threshold
        self.min_point_count = min_point_count
        self.velocity_noise_floor = velocity_noise_floor

    def detect(self, raw: dict[str, Any]) -> list[dict[str, Any]]:
        self._validate_lidar_physics(raw)

        bbox = raw["bounding_box"]

        width = bbox["x_max"] - bbox["x_min"]
        depth = bbox["y_max"] - bbox["y_min"]
        height = bbox["z_max"] - bbox["z_min"]
        volume = width * depth * height

        point_count = raw["point_count"]
        density = raw["point_density_ppm2"]
        velocity = raw["velocity_mps"]

        detections: list[dict[str, Any]] = []

        if point_count < self.min_point_count:
            return detections

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
                self._build_object(
                    "LIDAR_OBJECT_LARGE",
                    score,
                    {"volume": volume, "point_count": point_count, "density": density},
                )
            )

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
                self._build_object(
                    "LIDAR_OBJECT_DENSE",
                    score,
                    {"point_count": point_count, "density": density, "volume": volume},
                )
            )

        score = 0.0
        if abs(velocity) > self.moving_velocity_threshold:
            score += 0.5
        if point_count > self.dense_point_threshold:
            score += 0.3
        if density > self.high_density_threshold:
            score += 0.2
        if abs(velocity) < self.velocity_noise_floor:
            score *= 0.7
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "LIDAR_OBJECT_MOVING",
                    score,
                    {"velocity": velocity, "point_count": point_count, "density": density},
                )
            )

        score = 0.0
        if height > self.tall_height_threshold:
            score += 0.6
        if volume > (self.large_volume_threshold * 0.5):
            score += 0.4
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "LIDAR_OBJECT_TALL",
                    score,
                    {"height": height, "volume": volume},
                )
            )

        score = 0.0
        if width > self.wide_width_threshold:
            score += 0.6
        if point_count > self.dense_point_threshold:
            score += 0.4
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "LIDAR_OBJECT_WIDE",
                    score,
                    {"width": width, "volume": volume},
                )
            )

        score = 0.0
        if density > self.high_density_threshold:
            score += 0.7
        if point_count > self.dense_point_threshold:
            score += 0.3
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "LIDAR_OBJECT_HIGH_POINT_DENSITY",
                    score,
                    {"density": density, "point_count": point_count},
                )
            )

        return detections

    def _build_object(self, object_type: str, score: float, metadata: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": object_type,
            "confidence": score,
            "metadata": metadata,
        }

    def _validate_lidar_physics(self, raw: dict[str, Any]) -> None:
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
