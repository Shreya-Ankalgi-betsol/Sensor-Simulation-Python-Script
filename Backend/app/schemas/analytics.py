from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.threat_log import ThreatSeverity


#  Threat Timeline 
class ThreatTimelinePoint(BaseModel):
    bucket: datetime
    count: int


class ThreatTimelineOut(BaseModel):
    data: list[ThreatTimelinePoint]
    bucket_by: str  # "hour" or "day"


#  Threats Per Sensor 
class ThreatPerSensorPoint(BaseModel):
    sensor_id: str
    sensor_type: str
    count: int


class ThreatsPerSensorOut(BaseModel):
    data: list[ThreatPerSensorPoint]


#  Severity 

class SeverityBreakdownPoint(BaseModel):
    severity: ThreatSeverity
    count: int
    

class SeverityBreakdownOut(BaseModel):
    data: list[SeverityBreakdownPoint]
    total: int


# Shared filter params
class AnalyticsFilter(BaseModel):
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None