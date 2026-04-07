"""
Unified API response wrapper for consistent frontend-backend communication.
All endpoints should return responses wrapped in ApiResponse.
"""

from datetime import datetime
from typing import Any, Generic, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response wrapper.
    
    Use this for all endpoint responses to provide consistent structure:
    - success: bool indicating if operation succeeded
    - data: The actual response data (payload)
    - error: Error message if failed
    - timestamp: When the response was generated
    """
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"sensor_id": "sensor_01", "status": "active"},
                "error": None,
                "timestamp": "2026-04-06T10:30:00"
            }
        }


class ApiErrorResponse(BaseModel):
    """Error response format"""
    success: bool = False
    error: str
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "Sensor not found",
                "details": "Sensor 'sensor_01' does not exist in database",
                "timestamp": "2026-04-06T10:30:00"
            }
        }
