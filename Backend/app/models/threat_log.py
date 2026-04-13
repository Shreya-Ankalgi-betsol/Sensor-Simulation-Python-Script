import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import  DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.sensor import Sensor


class ThreatSeverity(str, enum.Enum):
    low = "low"
    med = "med"
    high = "high"
    


class ThreatLog(Base):
    __tablename__ = "threat_logs"

    alert_id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sensor_id: Mapped[str] = mapped_column(
        String, ForeignKey("sensors.sensor_id", ondelete="CASCADE"), nullable=False, index=True
    )
    sensor_type: Mapped[str] = mapped_column(String, nullable=False)
    track_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    object_type: Mapped[str | None] = mapped_column(String, nullable=True)
    object_state: Mapped[str | None] = mapped_column(String, nullable=True)
    threat_type: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[ThreatSeverity] = mapped_column(Enum(ThreatSeverity), nullable=False)
    object_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    object_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    object_bearing_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    object_range_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    sensor: Mapped["Sensor"] = relationship("Sensor", back_populates="threat_logs", lazy="select")

    def __repr__(self) -> str:
        return f"<ThreatLog {self.alert_id} type={self.threat_type} severity={self.severity}>"