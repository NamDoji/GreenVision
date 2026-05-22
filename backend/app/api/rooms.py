from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.room import Room
from app.models.sensor_reading import SensorReading
from app.models.detection import SensorReadingResponse, RoomResponse, RoomDetailResponse

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])


@router.get("", response_model=List[RoomResponse])
async def list_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room))
    return result.scalars().all()


@router.get("/{room_id}", response_model=RoomDetailResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    room = await db.get(Room, room_id)
    if not room:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Room not found")

    # Get latest reading per sensor type
    latest = {}
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.room_id == room_id)
        .order_by(SensorReading.timestamp.desc())
    )
    for reading in result.scalars().all():
        if reading.sensor_type not in latest:
            latest[reading.sensor_type] = reading

    return RoomDetailResponse(
        id=room.id,
        name=room.name,
        capacity=room.capacity,
        floor=room.floor,
        building=room.building,
        current_sensors=list(latest.values()),
    )


@router.get("/{room_id}/sensors", response_model=List[SensorReadingResponse])
async def get_room_sensors(
    room_id: int,
    sensor_type: Optional[str] = None,
    hours: int = Query(default=1, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    query = (
        select(SensorReading)
        .where(SensorReading.room_id == room_id, SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp.desc())
    )
    if sensor_type:
        query = query.where(SensorReading.sensor_type == sensor_type)

    result = await db.execute(query)
    return result.scalars().all()
