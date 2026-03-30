from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.ingest import SensorIngestPayload, SensorIngestResponse
from app.services.ingestion_service import ingestion_service

router = APIRouter(
    prefix="/api/v1/ingest",
    tags=["Ingest"],
)


@router.post(
    "/sensor",
    response_model=SensorIngestResponse,
    summary="Ingest a single sensor payload",
    description=(
        "Writes one radar/lidar reading, runs threat detection immediately, "
        "stores threat logs, and updates sensor activity status."
    ),
)
async def ingest_sensor_payload(
    payload: SensorIngestPayload,
    db: AsyncSession = Depends(get_db),
) -> SensorIngestResponse:
    return await ingestion_service.ingest_sensor_payload(payload, db)
