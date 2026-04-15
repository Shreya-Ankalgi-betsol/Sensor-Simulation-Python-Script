from datetime import datetime
from typing import Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor, SensorType
from app.models.threat_log import ThreatLog, ThreatSeverity
from app.schemas.analytics import (
    AnalyticsFilter,
    BucketBy,
    SeverityBreakdownOut,
    SeverityBreakdownPoint,
    ThreatPerSensorPoint,
    ThreatTimelineOut,
    ThreatTimelinePoint,
    ThreatTypeBreakdownOut,
    ThreatTypeBreakdownPoint,
    ThreatsPerSensorOut,
)


class AnalyticsService:

    # ── A: Threat timeline 

    async def get_threat_timeline(
    self,
    filters: AnalyticsFilter,
    db: AsyncSession,
) -> ThreatTimelineOut:

        needs_sensor_join = (
            filters.location or
            filters.sensor_type
        )

        # Choose bucket expression based on bucket_by
        if filters.bucket_by == BucketBy.minute:
            bucket_expr = func.date_trunc("minute", ThreatLog.timestamp)
        elif filters.bucket_by == BucketBy.day:
            bucket_expr = func.date_trunc("day", ThreatLog.timestamp)
        else:
            bucket_expr = func.date_trunc("hour", ThreatLog.timestamp)

        # Build query
        query = select(
            bucket_expr.label("bucket"),
            func.count(ThreatLog.alert_id).label("count"),
        ).select_from(ThreatLog)

        # JOIN sensors if location or sensor_type filter is active
        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        # Apply filters
        if filters.location:
            query = query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            query = query.where(Sensor.sensor_type.in_(filters.sensor_type))
        if filters.severity:
            query = query.where(ThreatLog.severity.in_(filters.severity))
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        query = query.group_by(bucket_expr).order_by(bucket_expr.asc())

        result = await db.execute(query)
        rows = result.all()

        return ThreatTimelineOut(
            bucket_by=filters.bucket_by.value,
            data=[
                ThreatTimelinePoint(
                    bucket=row.bucket,
                    count=row.count,
                )
                for row in rows
            ],
        )


    # ── B: Threats per sensor 

    async def get_threats_per_sensor(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> ThreatsPerSensorOut:

        # Get all sensors — apply location and sensor_type filters
        sensor_query = select(Sensor)
        if filters.location:
            sensor_query = sensor_query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            sensor_query = sensor_query.where(Sensor.sensor_type.in_(filters.sensor_type))

        sensors_result = await db.execute(sensor_query)
        all_sensors = sensors_result.scalars().all()

        # Get threat counts — apply all filters
        threat_query = (
            select(
                ThreatLog.sensor_id,
                func.count(ThreatLog.alert_id).label("count"),
            )
            .join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)
            .group_by(ThreatLog.sensor_id)
        )

        if filters.location:
            threat_query = threat_query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            threat_query = threat_query.where(Sensor.sensor_type.in_(filters.sensor_type))
        if filters.severity:
            threat_query = threat_query.where(ThreatLog.severity.in_(filters.severity))
        if filters.threat_type:
            threat_query = threat_query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.from_dt is not None:
            threat_query = threat_query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            threat_query = threat_query.where(ThreatLog.timestamp <= filters.to_dt)

        threat_result = await db.execute(threat_query)
        threat_counts = {row.sensor_id: row.count for row in threat_result.all()}

        return ThreatsPerSensorOut(
            data=[
                ThreatPerSensorPoint(
                    sensor_id=s.sensor_id,
                    sensor_type=s.sensor_type,
                    location=s.location,
                    count=threat_counts.get(s.sensor_id, 0),
                )
                for s in all_sensors
            ]
        )

    # ── C: Severity breakdown 

    async def get_severity_breakdown(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> SeverityBreakdownOut:

        needs_sensor_join = (
            filters.location or
            filters.sensor_type
        )

        query = (
            select(
                ThreatLog.severity,
                func.count(ThreatLog.alert_id).label("count"),
            )
        )

        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        if filters.location:
            query = query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            query = query.where(Sensor.sensor_type.in_(filters.sensor_type))
        if filters.severity:
            query = query.where(ThreatLog.severity.in_(filters.severity))
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        query = (
            query
            .group_by(ThreatLog.severity)
            .order_by(
                case(
                    
                    (ThreatLog.severity == ThreatSeverity.high, 1),
                    (ThreatLog.severity == ThreatSeverity.med, 2),
                    (ThreatLog.severity == ThreatSeverity.low, 3),
                )
            )
        )

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

    # ── D: Threat type breakdown ──────────────────────────────────────────────

    async def get_threat_type_breakdown(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> ThreatTypeBreakdownOut:

        needs_sensor_join = (
            filters.location or
            filters.sensor_type
        )

        query = select(
            ThreatLog.threat_type,
            func.count(ThreatLog.alert_id).label("count"),
        )

        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        if filters.location:
            query = query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            query = query.where(Sensor.sensor_type.in_(filters.sensor_type))
        if filters.severity:
            query = query.where(ThreatLog.severity.in_(filters.severity))
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        query = (
            query
            .group_by(ThreatLog.threat_type)
            .order_by(func.count(ThreatLog.alert_id).desc())
        )

        result = await db.execute(query)
        rows = result.all()
        total = sum(row.count for row in rows)

        return ThreatTypeBreakdownOut(
            total=total,
            data=[
                ThreatTypeBreakdownPoint(
                    threat_type=row.threat_type,
                    count=row.count,
                )
                for row in rows
            ],
        )


analytics_service = AnalyticsService()