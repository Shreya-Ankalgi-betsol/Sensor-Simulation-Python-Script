from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.sensor import SensorStatus, SensorType


# Create 

class SensorCreate(BaseModel):
    sensor_id: str
    sensor_type: SensorType
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    coverage_radius_m: float = Field(default=50.0, gt=0)


# Update
class SensorUpdate(BaseModel):
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    coverage_radius_m: Optional[float] = Field(default=None, gt=0)


#  Response 
class SensorOut(BaseModel):
    sensor_id: str
    sensor_type: SensorType
    status: SensorStatus
    lat: float
    lng: float
    coverage_radius_m: float
    last_ping: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}