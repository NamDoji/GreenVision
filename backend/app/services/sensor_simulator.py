import asyncio
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select

from app.models.database import async_session
from app.models.room import Room
from app.models.sensor_reading import SensorReading

# Occupancy schedule: {room_id: [(start_hour, end_hour, min_people, max_people), ...]}
OCCUPANCY_SCHEDULES = {
    # Classroom A: 8-10 busy, 10-12 EMPTY (lights stay on = waste), 14-16 busy
    1: [(8, 10, 25, 35), (10, 12, 0, 0), (14, 16, 20, 30)],
    # Classroom B: 9-11 busy, 13-15 busy
    2: [(9, 11, 15, 25), (13, 15, 10, 20)],
    # Computer Lab: 9-17 busy, 17-20 half
    3: [(9, 17, 15, 25), (17, 20, 5, 12)],
    # Library: 8-22 moderate, 22-8 minimal
    4: [(8, 22, 15, 40), (22, 24, 2, 5), (0, 8, 1, 4)],
}

# Room-specific baselines
ROOM_BASELINES = {
    1: {"power_base": 200, "power_per_person": 80},   # Classroom
    2: {"power_base": 200, "power_per_person": 80},   # Classroom
    3: {"power_base": 2500, "power_per_person": 100},  # Computer Lab (PCs always on)
    4: {"power_base": 300, "power_per_person": 50},    # Library
}


def get_occupancy(room_id: int, hour: int) -> int:
    """Get simulated occupancy for a room at given hour."""
    schedule = OCCUPANCY_SCHEDULES.get(room_id, [])
    for start_h, end_h, min_p, max_p in schedule:
        if start_h <= hour < end_h:
            if min_p == 0 and max_p == 0:
                return 0
            return random.randint(min_p, max_p)
    return 0


class SensorSimulator:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._subscribers: List[asyncio.Queue] = []
        self._room_cache: Dict[int, dict] = {}  # room_id -> last sensor state

    def subscribe(self) -> asyncio.Queue:
        """Subscribe to live sensor readings."""
        q = asyncio.Queue()
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.remove(q)

    async def start(self):
        if self._task is None or self._task.done():
            self._running = True
            self._task = asyncio.create_task(self._run())

    async def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self):
        """Main simulation loop: generate readings every 5 seconds."""
        while self._running:
            try:
                readings = await self._generate_readings()
                for reading in readings:
                    for q in self._subscribers:
                        try:
                            q.put_nowait({
                                "id": reading.id,
                                "room_id": reading.room_id,
                                "sensor_type": reading.sensor_type,
                                "value": reading.value,
                                "timestamp": reading.timestamp.isoformat(),
                            })
                        except asyncio.QueueFull:
                            pass
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Sensor simulator error: {e}")
                await asyncio.sleep(5)

    async def _generate_readings(self) -> List[SensorReading]:
        """Generate one batch of sensor readings for all rooms."""
        now = datetime.utcnow()
        hour = now.hour
        readings = []

        async with async_session() as session:
            result = await session.execute(select(Room))
            rooms = result.scalars().all()

            for room in rooms:
                occupancy = get_occupancy(room.id, hour)
                baselines = ROOM_BASELINES.get(room.id, {"power_base": 200, "power_per_person": 80})

                # Update room state
                prev = self._room_cache.get(room.id, {})
                prev_occupancy = prev.get("occupancy", 0)
                prev_temp = prev.get("temperature", 22.0)

                # Temperature: drifts toward target based on occupancy
                target_temp = 22.0 + occupancy * 0.15 + random.uniform(-0.3, 0.3)
                temperature = prev_temp + (target_temp - prev_temp) * 0.1
                temperature = max(18.0, min(30.0, temperature))

                # Motion: 1 if occupied, small chance if recently occupied
                if occupancy > 0:
                    motion = 1.0
                elif prev_occupancy > 0 and random.random() < 0.3:
                    motion = 1.0
                else:
                    motion = 0.0

                # Light: on when occupied, stays on for waste demo (Classroom A 10-12)
                if occupancy > 0:
                    light = random.uniform(400, 800)
                elif room.id == 1 and 10 <= hour < 12:
                    light = random.uniform(400, 700)  # ENERGY WASTE: lights on, room empty
                else:
                    light = 0.0

                # Power: baseline + per-person + noise
                power = baselines["power_base"] + occupancy * baselines["power_per_person"]
                power += random.uniform(-20, 20)
                # Classroom A waste: lights + AC still on when empty
                if room.id == 1 and 10 <= hour < 12:
                    power = baselines["power_base"] * 0.7 + random.uniform(-10, 10)
                power = max(0, power)

                # Cache state
                self._room_cache[room.id] = {
                    "occupancy": occupancy,
                    "temperature": temperature,
                }

                # Create sensor reading records
                for sensor_type, value in [
                    ("motion", motion),
                    ("temperature", round(temperature, 1)),
                    ("light", round(light, 1)),
                    ("power", round(power, 1)),
                ]:
                    reading = SensorReading(
                        room_id=room.id,
                        sensor_type=sensor_type,
                        value=value,
                        timestamp=now,
                    )
                    session.add(reading)
                    readings.append(reading)

            await session.commit()
            # Refresh to get IDs
            for r in readings:
                await session.refresh(r)

        return readings


simulator = SensorSimulator()
