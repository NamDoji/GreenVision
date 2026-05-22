import base64
import json
from fastapi import APIRouter, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from typing import Optional

from app.models.detection import DetectionResult, DetectionStats
from app.services.detection_service import process_image_file, process_video_file, process_frame

router = APIRouter(prefix="/api/v1/detect", tags=["detection"])


@router.post("/image", response_model=DetectionResult)
async def detect_image(
    file: UploadFile = File(...),
    room_id: Optional[str] = Form(None),
):
    file_bytes = await file.read()
    result, annotated = process_image_file(file_bytes, room_id)

    # Include annotated image as base64 in response
    response = result.model_dump()
    if annotated:
        response["annotated_image"] = base64.b64encode(annotated).decode("utf-8")
    return response


@router.post("/video")
async def detect_video(
    file: UploadFile = File(...),
    room_id: Optional[str] = Form(None),
):
    file_bytes = await file.read()
    results, stats = process_video_file(file_bytes, room_id)
    return {
        "results": [r.model_dump() for r in results],
        "stats": stats.model_dump(),
    }


@router.websocket("/live")
async def detect_live(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive JPEG frame bytes from client
            data = await websocket.receive_bytes()

            try:
                result = process_frame(data)
                response = result.model_dump()
                response["timestamp"] = response["timestamp"].isoformat()
                await websocket.send_json(response)
            except ValueError:
                await websocket.send_json({"error": "invalid frame"})
    except WebSocketDisconnect:
        pass
