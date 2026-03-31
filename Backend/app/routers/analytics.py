from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.sensor import SensorType
from app.models.threat_log import ThreatSeverity
from app.schemas.analytics import (
    AnalyticsFilter,
    BucketBy,
    SeverityBreakdownOut,
    ThreatTimelineOut,
    ThreatTypeBreakdownOut,
    ThreatsPerSensorOut,
)
from app.services.analytics_service import analytics_service

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


def build_filters(
    from_dt: Optional[datetime],
    to_dt: Optional[datetime],
    timezone: str,
    location: Optional[str],
    sensor_type: Optional[SensorType],
    severity: Optional[ThreatSeverity],
    threat_type: Optional[str],
    bucket_by: BucketBy = BucketBy.hour,
) -> AnalyticsFilter:
    return AnalyticsFilter(
        from_dt=from_dt,
        to_dt=to_dt,
        timezone=timezone,
        location=location,
        sensor_type=sensor_type,
        severity=severity,
        threat_type=threat_type,
        bucket_by=bucket_by,
    )


@router.get(
    "/threat-timeline",
    response_model=ThreatTimelineOut,
    summary="Threat activity over time",
    description=(
        "Returns threat counts grouped into time buckets. "
        "Frontend sends from_dt, to_dt, timezone and bucket_by. "
        "Timestamps are converted to the given timezone before bucketing. "
        "bucket_by options: minute, hour, day."
    ),
)
async def threat_timeline(
    bucket_by: BucketBy = Query(default=BucketBy.hour, description="minute, hour or day"),
    from_dt: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601 UTC)"),
    to_dt: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601 UTC)"),
    timezone: str = Query(default="UTC", description="Timezone e.g. Asia/Kolkata"),
    location: Optional[str] = Query(default=None, description="Sensor location e.g. Main gate"),
    sensor_type: Optional[SensorType] = Query(default=None, description="radar or lidar"),
    severity: Optional[ThreatSeverity] = Query(default=None, description="low, med, high, critical"),
    threat_type: Optional[str] = Query(default=None, description="e.g. drone, person, vehicle"),
    db: AsyncSession = Depends(get_db),
) -> ThreatTimelineOut:
    filters = build_filters(
        from_dt, to_dt, timezone, location, sensor_type, severity, threat_type, bucket_by
    )
    return await analytics_service.get_threat_timeline(filters, db)


@router.get(
    "/threats-per-sensor",
    response_model=ThreatsPerSensorOut,
    summary="Threat count per sensor",
    description=(
        "Returns total threat count grouped by sensor. "
        "All sensors included even with zero threats. "
        "Supports filtering by location, sensor_type, severity, threat_type."
    ),
)
async def threats_per_sensor(
    from_dt: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601 UTC)"),
    to_dt: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601 UTC)"),
    timezone: str = Query(default="UTC", description="Timezone e.g. Asia/Kolkata"),
    location: Optional[str] = Query(default=None, description="Sensor location e.g. Main gate"),
    sensor_type: Optional[SensorType] = Query(default=None, description="radar or lidar"),
    severity: Optional[ThreatSeverity] = Query(default=None, description="low, med, high, critical"),
    threat_type: Optional[str] = Query(default=None, description="e.g. drone, person, vehicle"),
    db: AsyncSession = Depends(get_db),
) -> ThreatsPerSensorOut:
    filters = build_filters(
        from_dt, to_dt, timezone, location, sensor_type, severity, threat_type
    )
    return await analytics_service.get_threats_per_sensor(filters, db)


@router.get(
    "/severity-breakdown",
    response_model=SeverityBreakdownOut,
    summary="Threat severity breakdown",
    description=(
        "Returns threat counts grouped by severity level. "
        "Ordered critical → high → med → low. "
        "Supports filtering by location, sensor_type, threat_type."
    ),
)
async def severity_breakdown(
    from_dt: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601 UTC)"),
    to_dt: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601 UTC)"),
    timezone: str = Query(default="UTC", description="Timezone e.g. Asia/Kolkata"),
    location: Optional[str] = Query(default=None, description="Sensor location e.g. Main gate"),
    sensor_type: Optional[SensorType] = Query(default=None, description="radar or lidar"),
    severity: Optional[ThreatSeverity] = Query(default=None, description="low, med, high, critical"),
    threat_type: Optional[str] = Query(default=None, description="e.g. drone, person, vehicle"),
    db: AsyncSession = Depends(get_db),
) -> SeverityBreakdownOut:
    filters = build_filters(
        from_dt, to_dt, timezone, location, sensor_type, severity, threat_type
    )
    return await analytics_service.get_severity_breakdown(filters, db)


@router.get(
    "/threat-type-breakdown",
    response_model=ThreatTypeBreakdownOut,
    summary="Threat type breakdown",
    description=(
        "Returns threat counts grouped by threat type. "
        "Ordered highest count first. "
        "Supports filtering by location, sensor_type, severity."
    ),
)
async def threat_type_breakdown(
    from_dt: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601 UTC)"),
    to_dt: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601 UTC)"),
    timezone: str = Query(default="UTC", description="Timezone e.g. Asia/Kolkata"),
    location: Optional[str] = Query(default=None, description="Sensor location e.g. Main gate"),
    sensor_type: Optional[SensorType] = Query(default=None, description="radar or lidar"),
    severity: Optional[ThreatSeverity] = Query(default=None, description="low, med, high, critical"),
    threat_type: Optional[str] = Query(default=None, description="e.g. drone, person, vehicle"),
    db: AsyncSession = Depends(get_db),
) -> ThreatTypeBreakdownOut:
    filters = build_filters(
        from_dt, to_dt, timezone, location, sensor_type, severity, threat_type
    )
    return await analytics_service.get_threat_type_breakdown(filters, db)
