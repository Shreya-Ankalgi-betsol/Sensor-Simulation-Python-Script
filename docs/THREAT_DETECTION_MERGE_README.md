# Backend Merge Note (Backend + backend_old threat layer)

## 1) What is already present in `Backend/` (current actual backend)

### App + Infra
- FastAPI app with router wiring: `app/main.py`
- Config + DB URL builder: `app/config.py`
- Async SQLAlchemy session + engine in `app/db/session.py`
- Startup auto table creation + Timescale hypertable setup for:
  - `radar_readings`
  - `lidar_readings`

### Domain models already present
- Sensors: `app/models/sensor.py`
  - has `status` enum: `active | inactive | error`
  - has `last_ping`
- Readings: `app/models/sensor_reading.py`
  - `RadarReading`, `LidarReading`
- Threat logs: `app/models/threat_log.py`
- Users: `app/models/user.py`
- `app/models/trajectory.py` exists but currently empty

### APIs already present
- Sensors: `app/routers/sensor.py`
  - CRUD + `/summary`
- Threats: `app/routers/threat.py`
  - list + `/summary`
- Analytics: `app/routers/analytics.py`
- WebSocket endpoint: `app/routers/websocket.py` (`/ws`)
- Users: `app/routers/user.py`

### Service layer already present
- `sensor_service.py` (CRUD + summary)
- `threat_service.py` (query, pagination, summary, websocket push helper)
- `analytics_service.py`
- `ws_session_manager.py`

## 2) What is available in `backend_old/` and should be merged

### Data generation + ingestion flow (working in old stack)
- Multi-sensor data generator:
  - `backend_old/server/sensors.py`
  - `backend_old/server/multi_sensor_simulator.py`
- TCP ingest server receiving live sensor packets:
  - `backend_old/server/tcp_server.py`

### Threat detection business logic (working in old stack)
- Orchestrator:
  - `backend_old/internal/services/threat_detection_service.py`
- Detectors:
  - `backend_old/internal/detectors/base_detector.py`
  - `backend_old/internal/detectors/radar_detector.py`
  - `backend_old/internal/detectors/lidar_detector.py`
  - `backend_old/internal/detectors/severity_engine.py`
  - `backend_old/internal/detectors/temporal_tracker.py`

### Legacy DB layer (SQLite only)
- `backend_old/database/sqlite_db.py`
- `backend_old/database/__init__.py`

## 3) Gap summary (what is missing in `Backend/` today)

1. No ingestion endpoint/consumer in `Backend/` that accepts live sensor payloads from simulator.
2. No detector pipeline wired into `Backend/` service flow (radar/lidar rules + temporal confirmation are not integrated there yet).
3. Sensor `status` and `last_ping` are modeled, but not automatically updated from incoming stream in `Backend/`.
4. No persistence path from detector output into `ThreatLog` from live ingestion in `Backend/`.
5. Old SQLite DB helper should **not** be copied as-is; `Backend/` is already Postgres/Timescale via `session.py`.

## 4) What to keep vs what to migrate

### Keep as-is in `Backend/`
- `app/db/session.py` (this is the correct DB session layer)
- SQLAlchemy models/schemas/routers/services structure
- Timescale hypertable creation logic

### Migrate/adapt from `backend_old/`
- Detection business rules (detectors + temporal tracker + severity)
- Payload validation logic from base detector
- Simulator payload contract (or adapter) for live input

### Do NOT directly copy
- Old SQLite CRUD layer (`backend_old/database/sqlite_db.py`) into `Backend/app/db`
- Old monolithic TCP server as-is

## 5) Recommended merge plan (safe order)

### Step A: Introduce threat engine module in `Backend`
Create a dedicated package, e.g. `Backend/app/detection/`:
- `base_detector.py`
- `radar_detector.py`
- `lidar_detector.py`
- `severity_engine.py`
- `temporal_tracker.py`
- `threat_detection_service.py` (adapted for async DB session usage)

### Step B: Add ingestion entrypoint in `Backend`
Pick one approach:
1. FastAPI HTTP ingest endpoint (recommended first for simplicity), or
2. Background TCP/WebSocket consumer integrated into app startup.

Input should match simulator payload format:
- `sensor_id`, `type`, `timestamp`, `raw_detection`

### Step C: Wire status updates (mentor requirement)
On each valid incoming payload:
- update/create sensor
- set `last_ping = payload.timestamp`
- set `status = active`
On processing/storage exception:
- set `status = error`
Background stale check job:
- if no ping for threshold (ex: > 6s), set `status = inactive`

### Step D: Persist readings + threats in current DB
- Save radar/lidar payload into `RadarReading` / `LidarReading`
- Run detector pipeline
- Persist confirmed detections to `ThreatLog`
- Broadcast threat events via `ws_session_manager`

### Step E: Keep analytics/threat APIs unchanged
Existing APIs in routers/services can continue to read from `ThreatLog` after ingestion is integrated.

## 6) Suggested run architecture after merge

- Terminal 1: `Backend` FastAPI app (includes ingestion + detection)
- Terminal 2: Simulator (`backend_old/server/multi_sensor_simulator.py`) until new simulator is moved
- Optional Terminal 3: Frontend

## 7) Current conclusion

`Backend/` already has strong API + DB architecture.
Main missing piece is **live ingestion + detector pipeline wiring** from `backend_old` into this architecture.

So your work should be: **migrate business logic, not files blindly**.
Use `session.py` and SQLAlchemy models as target, and adapt old detection/incoming-stream logic into service modules.
