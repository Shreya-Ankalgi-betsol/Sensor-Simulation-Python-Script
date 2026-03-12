# threat_detection/detectors/radar_detector.py

from typing import Dict, Any, List
from .base_detector import BaseDetector


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
        # Explicit configuration (no defaults)
        self.velocity_threshold = velocity_threshold
        self.fast_approach_threshold = fast_approach_threshold
        self.rcs_threshold = rcs_threshold
        self.strong_signal_threshold = strong_signal_threshold
        self.snr_noise_floor = snr_noise_floor
        self.stationary_velocity_epsilon = stationary_velocity_epsilon

    
    # Main Detection Logic
    
    def detect(self, raw: Dict[str, Any]) -> List[Dict[str, Any]]:

        self._validate_radar_physics(raw)

        velocity = raw["radial_velocity_mps"]
        rcs = raw["rcs_dbsm"]
        snr = raw["snr_db"]
        range_m = raw["range_m"]

        detections: List[Dict[str, Any]] = []

        
        # MOVING OBJECT
        
        score = 0.0

        if abs(velocity) > self.velocity_threshold:
            score += 0.4
        if rcs > self.rcs_threshold:
            score += 0.3
        if snr > self.strong_signal_threshold:
            score += 0.3

        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)

        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "RADAR_OBJECT_MOVING",
                    score,
                    {
                        "velocity": velocity,
                        "rcs": rcs,
                        "snr": snr,
                        "range": range_m,
                    },
                )
            )

        
        #  FAST APPROACHING OBJECT
        
        score = 0.0

        if velocity < -self.fast_approach_threshold:
            score += 0.5
        if snr > self.strong_signal_threshold:
            score += 0.3
        if rcs > self.rcs_threshold:
            score += 0.2

        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)

        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "RADAR_OBJECT_FAST_APPROACHING",
                    score,
                    {
                        "velocity": velocity,
                        "snr": snr,
                        "rcs": rcs,
                        "range": range_m,
                    },
                )
            )

       
        #  HIGH RCS OBJECT
        score = 0.0

        if rcs > self.rcs_threshold:
            score += 0.6
        if snr > self.strong_signal_threshold:
            score += 0.4

        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)

        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "RADAR_OBJECT_HIGH_RCS",
                    score,
                    {
                        "rcs": rcs,
                        "snr": snr,
                        "range": range_m,
                    },
                )
            )

        # STATIONARY LARGE OBJECT
        score = 0.0

        if abs(velocity) < self.stationary_velocity_epsilon:
            score += 0.4
        if rcs > self.rcs_threshold:
            score += 0.4
        if snr > self.strong_signal_threshold:
            score += 0.2

        score = self._apply_noise_penalty(score, snr)
        score = self._normalize_score(score)

        if self._should_detect(score):
            detections.append(
                self._build_object(
                    "RADAR_OBJECT_STATIONARY_LARGE",
                    score,
                    {
                        "velocity": velocity,
                        "rcs": rcs,
                        "snr": snr,
                        "range": range_m,
                    },
                )
            )

        return detections

    # Helper Methods

    def _apply_noise_penalty(self, score: float, snr: float) -> float:
        """
        Reduce confidence if signal-to-noise ratio is too low.
        """
        if snr < self.snr_noise_floor:
            return score * 0.7
        return score

    def _build_object(
        self,
        object_type: str,
        score: float,
        metadata: Dict[str, Any],
    ):
        return {
            "type": object_type,
            "confidence": score,
            "metadata": metadata,
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