from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class DetectionBox(BaseModel):
    bbox: List[float]
    confidence: float
    class_name: str
    track_id: Optional[int] = None


class DetectionResult(BaseModel):
    timestamp: datetime
    people_count: int
    detections: List[DetectionBox]
    room_id: Optional[str] = None


class DetectionStats(BaseModel):
    total_frames: int
    total_detections: int
    avg_people_count: float
    max_people_count: int
    duration_seconds: float


# --- Sensor / Room schemas ---


class SensorReadingResponse(BaseModel):
    id: int
    room_id: int
    sensor_type: str
    value: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class RoomResponse(BaseModel):
    id: int
    name: str
    capacity: int
    floor: int
    building: str

    model_config = {"from_attributes": True}


class RoomDetailResponse(BaseModel):
    id: int
    name: str
    capacity: int
    floor: int
    building: str
    current_sensors: Optional[List[SensorReadingResponse]] = None

    model_config = {"from_attributes": True}
