from datetime import datetime
from typing import Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor
from app.models.threat_log import ThreatLog, ThreatSeverity
from app.schemas.analytics import (
    AnalyticsFilter,
    SeverityBreakdownOut,
    SeverityBreakdownPoint,
    ThreatPerSensorPoint,
    ThreatTimelineOut,
    ThreatTimelinePoint,
    ThreatsPerSensorOut,
)


class AnalyticsService:

    # A: Threat timeline 

    async def get_threat_timeline(
        self,
        filters: AnalyticsFilter,
        bucket_by: str,
        db: AsyncSession,
    ) -> ThreatTimelineOut:

        # Choose bucket size
        if bucket_by == "day":
            bucket_expr = func.strftime("%Y-%m-%d", ThreatLog.timestamp)
        else:
            bucket_by = "hour"
            bucket_expr = func.strftime("%Y-%m-%dT%H:00:00", ThreatLog.timestamp)

        query = (
            select(
                bucket_expr.label("bucket"),
                func.count(ThreatLog.alert_id).label("count"),
            )
            .group_by(bucket_expr)
            .order_by(bucket_expr.asc())
        )

        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        result = await db.execute(query)
        rows = result.all()

        return ThreatTimelineOut(
            bucket_by=bucket_by,
            data=[
                ThreatTimelinePoint(
                    bucket=datetime.fromisoformat(row.bucket),
                    count=row.count,
                )
                for row in rows
            ],
        )

    # ── B: Threats per sensor ─────────────────────────────────────────────────

    async def get_threats_per_sensor(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> ThreatsPerSensorOut:

        # Get all sensors first
        sensors_result = await db.execute(select(Sensor))
        all_sensors = sensors_result.scalars().all()

        # Get threat counts per sensor
        threat_query = (
            select(
                ThreatLog.sensor_id,
                func.count(ThreatLog.alert_id).label("count"),
            )
            .group_by(ThreatLog.sensor_id)
        )

        if filters.from_dt is not None:
            threat_query = threat_query.where(
                ThreatLog.timestamp >= filters.from_dt
            )
        if filters.to_dt is not None:
            threat_query = threat_query.where(
                ThreatLog.timestamp <= filters.to_dt
            )

        threat_result = await db.execute(threat_query)
        threat_counts = {row.sensor_id: row.count for row in threat_result.all()}

        # Merge — every sensor appears even with zero threats
        return ThreatsPerSensorOut(
            data=[
                ThreatPerSensorPoint(
                    sensor_id=s.sensor_id,
                    sensor_type=s.sensor_type,
                    count=threat_counts.get(s.sensor_id, 0),
                )
                for s in all_sensors
            ]
        )

    # ── C: Severity breakdown ─────────────────────────────────────────────────

    async def get_severity_breakdown(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> SeverityBreakdownOut:

        query = (
            select(
                ThreatLog.severity,
                func.count(ThreatLog.alert_id).label("count"),
            )
            .group_by(ThreatLog.severity)
            .order_by(
                case(
                    (ThreatLog.severity == ThreatSeverity.critical, 1),
                    (ThreatLog.severity == ThreatSeverity.high, 2),
                    (ThreatLog.severity == ThreatSeverity.med, 3),
                    (ThreatLog.severity == ThreatSeverity.low, 4),
                )
            )
        )

        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        result = await db.execute(query)
        rows = result.all()

        total = sum(row.count for row in rows)

        return SeverityBreakdownOut(
            total=total,
            data=[
                SeverityBreakdownPoint(
                    severity=row.severity,
                    count=row.count,
                )
                for row in rows
            ],
        )


analytics_service = AnalyticsService()