from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./greenvision.db"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"
    YOLO_MODEL: str = "yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.5
    YOLO_DEVICE: str = "cpu"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
