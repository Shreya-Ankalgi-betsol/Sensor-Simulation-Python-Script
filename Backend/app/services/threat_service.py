import base64
import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor, SensorStatus
from app.models.threat_log import ThreatLog, ThreatSeverity
from app.services.ws_session_manager import session_manager

from app.schemas.threat import PagedThreats, ThreatFilter, ThreatOut


class ThreatService:

    # Cursor encoding / decoding 

    def _encode_cursor(self, timestamp: datetime, alert_id: str) -> str:
        raw = json.dumps({
            "timestamp": timestamp.isoformat(),
            "alert_id": alert_id
        })
        return base64.urlsafe_b64encode(raw.encode()).decode()

    def _decode_cursor(self, cursor: str) -> tuple[datetime, str]:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(raw)
        return datetime.fromisoformat(data["timestamp"]), data["alert_id"]

    #  Get threats (filtered + cursor paginated) 
    async def get_threats(
        self, filters: ThreatFilter, db: AsyncSession
    ) -> PagedThreats:
        query = select(ThreatLog)

        # Apply filters - use .in_() for multi-select support
        if filters.sensor_type is not None and len(filters.sensor_type) > 0:
            query = query.where(ThreatLog.sensor_type.in_(filters.sensor_type))
        if filters.sensor_id is not None and len(filters.sensor_id) > 0:
            query = query.where(ThreatLog.sensor_id.in_(filters.sensor_id))
        if filters.threat_type is not None and len(filters.threat_type) > 0:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if filters.severity is not None and len(filters.severity) > 0:
            query = query.where(ThreatLog.severity.in_(filters.severity))
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        # Get total count of filtered results
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        # Get high severity count with the same filters
        # Build a separate query with all the same filters PLUS severity = high
        high_severity_query = select(ThreatLog)
        if filters.sensor_type is not None and len(filters.sensor_type) > 0:
            high_severity_query = high_severity_query.where(ThreatLog.sensor_type.in_(filters.sensor_type))
        if filters.sensor_id is not None and len(filters.sensor_id) > 0:
            high_severity_query = high_severity_query.where(ThreatLog.sensor_id.in_(filters.sensor_id))
        if filters.threat_type is not None and len(filters.threat_type) > 0:
            high_severity_query = high_severity_query.where(ThreatLog.threat_type.in_(filters.threat_type))
        # Always filter for high severity in this count (regardless of user's severity filter)
        high_severity_query = high_severity_query.where(ThreatLog.severity == ThreatSeverity.high)
        if filters.from_dt is not None:
            high_severity_query = high_severity_query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            high_severity_query = high_severity_query.where(ThreatLog.timestamp <= filters.to_dt)
        # If user filtered by severity AND it's not "high", then high severity count is 0
        if filters.severity is not None and len(filters.severity) > 0 and ThreatSeverity.high not in [ThreatSeverity(s) for s in filters.severity]:
            high_severity_count = 0
        else:
            high_severity_count_query = select(func.count()).select_from(high_severity_query.subquery())
            high_severity_result = await db.execute(high_severity_count_query)
            high_severity_count = high_severity_result.scalar_one()

        # Get active sensor count (unfiltered)
        active_sensor_query = select(func.count(Sensor.sensor_id)).where(Sensor.status == SensorStatus.active)
        active_sensor_result = await db.execute(active_sensor_query)
        active_sensor_count = active_sensor_result.scalar_one()

        # Apply cursor if provided
        if filters.cursor is not None:
            cursor_timestamp, cursor_alert_id = self._decode_cursor(filters.cursor)
            query = query.where(
                or_(
                    ThreatLog.timestamp < cursor_timestamp,
                    and_(
                        ThreatLog.timestamp == cursor_timestamp,
                        ThreatLog.alert_id < cursor_alert_id,
                    ),
                )
            )

        # Order and limit
        query = (
            query
            .order_by(ThreatLog.timestamp.desc(), ThreatLog.alert_id.desc())
            .limit(filters.page_size)
        )

        result = await db.execute(query)
        threats = result.scalars().all()

        # Build next cursor from last item
        next_cursor = None
        if len(threats) == filters.page_size:
            last = threats[-1]
            next_cursor = self._encode_cursor(last.timestamp, last.alert_id)

        has_more = next_cursor is not None

        return PagedThreats(
            items=[ThreatOut.model_validate(t) for t in threats],
            total=total,
            high_severity_count=high_severity_count,
            active_sensor_count=active_sensor_count,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    

    #  Push alert (called by detection engine) 

    async def push_alert(self, alert_data: dict, db: AsyncSession | None = None) -> None:
        # Broadcast threat to all connected WebSocket clients in frontend format
        await session_manager.broadcast_threat(alert_data)


threat_service = ThreatService()