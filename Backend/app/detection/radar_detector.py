from typing import Any

from app.detection.base_detector import BaseDetector
from app.detection.severity_engine import SeverityEngine


class RadarDetector(BaseDetector):
    def __init__(
        self,
        velocity_threshold: float,
        fast_approach_threshold: float,
        rcs_threshold: float,
        strong_signal_threshold: float,
        snr_noise_floor: float,
        stationary_velocity_epsilon: float,
    ):
        self.velocity_threshold = velocity_threshold
        self.severity_engine = SeverityEngine()
        self.fast_approach_threshold = fast_approach_threshold
        self.rcs_threshold = rcs_threshold
        self.strong_signal_threshold = strong_signal_threshold
        self.snr_noise_floor = snr_noise_floor
        self.stationary_velocity_epsilon = stationary_velocity_epsilon

    def detect(self, raw: dict[str, Any]) -> list[dict[str, Any]]:
        self._validate_radar_physics(raw)

        velocity = raw["radial_velocity_mps"]
        rcs = raw["rcs_dbsm"]
        snr = raw["snr_db"]
        range_m = raw["range_m"]

        detections: list[dict[str, Any]] = []

        score = 0.0
        if abs(velocity) > self.velocity_threshold:
            score += 0.3
        if rcs > self.rcs_threshold:
            score += 0.2
        if snr > self.strong_signal_threshold:
            score += 0.2
        score += self._distance_risk(range_m)
        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("RADAR_OBJECT_MOVING", score, velocity, rcs, range_m)
            )

        score = 0.0
        if velocity < -self.fast_approach_threshold:
            score += 0.4
        if snr > self.strong_signal_threshold:
            score += 0.2
        if rcs > self.rcs_threshold:
            score += 0.2
        score += self._distance_risk(range_m)
        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("RADAR_OBJECT_FAST_APPROACHING", score, velocity, rcs, range_m)
            )

        score = 0.0
        if rcs > self.rcs_threshold:
            score += 0.5
        if snr > self.strong_signal_threshold:
            score += 0.2
        score += self._distance_risk(range_m)
        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("RADAR_OBJECT_HIGH_RCS", score, velocity, rcs, range_m)
            )

        score = 0.0
        if abs(velocity) < self.stationary_velocity_epsilon:
            score += 0.3
        if rcs > self.rcs_threshold:
            score += 0.3
        if snr > self.strong_signal_threshold:
            score += 0.1
        score += self._distance_risk(range_m)
        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)
        if self._should_detect(score):
            detections.append(
                self._build_object("RADAR_OBJECT_STATIONARY_LARGE", score, velocity, rcs, range_m)
            )

        return detections

    def _distance_risk(self, range_m: float) -> float:
        if range_m < 5:
            return 0.4
        if range_m < 10:
            return 0.3
        if range_m < 20:
            return 0.2
        if range_m < 50:
            return 0.1
        return 0.0

    def _apply_noise_penalty(self, score: float, snr: float) -> float:
        if snr < self.snr_noise_floor:
            return score * 0.7
        return score

    def _build_object(
        self,
        object_type: str,
        score: float,
        velocity: float,
        rcs: float,
        range_m: float,
    ) -> dict[str, Any]:
        severity = self.severity_engine.classify(
            confidence=score,
            distance=range_m,
            velocity=velocity,
        )
        return {
            "type": object_type,
            "confidence": score,
            "severity": severity,
            "metadata": {
                "velocity": velocity,
                "rcs": rcs,
                "range_m": range_m,
            },
        }

    def _validate_radar_physics(self, raw: dict[str, Any]) -> None:
        if not (0 < raw["range_m"] < 1000):
            raise ValueError("Invalid radar range")
        if not (-180 <= raw["azimuth_deg"] <= 180):
            raise ValueError("Invalid radar azimuth")
        if not (-90 <= raw["elevation_deg"] <= 90):
            raise ValueError("Invalid radar elevation")
        if not (-100 <= raw["radial_velocity_mps"] <= 100):
            raise ValueError("Invalid radar velocity")
        if raw["rcs_dbsm"] < -50:
            raise ValueError("Invalid radar RCS")
        if raw["snr_db"] < 0:
            raise ValueError("Invalid radar SNR")
