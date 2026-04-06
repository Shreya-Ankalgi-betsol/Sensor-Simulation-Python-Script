import asyncio
import json
from datetime import datetime

import mock_ws_server


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[str] = []

    async def send(self, message: str) -> None:
        self.messages.append(message)


def test_utc_now_returns_iso_utc_timestamp() -> None:
    value = mock_ws_server.utc_now()
    parsed = datetime.fromisoformat(value)
    assert parsed.tzinfo is not None


def test_producer_sends_snapshot_first() -> None:
    ws = FakeWebSocket()

    async def run_once() -> None:
        try:
            await asyncio.wait_for(mock_ws_server.producer(ws), timeout=0.05)
        except TimeoutError:
            # Expected because producer runs forever after initial snapshot.
            pass

    asyncio.run(run_once())

    assert ws.messages, "Expected at least one message from producer"
    first = json.loads(ws.messages[0])
    assert first["type"] == "snapshot"
    assert isinstance(first["sensors"], list)
    assert isinstance(first["objects"], list)
