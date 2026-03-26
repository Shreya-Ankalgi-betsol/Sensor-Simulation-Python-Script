import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BucketBy(str, enum.Enum):
    minute = "minute"
    hour = "hour"
    day = "day"


#  A: Threat Timeline 
class ThreatTimelinePoint(BaseModel):
    bucket: datetime
    count: int


class ThreatTimelineOut(BaseModel):
    data: list[ThreatTimelinePoint]
    bucket_by: str


#  B: Threats Per Sensor 
class ThreatPerSensorPoint(BaseModel):
    sensor_id: str
    sensor_type: str
    location: str
    count: int


class ThreatsPerSensorOut(BaseModel):
    data: list[ThreatPerSensorPoint]


# C: Severity Breakdown 

class SeverityBreakdownPoint(BaseModel):
    severity: str
    count: int


class SeverityBreakdownOut(BaseModel):
    data: list[SeverityBreakdownPoint]
    total: int


#  Shared filter params 

class AnalyticsFilter(BaseModel):
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None
    bucket_by: BucketBy = BucketBy.hour