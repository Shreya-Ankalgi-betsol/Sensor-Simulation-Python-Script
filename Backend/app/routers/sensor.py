from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.sensor import SensorCreate, SensorOut, SensorUpdate
from app.services.sensor_service import sensor_service

router = APIRouter(
    prefix="/api/v1/sensors",
    tags=["Sensors"],
)


@router.get(
    "",
    response_model=list[SensorOut],
    summary="Get all sensors",
    description="Returns a list of all registered sensors ordered by creation date.",
)
async def get_all_sensors(
    db: AsyncSession = Depends(get_db),
) -> list[SensorOut]:
    return await sensor_service.get_all_sensors(db)


@router.post(
    "",
    response_model=SensorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new sensor",
    description="Creates a new sensor. Status defaults to offline on creation.",
)
async def create_sensor(
    data: SensorCreate,
    db: AsyncSession = Depends(get_db),
) -> SensorOut:
    return await sensor_service.create_sensor(data, db)


@router.get(
    "/{sensor_id}",
    response_model=SensorOut,
    summary="Get a single sensor",
    description="Returns a single sensor by its ID.",
)
async def get_sensor(
    sensor_id: str,
    db: AsyncSession = Depends(get_db),
) -> SensorOut:
    return await sensor_service.get_sensor(sensor_id, db)


@router.put(
    "/{sensor_id}",
    response_model=SensorOut,
    summary="Update a sensor",
    description="Updates lat, lng, or coverage_radius_m of an existing sensor.",
)
async def update_sensor(
    sensor_id: str,
    data: SensorUpdate,
    db: AsyncSession = Depends(get_db),
) -> SensorOut:
    return await sensor_service.update_sensor(sensor_id, data, db)