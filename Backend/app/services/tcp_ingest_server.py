import asyncio
import json
import logging
from typing import Any

from pydantic import ValidationError

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.schemas.ingest import SensorIngestPayload
from app.services.ingestion_service import ingestion_service

logger = logging.getLogger(__name__)


class TCPIngestServer:
    def __init__(self, host: str, port: int) -> None:
        self.host = host
        self.port = port
        self._server: asyncio.base_events.Server | None = None
        self._client_tasks: set[asyncio.Task[Any]] = set()

    @property
    def is_running(self) -> bool:
        return self._server is not None

    async def start(self) -> None:
        if self._server is not None:
            return

        self._server = await asyncio.start_server(self._handle_client, self.host, self.port)
        logger.info("TCP ingest server listening on %s:%s", self.host, self.port)

    async def stop(self) -> None:
        if self._server is None:
            return

        self._server.close()
        await self._server.wait_closed()
        self._server = None

        tasks = list(self._client_tasks)
        for task in tasks:
            task.cancel()

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        logger.info("TCP ingest server stopped")

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        task = asyncio.current_task()
        if task is not None:
            self._client_tasks.add(task)

        peer = writer.get_extra_info("peername")
        logger.info("TCP client connected: %s", peer)

        decoder = json.JSONDecoder()
        buffer = ""

        try:
            while True:
                data = await reader.read(4096)
                if not data:
                    break

                buffer += data.decode("utf-8", errors="ignore")
                buffer = await self._process_buffer(buffer, decoder)

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("TCP client error (%s): %s", peer, exc)
        finally:
            if task is not None:
                self._client_tasks.discard(task)
            writer.close()
            await writer.wait_closed()
            logger.info("TCP client disconnected: %s", peer)

    async def _process_buffer(self, buffer: str, decoder: json.JSONDecoder) -> str:
        while buffer:
            stripped = buffer.lstrip()
            if stripped is not buffer:
                buffer = stripped

            try:
                message, index = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                return buffer

            buffer = buffer[index:]
            await self._process_message(message)

        return buffer

    async def _process_message(self, message: Any) -> None:
        if not isinstance(message, dict):
            logger.debug("Skipping non-object TCP payload: %s", type(message))
            return

        try:
            payload = SensorIngestPayload.model_validate(message)
        except ValidationError as exc:
            logger.warning("Invalid TCP payload: %s", exc)
            return

        async with AsyncSessionLocal() as db:
            try:
                await ingestion_service.ingest_sensor_payload(payload, db)
                await db.commit()
            except Exception as exc:
                await db.rollback()
                logger.exception("TCP ingest processing failed: %s", exc)


tcp_ingest_server = TCPIngestServer(
    host=settings.tcp_ingest_host,
    port=settings.tcp_ingest_port,
)
