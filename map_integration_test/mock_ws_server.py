import asyncio
import json
import random
from datetime import datetime, timezone

import websockets


def utc_now():
    return datetime.now(timezone.utc).isoformat()


SENSORS = {
    "S-101": {"id": "S-101", "name": "Radar North", "lat": 19.091, "lng": 72.881, "active": True, "last_seen": utc_now()},
    "S-102": {"id": "S-102", "name": "Lidar East", "lat": 19.073, "lng": 72.905, "active": True, "last_seen": utc_now()},
    "S-103": {"id": "S-103", "name": "Radar South", "lat": 19.052, "lng": 72.873, "active": False, "last_seen": utc_now()},
}

OBJECTS = {
    "O-1": {"id": "O-1", "sensor_id": "S-101", "lat": 19.088, "lng": 72.882, "is_threat": False, "speed": 12.4},
    "O-2": {"id": "O-2", "sensor_id": "S-102", "lat": 19.075, "lng": 72.901, "is_threat": True, "speed": 20.1},
    "O-3": {"id": "O-3", "sensor_id": "S-103", "lat": 19.053, "lng": 72.871, "is_threat": False, "speed": 9.8},
}


async def producer(websocket):
    snapshot = {
        "type": "snapshot",
        "sensors": list(SENSORS.values()),
        "objects": list(OBJECTS.values()),
    }
    await websocket.send(json.dumps(snapshot))

    while True:
        await asyncio.sleep(1.2)

        sensor_id = random.choice(list(SENSORS.keys()))
        sensor = SENSORS[sensor_id]
        sensor["active"] = random.random() > 0.2
        sensor["last_seen"] = utc_now()

        await websocket.send(json.dumps({"type": "sensor_update", "sensor": sensor}))

        object_id = random.choice(list(OBJECTS.keys()))
        obj = OBJECTS[object_id]
        obj["is_threat"] = random.random() > 0.7
        obj["lat"] += (random.random() - 0.5) * 0.002
        obj["lng"] += (random.random() - 0.5) * 0.002
        obj["speed"] = round(8 + random.random() * 25, 1)

        await websocket.send(json.dumps({"type": "object_update", "object": obj}))


async def handler(websocket):
    await producer(websocket)


async def main():
    print("WebSocket mock server running on ws://localhost:8765")
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())