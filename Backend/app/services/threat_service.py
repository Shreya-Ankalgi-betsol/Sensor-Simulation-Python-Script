import base64
import json
import math
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor, SensorStatus
from app.models.threat_log import ThreatLog, ThreatSeverity
from app.services.ws_session_manager import session_manager
from app.schemas.threat import (
    PagedThreats,
    ThreatChunkManifestItem,
    ThreatChunkOut,
    ThreatFilter,
    ThreatOut,
    ThreatSummaryOut,
)


class ThreatService:

    def __init__(self) -> None:
        self._manifest_cache: list[ThreatChunkManifestItem] | None = None
        self._manifest_cache_time: datetime | None = None
        self._manifest_lookup: dict[str, ThreatChunkManifestItem] = {}

    # Chunk manifest settings
    _manifest_window_hours = 12
    _manifest_cache_ttl_seconds = 60
    _max_threats_per_chunk = 5000
    _base_bucket_seconds = 60
    _overflow_bucket_seconds = 5
    _max_chunk_seconds = 6 * 60 * 60
    _min_chunk_seconds = 60

    # Cursor encoding / decoding

    def _encode_cursor(self, timestamp: datetime, alert_id: str) -> str:
        raw = json.dumps({
            "timestamp": timestamp.isoformat(),
            "alert_id": alert_id,
        })
        return base64.urlsafe_b64encode(raw.encode()).decode()

    def _decode_cursor(self, cursor: str) -> tuple[datetime, str]:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(raw)
        return datetime.fromisoformat(data["timestamp"]), data["alert_id"]

    # Align a datetime to a bucket boundary
    def _align_time(self, value: datetime, bucket_seconds: int, direction: str) -> datetime:
        timestamp = value.timestamp()
        if direction == "ceil":
            aligned = math.ceil(timestamp / bucket_seconds) * bucket_seconds
        else:
            aligned = math.floor(timestamp / bucket_seconds) * bucket_seconds
        return datetime.fromtimestamp(aligned, tz=timezone.utc)

    # Ensure timestamps are timezone-aware UTC
    def _to_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    # Build bucket counts for a time range
    async def _fetch_bucket_counts(
        self,
        db: AsyncSession,
        start_time: datetime,
        end_time: datetime,
        bucket_seconds: int,
    ) -> list[dict[str, object]]:
        bucket_index = func.floor(
            func.extract("epoch", ThreatLog.timestamp) / bucket_seconds
        ).label("bucket_index")
        query = (
            select(
                bucket_index,
                func.count(ThreatLog.alert_id).label("count"),
            )
            .where(
                ThreatLog.timestamp >= start_time,
                ThreatLog.timestamp < end_time,
            )
            .group_by(bucket_index)
            .order_by(bucket_index.asc())
        )
        result = await db.execute(query)
        rows = result.all()

        counts_by_index = {int(row.bucket_index): int(row.count) for row in rows}
        start_index = int(math.floor(start_time.timestamp() / bucket_seconds))
        bucket_count = int(
            math.ceil((end_time.timestamp() - start_time.timestamp()) / bucket_seconds)
        )

        buckets: list[dict[str, object]] = []
        for offset in range(max(0, bucket_count)):
            index = start_index + offset
            bucket_start = datetime.fromtimestamp(index * bucket_seconds, tz=timezone.utc)
            bucket_end = bucket_start + timedelta(seconds=bucket_seconds)
            buckets.append(
                {
                    "start": bucket_start,
                    "end": bucket_end,
                    "count": counts_by_index.get(index, 0),
                    "bucket_seconds": bucket_seconds,
                }
            )

        return buckets

    # Split overflow buckets into smaller intervals when counts exceed the max
    async def _split_overflow_buckets(
        self,
        db: AsyncSession,
        buckets: list[dict[str, object]],
    ) -> list[dict[str, object]]:
        refined: list[dict[str, object]] = []

        for bucket in buckets:
            count = int(bucket["count"])
            bucket_seconds = int(bucket["bucket_seconds"])
            if count <= self._max_threats_per_chunk or bucket_seconds <= self._overflow_bucket_seconds:
                refined.append(bucket)
                continue

            start_time = bucket["start"]
            end_time = bucket["end"]
            sub_buckets = await self._fetch_bucket_counts(
                db, start_time, end_time, self._overflow_bucket_seconds
            )
            refined.extend(sub_buckets)

        return refined

    # Build a chunk label based on density
    def _label_chunk(self, threat_count: int) -> str:
        if threat_count < self._max_threats_per_chunk * 0.1:
            return "sparse"
        if threat_count < self._max_threats_per_chunk * 0.5:
            return "medium"
        return "dense"

    # Assemble adaptive chunks from bucket counts
    def _build_chunks(self, buckets: list[dict[str, object]]) -> list[dict[str, object]]:
        chunks: list[dict[str, object]] = []
        current_start: datetime | None = None
        current_end: datetime | None = None
        current_count = 0

        for bucket in buckets:
            bucket_start = bucket["start"]
            bucket_end = bucket["end"]
            bucket_count = int(bucket["count"])

            if current_start is None:
                current_start = bucket_start

            next_count = current_count + bucket_count
            next_end = bucket_end
            duration_seconds = int((next_end - current_start).total_seconds())

            should_close = (
                current_count > 0
                and (
                    next_count > self._max_threats_per_chunk
                    or duration_seconds > self._max_chunk_seconds
                )
            )

            if should_close:
                chunks.append(
                    {
                        "start": current_start,
                        "end": current_end or current_start,
                        "count": current_count,
                    }
                )
                current_start = bucket_start
                current_count = 0

            current_count += bucket_count
            current_end = bucket_end

        if current_start is not None and current_end is not None:
            chunks.append(
                {
                    "start": current_start,
                    "end": current_end,
                    "count": current_count,
                }
            )

        return chunks

    # Get adaptive manifest for the last 12 hours
    async def get_threat_manifest(
        self,
        db: AsyncSession,
    ) -> list[ThreatChunkManifestItem]:
        now = datetime.now(timezone.utc)
        cache_time = self._manifest_cache_time

        if self._manifest_cache and cache_time:
            if (now - cache_time).total_seconds() < self._manifest_cache_ttl_seconds:
                return self._manifest_cache

        window_end = self._align_time(now, self._base_bucket_seconds, "ceil")
        window_start = window_end - timedelta(hours=self._manifest_window_hours)

        buckets = await self._fetch_bucket_counts(
            db,
            window_start,
            window_end,
            self._base_bucket_seconds,
        )
        buckets = await self._split_overflow_buckets(db, buckets)
        chunks = self._build_chunks(buckets)

        manifest: list[ThreatChunkManifestItem] = []
        for index, chunk in enumerate(chunks, start=1):
            chunk_id = f"chunk_{index:03d}"
            manifest.append(
                ThreatChunkManifestItem(
                    chunk_id=chunk_id,
                    start_time=chunk["start"],
                    end_time=chunk["end"],
                    threat_count=int(chunk["count"]),
                    label=self._label_chunk(int(chunk["count"])),
                )
            )

        self._manifest_cache = manifest
        self._manifest_cache_time = now
        self._manifest_lookup = {item.chunk_id: item for item in manifest}

        return manifest

    # Load a chunk of threats by chunk id
    async def get_threat_chunk(
        self,
        chunk_id: str,
        db: AsyncSession,
        cursor: str | None,
        page_size: int,
    ) -> ThreatChunkOut:
        await self.get_threat_manifest(db)
        chunk_meta = self._manifest_lookup.get(chunk_id)

        if not chunk_meta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chunk not found",
            )

        start_time = self._to_utc(chunk_meta.start_time)
        end_time = self._to_utc(chunk_meta.end_time)

        query = select(ThreatLog).where(
            ThreatLog.timestamp >= start_time,
            ThreatLog.timestamp < end_time,
        )

        if cursor is not None:
            cursor_timestamp, cursor_alert_id = self._decode_cursor(cursor)
            query = query.where(
                or_(
                    ThreatLog.timestamp > cursor_timestamp,
                    and_(
                        ThreatLog.timestamp == cursor_timestamp,
                        ThreatLog.alert_id > cursor_alert_id,
                    ),
                )
            )

        query = (
            query
            .order_by(ThreatLog.timestamp.asc(), ThreatLog.alert_id.asc())
            .limit(page_size)
        )

        result = await db.execute(query)
        threats = result.scalars().all()

        next_cursor = None
        if len(threats) == page_size:
            last = threats[-1]
            next_cursor = self._encode_cursor(last.timestamp, last.alert_id)

        has_more = next_cursor is not None

        return ThreatChunkOut(
            chunk_id=chunk_meta.chunk_id,
            start_time=chunk_meta.start_time,
            end_time=chunk_meta.end_time,
            threat_count=chunk_meta.threat_count,
            items=[ThreatOut.model_validate(t) for t in threats],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    # Get threats (filtered + cursor paginated)
    async def get_threats(
        self, filters: ThreatFilter, db: AsyncSession
    ) -> PagedThreats:
        query = select(ThreatLog)

        severity_values: list[ThreatSeverity] | None = None
        if filters.severity:
            severity_values = [ThreatSeverity(value) for value in filters.severity]

        # Apply filters
        if filters.sensor_type:
            query = query.where(ThreatLog.sensor_type.in_(filters.sensor_type))
        if filters.sensor_id:
            query = query.where(ThreatLog.sensor_id.in_(filters.sensor_id))
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type.in_(filters.threat_type))
        if severity_values:
            query = query.where(ThreatLog.severity.in_(severity_values))
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
        if filters.sensor_type:
            high_severity_query = high_severity_query.where(ThreatLog.sensor_type.in_(filters.sensor_type))
        if filters.sensor_id:
            high_severity_query = high_severity_query.where(ThreatLog.sensor_id.in_(filters.sensor_id))
        if filters.threat_type:
            high_severity_query = high_severity_query.where(ThreatLog.threat_type.in_(filters.threat_type))
        # Always filter for high severity in this count (regardless of user's severity filter)
        high_severity_query = high_severity_query.where(ThreatLog.severity == ThreatSeverity.high)
        if filters.from_dt is not None:
            high_severity_query = high_severity_query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt is not None:
            high_severity_query = high_severity_query.where(ThreatLog.timestamp <= filters.to_dt)
        # If user filtered by severity, AND it's not "high", then high severity count is 0
        if severity_values is not None and ThreatSeverity.high not in severity_values:
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

    # Push alert (called by detection engine)
    async def push_alert(self, alert_data: dict, db: AsyncSession | None = None) -> None:
        # Broadcast threat to all connected WebSocket clients in frontend format
        await session_manager.broadcast_threat(alert_data)

        # Broadcast updated summary stats
        if db:
            await self.broadcast_summary_update(db)

    async def get_threat_summary(
        self, filters: ThreatFilter, db: AsyncSession
    ) -> ThreatSummaryOut:

        # Base query for threats
        query = select(ThreatLog)
        if filters.sensor_type:
            query = query.where(ThreatLog.sensor_type == filters.sensor_type)
        if filters.sensor_id:
            query = query.where(ThreatLog.sensor_id == filters.sensor_id)
        if filters.threat_type:
            query = query.where(ThreatLog.threat_type == filters.threat_type)
        if filters.severity:
            query = query.where(ThreatLog.severity == filters.severity)
        if filters.from_dt:
            query = query.where(ThreatLog.timestamp >= filters.from_dt)
        if filters.to_dt:
            query = query.where(ThreatLog.timestamp <= filters.to_dt)

        # Total threats (with filters)
        total_result = await db.execute(
            select(func.count(ThreatLog.alert_id)).select_from(query.subquery())
        )
        total_threats = total_result.scalar_one()

        # High severity count (with filters)
        high_severity_query = query.where(ThreatLog.severity == ThreatSeverity.high)
        high_result = await db.execute(
            select(func.count(ThreatLog.alert_id)).select_from(high_severity_query.subquery())
        )
        high_severity_count = high_result.scalar_one()

        # Active sensor count (remains unfiltered)
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

    async def broadcast_summary_update(self, db: AsyncSession) -> None:
        """Calculate current threat summary and broadcast to all connected clients."""
        # Use empty filter to get global summary
        empty_filter = ThreatFilter()
        summary = await self.get_threat_summary(empty_filter, db)
        await session_manager.broadcast_summary_update(summary.model_dump())


threat_service = ThreatService()
