from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor, SensorStatus
from app.schemas.sensor import SensorCreate, SensorOut, SensorUpdate


class SensorService:

    # Get all sensors 
    async def get_all_sensors(self, db: AsyncSession) -> list[SensorOut]:
        result = await db.execute(
            select(Sensor).order_by(Sensor.created_at.desc())
        )
        sensors = result.scalars().all()
        return [SensorOut.model_validate(s) for s in sensors]

    # Get single sensor 

    async def get_sensor(self, sensor_id: str, db: AsyncSession) -> SensorOut:
        sensor = await db.get(Sensor, sensor_id)
        if not sensor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sensor '{sensor_id}' not found.",
            )
        return SensorOut.model_validate(sensor)

    # Create sensor 
    async def create_sensor(
        self, data: SensorCreate, db: AsyncSession
    ) -> SensorOut:
        existing = await db.get(Sensor, data.sensor_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sensor '{data.sensor_id}' already exists.",
            )
        sensor = Sensor(
            sensor_id=data.sensor_id,
            sensor_type=data.sensor_type,
            lat=data.lat,
            lng=data.lng,
            coverage_radius_m=data.coverage_radius_m,
            status=SensorStatus.offline,
        )
        db.add(sensor)
        await db.flush()
        await db.refresh(sensor)
        return SensorOut.model_validate(sensor)

    #  Update sensor 
    async def update_sensor(
        self, sensor_id: str, data: SensorUpdate, db: AsyncSession
    ) -> SensorOut:
        sensor = await db.get(Sensor, sensor_id)
        if not sensor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sensor '{sensor_id}' not found.",
            )
        if data.lat is not None:
            sensor.lat = data.lat
        if data.lng is not None:
            sensor.lng = data.lng
        if data.coverage_radius_m is not None:
            sensor.coverage_radius_m = data.coverage_radius_m

        await db.flush()
        await db.refresh(sensor)
        return SensorOut.model_validate(sensor)


sensor_service = SensorService()