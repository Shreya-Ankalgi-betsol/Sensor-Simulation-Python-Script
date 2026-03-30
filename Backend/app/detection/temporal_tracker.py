from collections import defaultdict, deque
from typing import Any


class TemporalTracker:
    def __init__(self, history_size: int = 5, confirmation_threshold: int = 3):
        self.history_size = history_size
        self.confirmation_threshold = confirmation_threshold
        self.history = defaultdict(lambda: deque(maxlen=self.history_size))

    def update(self, sensor_id: str, detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        confirmed: list[dict[str, Any]] = []
        self.history[sensor_id].append(detections)

        type_counts = defaultdict(int)
        object_examples: dict[str, dict[str, Any]] = {}

        for frame in self.history[sensor_id]:
            for detected_object in frame:
                object_type = detected_object["type"]
                type_counts[object_type] += 1
                object_examples[object_type] = detected_object

        for object_type, count in type_counts.items():
            if count >= self.confirmation_threshold:
                confirmed.append(object_examples[object_type])

        return confirmed
