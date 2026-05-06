import enum
from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.sensor import SensorType
from app.models.threat_log import ThreatSeverity


class BucketBy(str, enum.Enum):
    minute = "minute"
    hour = "hour"
    day = "day"


#  Shared filter 

class AnalyticsFilter(BaseModel):
    from_dt: Optional[datetime] = Field(default=None)
    to_dt: Optional[datetime] = Field(default=None)
    # list fields capped to prevent large IN(...) clauses hitting the database
    location: Optional[list[str]] = Field(default=None, max_length=50)
    sensor_type: Optional[list[SensorType]] = Field(default=None, max_length=20)
    severity: Optional[list[ThreatSeverity]] = Field(default=None, max_length=10)
    threat_type: Optional[list[str]] = Field(default=None, max_length=20)

    bucket_by: BucketBy = BucketBy.hour

    @model_validator(mode="after")
    def check_date_range(self) -> "AnalyticsFilter":
        if self.from_dt and self.to_dt:
            # to_dt must be after from_dt
            if self.to_dt < self.from_dt:
                raise ValueError("to_dt must be after from_dt")
            # max allowed window is 90 days
            if (self.to_dt - self.from_dt) > timedelta(days=90):
                raise ValueError("Date range cannot exceed 90 days")
        return self


# ── A: Threat Timeline 

class ThreatTimelinePoint(BaseModel):
    bucket: datetime
    count: int


class ThreatTimelineOut(BaseModel):
    data: list[ThreatTimelinePoint]
    bucket_by: str


# ── B: Threats Per Sensor 

class ThreatPerSensorPoint(BaseModel):
    sensor_id: str
    sensor_type: str
    location: str
    count: int


class ThreatsPerSensorOut(BaseModel):
    data: list[ThreatPerSensorPoint]


# ── C: Severity Breakdown 

class SeverityBreakdownPoint(BaseModel):
    severity: str
    count: int


class SeverityBreakdownOut(BaseModel):
    data: list[SeverityBreakdownPoint]
    total: int


# ── D: Threat Type Breakdown 

class ThreatTypeBreakdownPoint(BaseModel):
    threat_type: str
    count: int


class ThreatTypeBreakdownOut(BaseModel):
    data: list[ThreatTypeBreakdownPoint]
    total: int