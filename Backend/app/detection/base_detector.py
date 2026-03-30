import math
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class BaseDetector(ABC):
    DETECTION_THRESHOLD = 0.6

    def process(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._validate_payload_structure(payload)
        raw_detection = payload["raw_detection"]
        self._validate_numeric_fields(raw_detection)
        detected_objects = self.detect(raw_detection)
        return self._build_response(payload, detected_objects)

    @abstractmethod
    def detect(self, raw_detection: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError()

    def _validate_payload_structure(self, payload: dict[str, Any]) -> None:
        required_keys = {"sensor_id", "type", "timestamp", "raw_detection"}
        if not required_keys.issubset(payload.keys()):
            raise ValueError("Invalid payload structure: missing required fields")

        try:
            datetime.fromisoformat(str(payload["timestamp"]).replace("Z", "+00:00"))
        except Exception as exc:
            raise ValueError("Invalid timestamp format") from exc

    def _validate_numeric_fields(self, raw_detection: dict[str, Any]) -> None:
        for key, value in raw_detection.items():
            if isinstance(value, dict):
                self._validate_numeric_fields(value)
            elif isinstance(value, int | float):
                if not math.isfinite(value):
                    raise ValueError(f"Invalid numeric value for {key}")

    def _normalize_score(self, score: float) -> float:
        return max(0.0, min(score, 1.0))

    def _should_detect(self, score: float) -> bool:
        return score >= self.DETECTION_THRESHOLD

    def _build_response(
        self,
        payload: dict[str, Any],
        detected_objects: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "sensor_id": payload["sensor_id"],
            "sensor_type": str(payload["type"]).upper(),
            "timestamp": payload["timestamp"],
            "detected_objects": detected_objects,
        }
