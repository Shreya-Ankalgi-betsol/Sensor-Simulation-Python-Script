from app.schemas.sensor import SensorCreate, SensorUpdate, SensorOut
from app.schemas.threat import ThreatOut, PagedThreats, AcknowledgeOut, ThreatFilter
from app.schemas.analytics import (
    ThreatTimelinePoint,
    ThreatTimelineOut,
    ThreatPerSensorPoint,
    ThreatsPerSensorOut,
    SeverityBreakdownPoint,
    SeverityBreakdownOut,
    AnalyticsFilter,
)
from app.schemas.user import UserCreate, UserUpdate, UserOut, PasswordChange