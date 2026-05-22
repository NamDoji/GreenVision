from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.detection import router as detection_router
from app.api.rooms import router as rooms_router
from app.api.sensors import router as sensors_router
from app.ml.detector import detector
from app.models import init_db
from app.services.sensor_simulator import simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    detector.load_model()
    print(f"YOLO model loaded: {settings.YOLO_MODEL}")
    await init_db()
    print("Database initialized")
    await simulator.start()
    print("Sensor simulator started")
    yield
    # Shutdown
    await simulator.stop()
    print("Sensor simulator stopped")


app = FastAPI(
    title="GreenVision AI",
    description="Intelligent energy optimization system",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection_router)
app.include_router(rooms_router)
app.include_router(sensors_router)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "service": "GreenVision AI"}
