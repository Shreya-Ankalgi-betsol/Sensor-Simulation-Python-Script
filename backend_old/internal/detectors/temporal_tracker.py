# threat_detection/temporal_tracker.py

from collections import defaultdict, deque
from typing import Dict, Any, List


class TemporalTracker:
    """
    Tracks detections across frames to confirm persistent threats.
    """

    def __init__(self, history_size: int = 5, confirmation_threshold: int = 3):
        self.history_size = history_size
        self.confirmation_threshold = confirmation_threshold

        # sensor_id → history of detections
        self.history = defaultdict(lambda: deque(maxlen=self.history_size))

    def update(self, sensor_id: str, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Update detection history and return confirmed threats.
        """

        confirmed = []

        # Store current detections
        self.history[sensor_id].append(detections)

        # Count detections across history
        type_counts = defaultdict(int)
        object_examples = {}

        for frame in self.history[sensor_id]:
            for obj in frame:
                obj_type = obj["type"]
                type_counts[obj_type] += 1
                object_examples[obj_type] = obj

        # Confirm threats appearing multiple times
        for obj_type, count in type_counts.items():

            if count >= self.confirmation_threshold:
                confirmed.append(object_examples[obj_type])

        return confirmed