from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor
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

    # ── Shared helpers 

    def _needs_sensor_join(self, filters: AnalyticsFilter) -> bool:
        """Check if Sensor table needs to be joined based on active filters."""
        return bool(filters.location or filters.sensor_type)

    def _apply_filters(self, query, filters: AnalyticsFilter, sensor_joined: bool):
        """Apply all active filters to the query in one place."""
        if sensor_joined:
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
        return query

    # ── A: Threat timeline ────────────────────────────────────────────────────

    async def get_threat_timeline(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> ThreatTimelineOut:

        # Optimization 1 & 2: extracted to shared helpers
        needs_sensor_join = self._needs_sensor_join(filters)

        if filters.bucket_by == BucketBy.minute:
            bucket_expr = func.date_trunc("minute", ThreatLog.timestamp)
        elif filters.bucket_by == BucketBy.day:
            bucket_expr = func.date_trunc("day", ThreatLog.timestamp)
        else:
            bucket_expr = func.date_trunc("hour", ThreatLog.timestamp)

        query = select(
            bucket_expr.label("bucket"),
            func.count(ThreatLog.alert_id).label("count"),
        ).select_from(ThreatLog)

        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        query = self._apply_filters(query, filters, needs_sensor_join)
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

    # ── B: Threats per sensor ─────────────────────────────────────────────────

    async def get_threats_per_sensor(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> ThreatsPerSensorOut:

        # Optimization 3: single query using outerjoin instead of 2 db calls
        # outerjoin ensures sensors with zero threats still appear with count=0
        query = (
            select(
                Sensor.sensor_id,
                Sensor.sensor_type,
                Sensor.location,
                func.count(ThreatLog.alert_id).label("count"),
            )
            .outerjoin(ThreatLog, Sensor.sensor_id == ThreatLog.sensor_id)
            .group_by(Sensor.sensor_id, Sensor.sensor_type, Sensor.location)
        )

        # Apply sensor-level filters directly (sensor is the base table here)
        if filters.location:
            query = query.where(Sensor.location.in_(filters.location))
        if filters.sensor_type:
            query = query.where(Sensor.sensor_type.in_(filters.sensor_type))

        # Apply threat-level filters
        if filters.severity:
            query = query.where(ThreatLog.severity.in_(filters.severity))
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        result = await db.execute(query)
        rows = result.all()

        return ThreatsPerSensorOut(
            data=[
                ThreatPerSensorPoint(
                    sensor_id=row.sensor_id,
                    sensor_type=row.sensor_type,
                    location=row.location,
                    count=row.count,
                )
                for row in rows
            ]
        )

    # ── C: Severity breakdown ─────────────────────────────────────────────────

    async def get_severity_breakdown(
        self,
        filters: AnalyticsFilter,
        db: AsyncSession,
    ) -> SeverityBreakdownOut:

        needs_sensor_join = self._needs_sensor_join(filters)

        # Optimization 4: total calculated in DB using window function over()
        # instead of summing in Python after fetching
        query = select(
            ThreatLog.severity,
            func.count(ThreatLog.alert_id).label("count"),
            func.sum(func.count(ThreatLog.alert_id)).over().label("total"),
        )

        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        query = self._apply_filters(query, filters, needs_sensor_join)

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

        # total is the same on every row — just read it from the first row
        total = rows[0].total if rows else 0

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

        needs_sensor_join = self._needs_sensor_join(filters)

        # Optimization 4: same window function approach for total
        query = select(
            ThreatLog.threat_type,
            func.count(ThreatLog.alert_id).label("count"),
            func.sum(func.count(ThreatLog.alert_id)).over().label("total"),
        )

        if needs_sensor_join:
            query = query.join(Sensor, ThreatLog.sensor_id == Sensor.sensor_id)

        query = self._apply_filters(query, filters, needs_sensor_join)

        query = (
            query
            .group_by(ThreatLog.threat_type)
            .order_by(func.count(ThreatLog.alert_id).desc())
        )

        result = await db.execute(query)
        rows = result.all()

        total = rows[0].total if rows else 0

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