"""
Seed demo data: 4 rooms + 24h of backfilled sensor readings.

Usage:
    cd backend
    python -m app.models  # ensure models imported
    python ../scripts/seed_demo_data.py
"""
import sys
import os
import asyncio
import random
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.models.database import engine, async_session, Base
from app.models.room import Room
from app.models.sensor_reading import SensorReading
from app.services.sensor_simulator import OCCUPANCY_SCHEDULES, ROOM_BASELINES

random.seed(42)


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    async with async_session() as session:
        # Create rooms
        rooms = [
            Room(name="Classroom A", capacity=40, floor=1, building="Main Building"),
            Room(name="Classroom B", capacity=30, floor=1, building="Main Building"),
            Room(name="Computer Lab", capacity=25, floor=2, building="Main Building"),
            Room(name="Library Study Area", capacity=50, floor=2, building="Main Building"),
        ]
        session.add_all(rooms)
        await session.commit()
        for r in rooms:
            await session.refresh(r)
        print(f"Created {len(rooms)} rooms.")

        # Generate 24h of sensor data at 5-minute intervals
        now = datetime.utcnow()
        start_time = now - timedelta(hours=24)
        interval = timedelta(minutes=5)
        total_readings = 0

        # Track per-room state
        room_state = {r.id: {"temperature": 22.0, "occupancy": 0} for r in rooms}

        current_time = start_time
        while current_time <= now:
            hour = current_time.hour

            for room in rooms:
                schedule = OCCUPANCY_SCHEDULES.get(room.id, [])
                occupancy = 0
                for start_h, end_h, min_p, max_p in schedule:
                    if start_h <= hour < end_h:
                        if min_p == 0 and max_p == 0:
                            occupancy = 0
                        else:
                            occupancy = random.randint(min_p, max_p)
                        break

                baselines = ROOM_BASELINES.get(room.id, {"power_base": 200, "power_per_person": 80})
                state = room_state[room.id]

                # Temperature
                target_temp = 22.0 + occupancy * 0.15
                temperature = state["temperature"] + (target_temp - state["temperature"]) * 0.1
                temperature += random.uniform(-0.3, 0.3)
                temperature = max(18.0, min(30.0, temperature))

                # Motion
                if occupancy > 0:
                    motion = 1.0
                elif state["occupancy"] > 0 and random.random() < 0.2:
                    motion = 1.0
                else:
                    motion = 0.0

                # Light
                if occupancy > 0:
                    light = random.uniform(400, 800)
                elif room.id == 1 and 10 <= hour < 12:
                    light = random.uniform(400, 700)  # waste scenario
                else:
                    light = 0.0

                # Power
                power = baselines["power_base"] + occupancy * baselines["power_per_person"]
                power += random.uniform(-20, 20)
                if room.id == 1 and 10 <= hour < 12:
                    power = baselines["power_base"] * 0.7
                power = max(0, power)

                state["temperature"] = temperature
                state["occupancy"] = occupancy

                for sensor_type, value in [
                    ("motion", round(motion, 1)),
                    ("temperature", round(temperature, 1)),
                    ("light", round(light, 1)),
                    ("power", round(power, 1)),
                ]:
                    session.add(SensorReading(
                        room_id=room.id,
                        sensor_type=sensor_type,
                        value=value,
                        timestamp=current_time,
                    ))
                    total_readings += 1

            current_time += interval

        await session.commit()
        print(f"Generated {total_readings} sensor readings ({total_readings // (4 * 4)} time points).")
        print("Done!")


if __name__ == "__main__":
    asyncio.run(seed())
