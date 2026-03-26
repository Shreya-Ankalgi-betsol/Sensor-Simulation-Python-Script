from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.threat_log import ThreatSeverity


# Response 
class ThreatOut(BaseModel):
    alert_id: str
    sensor_id: str
    sensor_type: str
    threat_type: str
    confidence: float
    severity: ThreatSeverity
    
    timestamp: datetime

    model_config = {"from_attributes": True}


# Paginated response 
class PagedThreats(BaseModel):
    items: list[ThreatOut]
    total: int # total number of threats matching the filter. 
    next_cursor: Optional[str]
    has_more: bool


# Acknowledge response 

# class AcknowledgeOut(BaseModel):
#     message: str


# Filter params 
class ThreatFilter(BaseModel):
    sensor_id: Optional[str] = None
    severity: Optional[ThreatSeverity] = None
    
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None
    page_size: int = 20
    cursor: Optional[str] = None
    
# Summary     
class ThreatSummaryOut(BaseModel):
    total_threats: int
    high_severity_count: int
    active_sensor_count: int