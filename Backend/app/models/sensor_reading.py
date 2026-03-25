import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from Backend.app.models.sensor import Sensor
from app.db.session import Base


class ReadingStatus(str, enum.Enum):
    ok = "OK"
    threat = "Threat"


class RadarReading(Base):
    __tablename__ = "radar_readings"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sensor_id: Mapped[str] = mapped_column(
        String, ForeignKey("sensors.sensor_id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    
    status: Mapped[ReadingStatus] = mapped_column(
        Enum(ReadingStatus), nullable=False, default=ReadingStatus.ok
    )

    # Radar specific fields
    range_m: Mapped[float] = mapped_column(Float, nullable=False)
    azimuth_deg: Mapped[float] = mapped_column(Float, nullable=False)
    elevation_deg: Mapped[float] = mapped_column(Float, nullable=False)
    radial_velocity_mps: Mapped[float] = mapped_column(Float, nullable=False)
    rcs_dbsm: Mapped[float] = mapped_column(Float, nullable=False)
    snr_db: Mapped[float] = mapped_column(Float, nullable=False)

    sensor: Mapped["Sensor"] = relationship("Sensor", back_populates="radar_readings")

    def __repr__(self) -> str:
        return f"<RadarReading {self.id} sensor={self.sensor_id} {self.status}>"


class LidarReading(Base):
    __tablename__ = "lidar_readings"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sensor_id: Mapped[str] = mapped_column(
        String, ForeignKey("sensors.sensor_id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    
    status: Mapped[ReadingStatus] = mapped_column(
        Enum(ReadingStatus), nullable=False, default=ReadingStatus.ok
    )

    # Bounding box
    bbox_x_min: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y_min: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_z_min: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x_max: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y_max: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_z_max: Mapped[float] = mapped_column(Float, nullable=False)

    # Centroid
    centroid_x: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_y: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_z: Mapped[float] = mapped_column(Float, nullable=False)

    # Lidar specific fields
    point_count: Mapped[int] = mapped_column(Integer, nullable=False)
    intensity_avg: Mapped[float] = mapped_column(Float, nullable=False)
    velocity_mps: Mapped[float] = mapped_column(Float, nullable=False)
    aspect_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    point_density_ppm2: Mapped[float] = mapped_column(Float, nullable=False)

    sensor: Mapped["Sensor"] = relationship("Sensor", back_populates="lidar_readings")

    def __repr__(self) -> str:
        return f"<LidarReading {self.id} sensor={self.sensor_id} {self.status}>"