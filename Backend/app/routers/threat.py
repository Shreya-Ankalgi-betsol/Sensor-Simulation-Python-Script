from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.threat import (
    PagedThreats,
    ThreatChunkManifestItem,
    ThreatChunkOut,
    ThreatFilter,
)
from app.services.threat_service import threat_service
from app.models.threat_log import ThreatSeverity

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
    sensor_type: list[str] | None = Query(None),
    sensor_id: list[str] | None = Query(None),
    threat_type: list[str] | None = Query(None),
    severity: list[str] | None = Query(None),
    from_dt: str | None = None,
    to_dt: str | None = None,
    cursor: str | None = None,
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> PagedThreats:
    if severity:
        normalized_severity = [str(value).lower() for value in severity]
        allowed = {item.value for item in ThreatSeverity}
        invalid = [value for value in normalized_severity if value not in allowed]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid severity value(s): "
                    f"{', '.join(invalid)}. Allowed: {', '.join(sorted(allowed))}."
                ),
            )
        severity = normalized_severity

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


@router.get(
    "/manifest",
    response_model=list[ThreatChunkManifestItem],
    summary="Get adaptive chunk manifest",
    description="Returns chunk boundaries for the last 12 hours based on threat density.",
)
async def get_threat_manifest(
    db: AsyncSession = Depends(get_db),
) -> list[ThreatChunkManifestItem]:
    return await threat_service.get_threat_manifest(db)


@router.get(
    "/chunk/{chunk_id}",
    response_model=ThreatChunkOut,
    summary="Get threats for a chunk",
    description="Returns threats for a manifest chunk with optional pagination.",
)
async def get_threat_chunk(
    chunk_id: str,
    cursor: str | None = None,
    page_size: int = Query(5000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
) -> ThreatChunkOut:
    return await threat_service.get_threat_chunk(chunk_id, db, cursor, page_size)


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