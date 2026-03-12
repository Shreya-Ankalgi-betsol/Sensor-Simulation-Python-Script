# threat_detection/detectors/radar_detector.py

from typing import Dict, Any, List
from .base_detector import BaseDetector
from .severity_engine import SeverityEngine


class RadarDetector(BaseDetector):

    def __init__(
        self,
        velocity_threshold: float = 1.0,
        fast_approach_threshold: float = 3.0,
        rcs_threshold: float = 20.0,
        strong_signal_threshold: float = 15.0,
        snr_noise_floor: float = 5.0,
        stationary_velocity_epsilon: float = 0.2,
    ):
        self.velocity_threshold = velocity_threshold
        self.severity_engine = SeverityEngine()
        self.fast_approach_threshold = fast_approach_threshold
        self.rcs_threshold = rcs_threshold
        self.strong_signal_threshold = strong_signal_threshold
        self.snr_noise_floor = snr_noise_floor
        self.stationary_velocity_epsilon = stationary_velocity_epsilon

    def detect(self, raw_detection: Dict[str, Any]) -> List[Dict[str, Any]]:

        self._validate_radar_physics(raw_detection)

        velocity = raw_detection["radial_velocity_mps"]
        rcs = raw_detection["rcs_dbsm"]
        snr = raw_detection["snr_db"]
        range_m = raw_detection["range_m"]

        detections = []

        # ------------------------
        # 1️⃣ MOVING OBJECT
        # ------------------------
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
                self._build_object(
                    "RADAR_OBJECT_MOVING", score, velocity, rcs, range_m
                )
            )

        # ------------------------
        # 2️⃣ FAST APPROACHING OBJECT
        # ------------------------
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
                self._build_object(
                    "RADAR_OBJECT_FAST_APPROACHING",
                    score,
                    velocity,
                    rcs,
                    range_m,
                )
            )

        # ------------------------
        # 3️⃣ HIGH RCS OBJECT
        # ------------------------
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
                self._build_object(
                    "RADAR_OBJECT_HIGH_RCS",
                    score,
                    velocity,
                    rcs,
                    range_m,
                )
            )

        # ------------------------
        # 4️⃣ STATIONARY LARGE OBJECT
        # ------------------------
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
                self._build_object(
                    "RADAR_OBJECT_STATIONARY_LARGE",
                    score,
                    velocity,
                    rcs,
                    range_m,
                )
            )

        return detections

    # ------------------------------------
    # Distance Risk Model (NEW)
    # ------------------------------------

    def _distance_risk(self, range_m: float) -> float:
        """
        Adds risk weight based on object distance.
        Closer objects increase detection confidence.
        """

        if range_m < 5:
            return 0.4
        elif range_m < 10:
            return 0.3
        elif range_m < 20:
            return 0.2
        elif range_m < 50:
            return 0.1
        return 0.0

    # ------------------------------------
    # Helper Methods
    # ------------------------------------

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
    ):
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

    def _validate_radar_physics(self, raw: Dict[str, Any]):

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