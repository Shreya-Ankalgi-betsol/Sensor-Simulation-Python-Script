import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.app.models.threat_log import ThreatLog
from app.models.sensor_reading import LidarReading, RadarReading
from app.db.session import Base


class SensorType(str, enum.Enum):
    radar = "radar"
    lidar = "lidar"



class SensorStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    error = "error"

class Sensor(Base):
    __tablename__ = "sensors"

    sensor_id: Mapped[str] = mapped_column(String, primary_key=True)
    sensor_type: Mapped[SensorType] = mapped_column(Enum(SensorType), nullable=False)
    status: Mapped[SensorStatus] = mapped_column(
        Enum(SensorStatus), nullable=False, default=SensorStatus.inactive
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    coverage_radius_m: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    last_ping: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    radar_readings: Mapped[list["RadarReading"]] = relationship(
        "RadarReading", back_populates="sensor", cascade="all, delete-orphan"
    )
    lidar_readings: Mapped[list["LidarReading"]] = relationship(
        "LidarReading", back_populates="sensor", cascade="all, delete-orphan"
    )
    threat_logs: Mapped[list["ThreatLog"]] = relationship(
        "ThreatLog", back_populates="sensor", cascade="all, delete-orphan"
    )
    # trajectories: Mapped[list["Trajectory"]] = relationship(
    #     "Trajectory", back_populates="sensor", cascade="all, delete-orphan"
    # )

    def __repr__(self) -> str:
        return f"<Sensor {self.sensor_id} [{self.sensor_type}] {self.status}>"