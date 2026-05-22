import cv2
import os
import tempfile
import numpy as np
from datetime import datetime
from typing import List, Optional, Tuple

from app.ml.detector import detector
from app.ml.counter import counter
from app.models.detection import DetectionBox, DetectionResult, DetectionStats


def process_frame(frame_bytes: bytes, room_id: Optional[str] = None) -> DetectionResult:
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image data")

    result = detector.detect_frame(frame)
    detections = [
        DetectionBox(**d) for d in result["detections"]
    ]

    if room_id:
        counter.update(room_id, result["detections"])

    return DetectionResult(
        timestamp=datetime.now(),
        people_count=result["people_count"],
        detections=detections,
        room_id=room_id,
    )


def process_image_file(file_bytes: bytes, room_id: Optional[str] = None) -> Tuple[DetectionResult, Optional[bytes]]:
    nparr = np.frombuffer(file_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image file")

    result = detector.detect_frame(frame)
    detections = [
        DetectionBox(**d) for d in result["detections"]
    ]

    if room_id:
        counter.update(room_id, result["detections"])

    detection_result = DetectionResult(
        timestamp=datetime.now(),
        people_count=result["people_count"],
        detections=detections,
        room_id=room_id,
    )
    return detection_result, result["annotated_frame"]


def process_video_file(file_bytes: bytes, room_id: Optional[str] = None) -> Tuple[List[DetectionResult], DetectionStats]:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    tmp.write(file_bytes)
    tmp.close()

    cap = cv2.VideoCapture(tmp.name)
    results_list: List[DetectionResult] = []
    frame_count = 0
    total_detections = 0
    max_count = 0

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_interval = max(1, int(fps / 2))  # Process ~2 fps from video

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % frame_interval != 0:
                continue

            result = detector.detect_frame(frame)
            detections = [
                DetectionBox(**d) for d in result["detections"]
            ]

            if room_id:
                counter.update(room_id, result["detections"])

            detection_result = DetectionResult(
                timestamp=datetime.now(),
                people_count=result["people_count"],
                detections=detections,
                room_id=room_id,
            )
            results_list.append(detection_result)
            total_detections += result["people_count"]
            max_count = max(max_count, result["people_count"])
    finally:
        cap.release()
        os.unlink(tmp.name)

    processed_frames = len(results_list)
    stats = DetectionStats(
        total_frames=frame_count,
        total_detections=total_detections,
        avg_people_count=total_detections / processed_frames if processed_frames > 0 else 0,
        max_people_count=max_count,
        duration_seconds=frame_count / fps if fps > 0 else 0,
    )
    return results_list, stats
