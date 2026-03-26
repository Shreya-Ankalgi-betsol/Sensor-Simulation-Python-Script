from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.analytics import (
    AnalyticsFilter,
    SeverityBreakdownOut,
    ThreatTimelineOut,
    ThreatsPerSensorOut,
)
from app.services.analytics_service import analytics_service

router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


def now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


@router.get(
    "/threat-timeline",
    response_model=ThreatTimelineOut,
    summary="Threat activity over time",
    description=(
        "Returns threat counts grouped into time buckets. "
        "Defaults to last 24 hours bucketed by hour on page load. "
        "Use bucket_by='hour' for last 24h views, 'day' for weekly/monthly views."
    ),
)
async def threat_timeline(
    bucket_by: str = Query(
        default="hour",
        description="Time bucket size — 'hour' or 'day'",
    ),
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC). Defaults to 24 hours ago.",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC). Defaults to now.",
    ),
    db: AsyncSession = Depends(get_db),
) -> ThreatTimelineOut:
    resolved_from = from_dt if from_dt is not None else now_utc() - timedelta(hours=24)
    resolved_to = to_dt if to_dt is not None else now_utc()

    filters = AnalyticsFilter(from_dt=resolved_from, to_dt=resolved_to)
    return await analytics_service.get_threat_timeline(filters, bucket_by, db)


@router.get(
    "/threats-per-sensor",
    response_model=ThreatsPerSensorOut,
    summary="Threat count per sensor",
    description=(
        "Returns total threat count grouped by sensor. "
        "All sensors included even with zero threats. "
        "Defaults to last 7 days on page load."
    ),
)
async def threats_per_sensor(
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC). Defaults to 7 days ago.",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC). Defaults to now.",
    ),
    db: AsyncSession = Depends(get_db),
) -> ThreatsPerSensorOut:
    resolved_from = from_dt if from_dt is not None else now_utc() - timedelta(days=7)
    resolved_to = to_dt if to_dt is not None else now_utc()

    filters = AnalyticsFilter(from_dt=resolved_from, to_dt=resolved_to)
    return await analytics_service.get_threats_per_sensor(filters, db)


@router.get(
    "/severity-breakdown",
    response_model=SeverityBreakdownOut,
    summary="Threat severity breakdown",
    description=(
        "Returns threat counts grouped by severity level. "
        "Ordered critical → high → med → low. "
        "Defaults to last 24 hours on page load."
    ),
)
async def severity_breakdown(
    from_dt: Optional[datetime] = Query(
        default=None,
        description="Start of date range (ISO 8601 UTC). Defaults to 24 hours ago.",
    ),
    to_dt: Optional[datetime] = Query(
        default=None,
        description="End of date range (ISO 8601 UTC). Defaults to now.",
    ),
    db: AsyncSession = Depends(get_db),
) -> SeverityBreakdownOut:
    resolved_from = from_dt if from_dt is not None else now_utc() - timedelta(hours=24)
    resolved_to = to_dt if to_dt is not None else now_utc()

    filters = AnalyticsFilter(from_dt=resolved_from, to_dt=resolved_to)
    return await analytics_service.get_severity_breakdown(filters, db)