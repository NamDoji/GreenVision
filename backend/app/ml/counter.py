from collections import defaultdict
from typing import Dict, List, Optional


class PeopleCounter:
    """Tracks people counts per room across frames using track IDs."""

    def __init__(self):
        self._active_tracks: Dict[str, set] = defaultdict(set)
        self._history: Dict[str, List[dict]] = defaultdict(list)

    def update(self, room_id: str, detections: List[dict]) -> dict:
        current_ids = set()
        for det in detections:
            tid = det.get("track_id")
            if tid is not None:
                current_ids.add(tid)

        self._active_tracks[room_id] = current_ids

        entry = {
            "people_count": len(current_ids),
            "track_ids": list(current_ids),
        }
        self._history[room_id].append(entry)

        # Keep last 1000 entries per room
        if len(self._history[room_id]) > 1000:
            self._history[room_id] = self._history[room_id][-1000:]

        return entry

    def get_count(self, room_id: str) -> int:
        return len(self._active_tracks.get(room_id, set()))

    def get_history(self, room_id: str, limit: int = 100) -> List[dict]:
        history = self._history.get(room_id, [])
        return history[-limit:]


counter = PeopleCounter()
