import base64
import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor, SensorStatus
from app.models.threat_log import ThreatLog
from app.services.ws_session_manager import session_manager

from app.schemas.threat import  PagedThreats, ThreatFilter, ThreatOut, ThreatSummaryOut


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

        # Apply filters
        if filters.sensor_id is not None:
            query = query.where(ThreatLog.sensor_id == filters.sensor_id)
        if filters.severity is not None:
            query = query.where(ThreatLog.severity == filters.severity)
        if filters.from_dt is not None:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        # Get total count of filtered results
        count_result = await db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

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
            next_cursor=next_cursor,
            has_more=has_more,
        )

    #  Acknowledge threat 

    # async def acknowledge_threat(
    #     self, threat_id: str, db: AsyncSession
    # ) -> AcknowledgeOut:
    #     threat = await db.get(ThreatLog, threat_id)
    #     if not threat:
    #         raise HTTPException(
    #             status_code=status.HTTP_404_NOT_FOUND,
    #             detail=f"Threat '{threat_id}' not found.",
    #         )
    #     if threat.acknowledged:
    #         raise HTTPException(
    #             status_code=status.HTTP_409_CONFLICT,
    #             detail="Threat is already acknowledged.",
    #         )

    #     threat.acknowledged = True
    #     await db.flush()

    #     await session_manager.broadcast(
    #         "alert_acknowledged",
    #         {
    #             "alert_id": threat.alert_id,
    #             "sensor_id": threat.sensor_id,
    #         },
    #     )

    #     return AcknowledgeOut(message="Threat acknowledged successfully.")

    #  Push alert (called by detection engine) 

    async def push_alert(self, alert_data: dict) -> None:
        await session_manager.broadcast("alert_new", alert_data)
    
    async def get_threat_summary(self, db: AsyncSession) -> ThreatSummaryOut:
        # Total threats
        total_result = await db.execute(
            select(func.count(ThreatLog.alert_id))
        )
        total_threats = total_result.scalar_one()

        # High severity count
        high_result = await db.execute(
            select(func.count(ThreatLog.alert_id)).where(
                ThreatLog.severity == "high"
            )
        )
        high_severity_count = high_result.scalar_one()

        # Active sensor count
        active_result = await db.execute(
            select(func.count(Sensor.sensor_id)).where(
                Sensor.status == SensorStatus.active
            )
        )
        active_sensor_count = active_result.scalar_one()

        return ThreatSummaryOut(
            total_threats=total_threats,
            high_severity_count=high_severity_count,
            active_sensor_count=active_sensor_count,
        )


threat_service = ThreatService()