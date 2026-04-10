from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.threat import  PagedThreats, ThreatFilter
from app.services.threat_service import threat_service
from app.schemas.threat import PagedThreats, ThreatFilter, ThreatSummaryOut

router = APIRouter(
    prefix="/api/v1/threats",
    tags=["Threats"],
)


@router.get(
    "",
    response_model=PagedThreats,
    summary="Get all threats",
    description=(
        "Returns a cursor-paginated list of threats. "
        "Supports filtering by sensor_id, severity, acknowledged status, and date range. "
        "Pass the next_cursor from the previous response to load more."
    ),
)
async def get_threats(
    sensor_type: str | None = None,
    sensor_id: str | None = None,
    threat_type: str | None = None,
    severity: str | None = None,
    from_dt: str | None = None,
    to_dt: str | None = None,
    cursor: str | None = None,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
) -> PagedThreats:
    filters = ThreatFilter(
        sensor_type=sensor_type,
        sensor_id=sensor_id,
        threat_type=threat_type,
        severity=severity,
        from_dt=from_dt,
        to_dt=to_dt,
        cursor=cursor,
        page_size=page_size,
    )
    return await threat_service.get_threats(filters, db)


# @router.put(
#     "/{threat_id}/acknowledge",
#     response_model=AcknowledgeOut,
#     summary="Acknowledge a threat",
#     description=(
#         "Marks a threat as acknowledged. "
#         "Broadcasts alert_acknowledged event to all connected WebSocket clients. "
#         "Returns 409 if threat is already acknowledged."
#     ),
# )
# async def acknowledge_threat(
#     threat_id: str,
#     db: AsyncSession = Depends(get_db),
# ) -> AcknowledgeOut:
#     return await threat_service.acknowledge_threat(threat_id, db)