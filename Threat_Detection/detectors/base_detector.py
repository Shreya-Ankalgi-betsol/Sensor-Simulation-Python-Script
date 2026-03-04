# threat_detection/detectors/base_detector.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List
import math
from datetime import datetime


class BaseDetector(ABC):
    """
    Abstract base class for all sensor detectors.
    Provides:
    - Schema validation
    - Numeric validation
    - Score normalization
    - Detection output formatting
    """

    DETECTION_THRESHOLD = 0.6  # Minimum score required to trigger detection

    def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for processing a sensor payload.
        """

        self._validate_payload_structure(payload)

        raw_detection = payload["raw_detection"]

        # Sanitize numeric values
        self._validate_numeric_fields(raw_detection)

        # Run detection logic
        detected_objects = self.detect(raw_detection)

        # Build structured response
        return self._build_response(payload, detected_objects)

    @abstractmethod
    def detect(self, raw_detection: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Implemented by subclasses.
        Returns list of detected objects.
        """
        pass

    # -------------------------
    # Common Utility Functions
    # -------------------------

    def _validate_payload_structure(self, payload: Dict[str, Any]) -> None:
        required_keys = {"sensor_id", "type", "timestamp", "raw_detection"}
        if not required_keys.issubset(payload.keys()):
            raise ValueError("Invalid payload structure: missing required fields")

        # Validate timestamp format
        try:
            datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))
        except Exception:
            raise ValueError("Invalid timestamp format")

    def _validate_numeric_fields(self, raw_detection: Dict[str, Any]) -> None:
        """
        Recursively validate numeric fields to ensure they are finite.
        """
        for key, value in raw_detection.items():
            if isinstance(value, dict):
                self._validate_numeric_fields(value)
            elif isinstance(value, (int, float)):
                if not math.isfinite(value):
                    raise ValueError(f"Invalid numeric value for {key}")

    def _normalize_score(self, score: float) -> float:
        """
        Ensures score is between 0 and 1.
        """
        return max(0.0, min(score, 1.0))

    def _should_detect(self, score: float) -> bool:
        return score >= self.DETECTION_THRESHOLD

    def _build_response(
        self,
        payload: Dict[str, Any],
        detected_objects: List[Dict[str, Any]],
    ) -> Dict[str, Any]:

        return {
            "sensor_id": payload["sensor_id"],
            "sensor_type": payload["type"],
            "timestamp": payload["timestamp"],
            "detected_objects": detected_objects,
        }