from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.detection import ThreatDetectionService
from app.logging_config import log_data_saved, log_detection_result, log_tcp_payload_received, log_websocket_broadcast
from app.models.sensor import Sensor, SensorStatus, SensorType
from app.models.sensor_reading import LidarReading, RadarReading, ReadingStatus
from app.models.threat_log import ThreatLog, ThreatSeverity
from app.schemas.ingest import SensorIngestPayload, SensorIngestResponse
from app.services.threat_service import threat_service


class IngestionService:
    def __init__(self, *, inactive_after_seconds: int = 6) -> None:
        self.inactive_after = timedelta(seconds=inactive_after_seconds)
        self.detector = ThreatDetectionService()

    async def ingest_sensor_payload(
        self,
        payload: SensorIngestPayload,
        db: AsyncSession,
    ) -> SensorIngestResponse:
        sensor = await self._upsert_sensor(payload, db)

        # Log TCP payload reception
        log_tcp_payload_received(payload.sensor_id, payload.type)

        # Run threat detection
        detections_payload = self.detector.process(payload.model_dump(mode="json"))
        detected_objects = detections_payload.get("detected_objects", [])

        # Log detection results in real-time
        log_detection_result(payload.sensor_id, payload.type, detected_objects)

        reading_status = ReadingStatus.threat if detected_objects else ReadingStatus.ok

        try:
            if payload.type == "radar":
                db.add(self._to_radar_reading(payload, reading_status))
            else:
                db.add(self._to_lidar_reading(payload, reading_status))

            saved_threats = await self._save_threats(
                payload=payload,
                detected_objects=detected_objects,
                db=db,
            )

            sensor.last_ping = payload.timestamp
            sensor.status = SensorStatus.active

            await self._mark_stale_sensors_inactive(db)
            await db.flush()

            # Log database saves
            log_data_saved(
                f"{payload.type.upper()}_READINGS",
                payload.sensor_id,
                1,
            )
            if saved_threats > 0:
                log_data_saved("THREAT_LOGS", payload.sensor_id, saved_threats)
                # Log WebSocket broadcast
                max_severity = max(
                    (obj.get("severity", "low") for obj in detected_objects),
                    default="low"
                )
                log_websocket_broadcast(saved_threats, payload.sensor_id, max_severity)

            return SensorIngestResponse(
                sensor_id=payload.sensor_id,
                sensor_type=payload.type,
                sensor_status=sensor.status.value,
                detected_objects=len(detected_objects),
                saved_threats=saved_threats,
                timestamp=payload.timestamp,
            )
        except Exception:
            sensor.status = SensorStatus.error
            await db.flush()
            raise

    async def _upsert_sensor(self, payload: SensorIngestPayload, db: AsyncSession) -> Sensor:
        sensor = await db.get(Sensor, payload.sensor_id)

        if sensor is None:
            sensor = Sensor(
                sensor_id=payload.sensor_id,
                sensor_type=SensorType(payload.type),
                status=SensorStatus.active,
                lat=payload.lat if payload.lat is not None else 0.0,
                lng=payload.lng if payload.lng is not None else 0.0,
                location=payload.location or "Unknown",
                coverage_radius_m=50.0,
                last_ping=payload.timestamp,
            )
            db.add(sensor)
            await db.flush()
            return sensor

        sensor.sensor_type = SensorType(payload.type)
        if payload.lat is not None:
            sensor.lat = payload.lat
        if payload.lng is not None:
            sensor.lng = payload.lng
        if payload.location is not None:
            sensor.location = payload.location

        return sensor

    def _to_radar_reading(
        self,
        payload: SensorIngestPayload,
        reading_status: ReadingStatus,
    ) -> RadarReading:
        raw = payload.raw_detection
        return RadarReading(
            sensor_id=payload.sensor_id,
            timestamp=payload.timestamp,
            status=reading_status,
            range_m=float(raw["range_m"]),
            azimuth_deg=float(raw["azimuth_deg"]),
            elevation_deg=float(raw["elevation_deg"]),
            radial_velocity_mps=float(raw["radial_velocity_mps"]),
            rcs_dbsm=float(raw["rcs_dbsm"]),
            snr_db=float(raw["snr_db"]),
        )

    def _to_lidar_reading(
        self,
        payload: SensorIngestPayload,
        reading_status: ReadingStatus,
    ) -> LidarReading:
        raw = payload.raw_detection
        bbox = raw["bounding_box"]
        centroid = raw["centroid"]
        return LidarReading(
            sensor_id=payload.sensor_id,
            timestamp=payload.timestamp,
            status=reading_status,
            bbox_x_min=float(bbox["x_min"]),
            bbox_y_min=float(bbox["y_min"]),
            bbox_z_min=float(bbox["z_min"]),
            bbox_x_max=float(bbox["x_max"]),
            bbox_y_max=float(bbox["y_max"]),
            bbox_z_max=float(bbox["z_max"]),
            centroid_x=float(centroid["x"]),
            centroid_y=float(centroid["y"]),
            centroid_z=float(centroid["z"]),
            point_count=int(raw["point_count"]),
            intensity_avg=float(raw["intensity_avg"]),
            velocity_mps=float(raw["velocity_mps"]),
            aspect_ratio=float(raw["aspect_ratio"]),
            point_density_ppm2=float(raw["point_density_ppm2"]),
        )

    async def _save_threats(
        self,
        *,
        payload: SensorIngestPayload,
        detected_objects: list[dict[str, Any]],
        db: AsyncSession,
    ) -> int:
        saved = 0

        for detected_object in detected_objects:
            severity = self._map_severity(detected_object.get("severity"))
            threat = ThreatLog(
                sensor_id=payload.sensor_id,
                sensor_type=payload.type,
                threat_type=str(detected_object.get("type", "unknown")),
                confidence=float(detected_object.get("confidence", 0.0)),
                severity=severity,
                timestamp=payload.timestamp,
            )
            db.add(threat)
            await db.flush()  # Flush to generate alert_id from database
            saved += 1

            await threat_service.push_alert(
                {
                    "alert_id": threat.alert_id,
                    "sensor_id": payload.sensor_id,
                    "sensor_type": payload.type,
                    "threat_type": threat.threat_type,
                    "confidence": threat.confidence,
                    "severity": threat.severity.value,
                    "timestamp": payload.timestamp.isoformat(),
                }
            )

        return saved

    async def _mark_stale_sensors_inactive(self, db: AsyncSession) -> None:
        stale_cutoff = datetime.now(UTC) - self.inactive_after
        stale_query = select(Sensor).where(
            Sensor.last_ping.is_not(None),
            Sensor.last_ping < stale_cutoff,
            Sensor.status == SensorStatus.active,
        )
        result = await db.execute(stale_query)
        for sensor in result.scalars().all():
            sensor.status = SensorStatus.inactive

    def _map_severity(self, severity: Any) -> ThreatSeverity:
        value = str(severity or "LOW").upper()
        if value in {"CRITICAL", "HIGH"}:
            return ThreatSeverity.high
        if value == "MEDIUM":
            return ThreatSeverity.med
        return ThreatSeverity.low


ingestion_service = IngestionService()
