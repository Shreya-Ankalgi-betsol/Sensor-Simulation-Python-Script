from datetime import datetime, timezone
import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.models.sensor import Sensor, SensorStatus
from app.schemas.sensor import SensorCreate, SensorOut, SensorSummaryOut, SensorUpdate

logger = logging.getLogger(__name__)
COORD_EPSILON = 1e-9

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

        duplicate_location_result = await db.execute(
            select(Sensor).where(
                func.abs(Sensor.lat - data.lat) <= COORD_EPSILON,
                func.abs(Sensor.lng - data.lng) <= COORD_EPSILON,
            )
        )
        duplicate_location_sensor = duplicate_location_result.scalar_one_or_none()
        if duplicate_location_sensor:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A sensor already exists at the provided coordinates "
                    f"(lat={data.lat}, lng={data.lng}) with id "
                    f"'{duplicate_location_sensor.sensor_id}'."
                ),
            )

        sensor = Sensor(
            sensor_id=data.sensor_id,
            sensor_type=data.sensor_type,
            lat=data.lat,
            lng=data.lng,
            location=data.location,
            coverage_radius_m=data.coverage_radius_m,
            status=SensorStatus.inactive,
        )
        db.add(sensor)
        try:
            await db.flush()
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A sensor with the same coordinates or id already exists."
                ),
            )
        await db.refresh(sensor)
        return SensorOut.model_validate(sensor)

    #  Update sensor 
    async def update_sensor(
        self, sensor_id: str, data: SensorUpdate, db: AsyncSession
    ) -> SensorOut:
        logger.info(f"Updating sensor {sensor_id} with data: {data}")
        
        sensor = await db.get(Sensor, sensor_id)
        if not sensor:
            logger.warning(f"Sensor {sensor_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sensor '{sensor_id}' not found.",
            )
        
        logger.debug(f"Current sensor state: lat={sensor.lat}, lng={sensor.lng}, location={sensor.location}")
        
        # Build update data
        update_dict = {}
        if data.lat is not None:
            update_dict["lat"] = data.lat
        if data.lng is not None:
            update_dict["lng"] = data.lng
        if data.location is not None:
            update_dict["location"] = data.location
        if data.coverage_radius_m is not None:
            update_dict["coverage_radius_m"] = data.coverage_radius_m

        logger.debug(f"Update dict: {update_dict}")

        target_lat = data.lat if data.lat is not None else sensor.lat
        target_lng = data.lng if data.lng is not None else sensor.lng
        duplicate_location_result = await db.execute(
            select(Sensor).where(
                Sensor.sensor_id != sensor_id,
                func.abs(Sensor.lat - target_lat) <= COORD_EPSILON,
                func.abs(Sensor.lng - target_lng) <= COORD_EPSILON,
            )
        )
        duplicate_location_sensor = duplicate_location_result.scalar_one_or_none()
        if duplicate_location_sensor:
            logger.warning(f"Duplicate location found for sensor {sensor_id}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Another sensor already exists at the provided coordinates "
                    f"(lat={target_lat}, lng={target_lng}) with id "
                    f"'{duplicate_location_sensor.sensor_id}'."
                ),
            )

        # Apply updates to sensor object
        for key, value in update_dict.items():
            setattr(sensor, key, value)
        
        db.add(sensor)
        try:
            await db.flush()
            logger.info(f"Flushed changes for sensor {sensor_id}")
        except IntegrityError as e:
            logger.error(f"Integrity error when updating sensor {sensor_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A sensor with the same coordinates already exists."
                ),
            )
        
        await db.refresh(sensor)
        logger.info(f"Refreshed sensor {sensor_id}: lat={sensor.lat}, lng={sensor.lng}, location={sensor.location}")
        
        return SensorOut.model_validate(sensor)

    #  Sensor summary
    async def get_sensor_summary(self, db: AsyncSession) -> SensorSummaryOut:
    # Total count
        total_result = await db.execute(
            select(func.count(Sensor.sensor_id))
        )
        total_count = total_result.scalar_one()

        # Active count
        active_result = await db.execute(
            select(func.count(Sensor.sensor_id)).where(
                Sensor.status == SensorStatus.active
            )
        )
        active_count = active_result.scalar_one()

        # Inactive count
        inactive_result = await db.execute(
            select(func.count(Sensor.sensor_id)).where(
                Sensor.status == SensorStatus.inactive
            )
        )
        inactive_count = inactive_result.scalar_one()

        # Error count
        error_result = await db.execute(
            select(func.count(Sensor.sensor_id)).where(
                Sensor.status == SensorStatus.error
            )
        )
        error_count = error_result.scalar_one()

        return SensorSummaryOut(
            total_count=total_count,
            active_count=active_count,
            inactive_count=inactive_count,
            error_count=error_count,
        )
sensor_service = SensorService()