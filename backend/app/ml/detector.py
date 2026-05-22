import cv2
import numpy as np
from typing import Dict, List, Optional
from ultralytics import YOLO
from app.config import settings


class YOLODetector:
    def __init__(self):
        self.model: Optional[YOLO] = None
        self._loaded = False

    def load_model(self) -> None:
        if self._loaded:
            return
        self.model = YOLO(settings.YOLO_MODEL)
        self._loaded = True

    def detect_frame(self, frame: np.ndarray) -> dict:
        if not self._loaded:
            self.load_model()

        results = self.model.track(
            frame,
            conf=settings.YOLO_CONFIDENCE,
            device=settings.YOLO_DEVICE,
            classes=[0],  # person class only
            persist=True,
            verbose=False,
        )

        detections = []
        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None and len(result.boxes) > 0:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    confidence = float(box.conf[0])
                    track_id = int(box.id[0]) if box.id is not None else None
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": confidence,
                        "class_name": "person",
                        "track_id": track_id,
                    })

        annotated_frame = None
        if results and len(results) > 0:
            annotated = results[0].plot()
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            annotated_frame = buffer.tobytes()

        return {
            "people_count": len(detections),
            "detections": detections,
            "annotated_frame": annotated_frame,
        }


detector = YOLODetector()
