from datetime import datetime

from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, default=1)
    building: Mapped[str] = mapped_column(String(100), default="Main Building")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sensor_readings = relationship("SensorReading", back_populates="room", lazy="selectin")
    detection_logs = relationship("DetectionLog", back_populates="room", lazy="selectin")
