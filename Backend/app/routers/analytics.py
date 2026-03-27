from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.analytics import (
    AnalyticsFilter,
    BucketBy,
    SeverityBreakdownOut,
    ThreatTimelineOut,
    ThreatsPerSensorOut,
)
from app.services.analytics_service import analytics_service

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


@router.get(
    "/threat-timeline",
    response_model=ThreatTimelineOut,
    summary="Threat activity over time",
    description=(
        "Returns threat counts grouped into time buckets. "
        "Frontend is responsible for sending from_dt, to_dt and bucket_by. "
        "bucket_by options: minute, hour, day."
    ),
)
async def threat_timeline(
    bucket_by: BucketBy = Query(
        default=BucketBy.hour,
        description="Time bucket size — minute, hour or day",
    ),
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC)",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC)",
    ),
    db: AsyncSession = Depends(get_db),
) -> ThreatTimelineOut:
    # Default to last 7 days if not specified
    if from_dt is None:
        from_dt = datetime.utcnow() - timedelta(days=7)
    if to_dt is None:
        to_dt = datetime.utcnow()
    
    filters = AnalyticsFilter(
        from_dt=from_dt,
        to_dt=to_dt,
        bucket_by=bucket_by,
    )
    return await analytics_service.get_threat_timeline(filters, bucket_by, db)


@router.get(
    "/threats-per-sensor",
    response_model=ThreatsPerSensorOut,
    summary="Threat count per sensor",
    description=(
        "Returns total threat count grouped by sensor. "
        "All sensors included even with zero threats. "
        "Frontend sends from_dt and to_dt."
    ),
)
async def threats_per_sensor(
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC)",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC)",
    ),
    db: AsyncSession = Depends(get_db),
) -> ThreatsPerSensorOut:
    # Default to last 7 days if not specified
    if from_dt is None:
        from_dt = datetime.utcnow() - timedelta(days=7)
    if to_dt is None:
        to_dt = datetime.utcnow()
    
    filters = AnalyticsFilter(from_dt=from_dt, to_dt=to_dt)
    return await analytics_service.get_threats_per_sensor(filters, db)


@router.get(
    "/severity-breakdown",
    response_model=SeverityBreakdownOut,
    summary="Threat severity breakdown",
    description=(
        "Returns threat counts grouped by severity level. "
        "Ordered critical → high → med → low. "
        "Frontend sends from_dt and to_dt."
    ),
)
async def severity_breakdown(
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC)",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC)",
    ),
    db: AsyncSession = Depends(get_db),
) -> SeverityBreakdownOut:
    # Default to last 7 days if not specified
    if from_dt is None:
        from_dt = datetime.utcnow() - timedelta(days=7)
    if to_dt is None:
        to_dt = datetime.utcnow()
    
    filters = AnalyticsFilter(from_dt=from_dt, to_dt=to_dt)
    return await analytics_service.get_severity_breakdown(filters, db)

