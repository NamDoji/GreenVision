import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.sensor_simulator import simulator

router = APIRouter(tags=["sensors"])


@router.websocket("/ws/sensors")
async def sensor_websocket(websocket: WebSocket):
    await websocket.accept()
    queue = simulator.subscribe()
    try:
        while True:
            reading = await queue.get()
            await websocket.send_text(json.dumps(reading))
    except WebSocketDisconnect:
        pass
    finally:
        simulator.unsubscribe(queue)
