# Backend Technical Documentation

This document provides a detailed overview of the backend system for the Sensor Simulation and Threat Analysis platform.

---

## Deliverable 1: Technical Architecture Documentation

### 1. Project Overview

**System Purpose**

The backend for the Sensor Simulation System serves as the central data processing and management hub. Its core responsibilities include:
- Providing a management interface for simulated sensors.
- Storing and retrieving sensor metadata and historical threat data.
- Offering a rich analytics API to query aggregated threat metrics.
- Broadcasting real-time alerts and system status updates to connected clients via WebSockets.

**Technology Stack**

The system is built with a modern, asynchronous Python stack designed for high performance and scalability.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| Web Framework | **FastAPI** | Building high-performance, asynchronous RESTful APIs. |
| Database ORM | **SQLAlchemy (Async)** | Asynchronous object-relational mapping for database interaction. |
| Database Driver | **asyncpg** | High-performance asynchronous driver for PostgreSQL. |
| Database | **PostgreSQL + TimescaleDB** | Primary data storage. TimescaleDB extension is used for efficient time-series data handling. |
| Configuration | **Pydantic Settings** | Managing application configuration from environment variables. |
| API Schemas | **Pydantic** | Data validation, serialization, and documentation. |

**Architecture Overview**

The backend follows a classic three-tier architecture, promoting separation of concerns and maintainability.

1.  **Routers (`app/routers/`)**: Defines the API endpoints. They are responsible for handling incoming HTTP requests, validating request data using Pydantic schemas, and returning responses. They delegate all business logic to the service layer.
2.  **Services (`app/services/`)**: This layer contains the core business logic of the application. Services are responsible for orchestrating data from different sources, performing calculations, and interacting with the database via the data access layer.
3.  **Data Access (`app/models/`, `app/db/`)**: This layer is responsible for all database interactions. SQLAlchemy models in `app/models/` define the database schema, and the session management in `app/db/` provides database connections to the services.

This layered approach ensures that the codebase is modular, testable, and easy to understand.

### 1.1 High-Level Architecture Diagram (Generic Cloud)

```mermaid
flowchart LR
    subgraph Clients
        WebUI[Web App / Electron Client]
        Sensors[Sensor Producers]
    end

    subgraph Edge
        DDoS[DDoS Protection / WAF]
        LB[Load Balancer]
    end

    subgraph AppTier[App Tier (Multiple Instances)]
        API[FastAPI HTTP API]
        WS[WebSocket Handler]
        TCP[TCP Ingest Listener]
        Ingest[Ingestion Service]
        Detect[Threat Detection]
    end

    subgraph DataTier
        Cache[Redis Cache]
        DB[(PostgreSQL + TimescaleDB)]
    end

    WebUI -->|HTTPS / REST| DDoS --> LB --> API
    WebUI -->|WebSocket /ws| DDoS --> LB --> WS
    Sensors -->|HTTP /api/v1/ingest/sensor| DDoS --> LB --> API
    Sensors -->|TCP JSON Stream| DDoS --> LB --> TCP

    API --> Ingest
    TCP --> Ingest
    Ingest --> Detect
    Detect --> DB
    Ingest --> DB
    Ingest --> Cache
    API --> Cache
    WS --> WebUI
```

**Notes**

- The HTTP and TCP ingest paths converge in the same ingestion pipeline.
- WebSocket updates broadcast new threats to connected clients.
- Redis is optional but useful for hot analytics, summaries, and recent alerts.
- The app tier can be scaled horizontally behind the load balancer.

## 1. Schemas

Pydantic schemas, located in `app/schemas/`, define the data contracts for the API. They are used for request validation, response serialization, and generating OpenAPI documentation.

**Sensor Schemas (`sensor.py`)**
*   **`SensorCreate` (Request)**: Used to create a new sensor.
    *   Fields: `sensor_id`, `sensor_type`, `lat`, `lng`, `location`, `coverage_radius_m`.
*   **`SensorUpdate` (Request)**: Used to update an existing sensor's mutable properties.
    *   Fields: `lat`, `lng`, `location`, `coverage_radius_m` (all optional).
*   **`SensorOut` (Response)**: The standard representation of a sensor.
    *   Fields: `sensor_id`, `sensor_type`, `status`, `lat`, `lng`, `location`, `coverage_radius_m`, `last_ping`, `created_at`.
*   **`SensorSummaryOut` (Response)**: Provides a high-level count of sensors by their status.
    *   Fields: `total_count`, `active_count`, `inactive_count`, `error_count`.

**Threat Schemas (`threat.py`)**
*   **`ThreatOut` (Response)**: The standard representation of a single threat log.
  *   Fields: `alert_id`, `sensor_id`, `sensor_type`, `track_id`, `object_type`, `object_state`, `threat_type`, `confidence`, `severity`, `object_lat`, `object_lng`, `object_bearing_deg`, `object_range_m`, `timestamp`.
*   **`PagedThreats` (Response)**: The wrapper for the paginated list of threats.
  *   Fields: `items` (a list of `ThreatOut`), `total`, `high_severity_count`, `active_sensor_count`, `next_cursor`, `has_more`.
*   **`ThreatFilter` (Query Params)**: Defines the filters for querying the threat list.
    *   Fields: `sensor_type` (list), `sensor_id` (list), `threat_type` (list), `severity` (list), `from_dt`, `to_dt`, `page_size`, `cursor`, `offset`.
*   **`ThreatSummaryOut` (Response)**: Provides a summary of threat counts.
    *   Fields: `total_threats`, `high_severity_count`, `active_sensor_count`.
*   **`ThreatChunkManifestItem` (Response)**: Describes an adaptive chunk boundary for threats.
  *   Fields: `chunk_id`, `start_time`, `end_time`, `threat_count`, `label`.
*   **`ThreatChunkOut` (Response)**: The response for a chunked threat request.
  *   Fields: `chunk_id`, `start_time`, `end_time`, `threat_count`, `items` (a list of `ThreatOut`), `next_cursor`, `has_more`.

**Ingest Schemas (`ingest.py`)**
*   **`SensorIngestPayload` (Request)**: Payload for ingesting a single sensor reading.
  *   Fields: `sensor_id`, `type`, `timestamp`, `raw_detection`, `lat` (optional), `lng` (optional), `location` (optional).
*   **`SensorIngestResponse` (Response)**: Result of a sensor ingest.
  *   Fields: `sensor_id`, `sensor_type`, `sensor_status`, `detected_objects`, `saved_threats`, `timestamp`.

**Analytics Schemas (`analytics.py`)**
*   **`AnalyticsFilter` (Query Params)**: Defines the shared filters for all analytics endpoints.
    *   Fields: `from_dt`, `to_dt`, `location`, `sensor_type`, `severity`, `threat_type`, `bucket_by`.
    *   Notes: List filters are capped to limit query size, and the date range cannot exceed 90 days.
*   **`ThreatTimelineOut` (Response)**: The response for the threat timeline graph.
    *   Fields: `data` (list of `bucket` and `count`), `bucket_by`.
*   **`ThreatsPerSensorOut` (Response)**: The response for the threats-per-sensor breakdown.
    *   Fields: `data` (list of `sensor_id`, `sensor_type`, `location`, `count`).
*   **`SeverityBreakdownOut` (Response)**: Provides a count of threats for each severity level.
    *   Fields: `data` (list of `severity` and `count`), `total`.
*   **`ThreatTypeBreakdownOut` (Response)**: Provides a count of threats for each threat type.
    *   Fields: `data` (list of `threat_type` and `count`), `total`.

**User Schemas (`user.py`)**
*   **`UserCreate` (Request)**: Used to register a new user.
    *   Fields: `username`, `email`, `password`.
*   **`UserUpdate` (Request)**: Used to update a user's profile information.
    *   Fields: `username`, `email` (both optional).
*   **`PasswordChange` (Request)**: Used to change a user's password.
    *   Fields: `old_password`, `new_password`.
*   **`UserOut` (Response)**: The standard, safe representation of a user.
    *   Fields: `user_id`, `username`, `email`, `role`.

## 2. Services

The service layer (`app/services/`) implements the core business logic, acting as the bridge between the API endpoints (routers) and the database (models).

**`SensorService` (`sensor_service.py`)**
*   **Purpose**: Manages the lifecycle of sensor objects.
*   **Methods**:
    *   `get_all_sensors`: Retrieves a list of all registered sensors.
    *   `get_sensor`: Fetches a single sensor by its ID.
    *   `create_sensor`: Creates a new sensor, ensuring no duplicate ID or location exists.
    *   `update_sensor`: Updates the properties of an existing sensor.
    *   `get_sensor_summary`: Returns a high-level summary of sensor counts by status.

**`ThreatService` (`threat_service.py`)**
*   **Purpose**: Handles logic related to querying and managing threat logs.
        *   **Chunking Note**: Adaptive chunking exists to keep large time windows responsive by splitting dense periods into manageable slices while preserving stable ordering.
*   **Methods**:
    *   `get_threats`: Retrieves a paginated and filterable list of historical threats using the cursor-based pagination strategy.
        *   `get_threat_manifest`: Returns adaptive chunk boundaries for the last 12 hours based on threat density.
        *   `get_threat_chunk`: Returns threats for a specific chunk with pagination support.
    *   `push_alert`: A utility method that broadcasts a new threat alert to all connected WebSocket clients.
        *   `get_threat_summary`: Returns summary counts for threats (total, high severity, active sensors).
        *   `broadcast_summary_update`: Broadcasts the current threat summary to all connected clients.

**`IngestionService` (`ingestion_service.py`)**
*   **Purpose**: Ingests sensor payloads, runs threat detection, and persists readings and threats.
*   **Methods**:
  *   `ingest_sensor_payload`: Writes a single radar/lidar reading, runs detection, and returns ingest stats.

**`AnalyticsService` (`analytics_service.py`)**
*   **Purpose**: Provides methods for aggregating and summarizing threat data for analytics and dashboard visualizations.
*   **Methods**:
    *   `get_threat_timeline`: Aggregates threat counts over time, allowing them to be bucketed by minute, hour, or day.
    *   `get_threats_per_sensor`: Calculates the total number of threats detected by each sensor.
    *   `get_severity_breakdown`: Groups threat counts by their severity level (`low`, `med`, `high`).
    *   `get_threat_type_breakdown`: Groups threat counts by their specific type.

**`UserService` (`user_service.py`)**
*   **Purpose**: Manages user accounts and authentication-related logic.
*   **Methods**:
    *   `create_user`: Creates a new user. (Note: Hashing logic for the password is not implemented in this service).
    *   `get_user`: Retrieves a user's profile by their ID.
    *   `update_user`: Updates a user's username or email.
    *   `change_password`: Changes a user's password after verifying the old one.

**`SessionManager` (`ws_session_manager.py`)**
*   **Purpose**: Manages all active WebSocket connections for real-time communication.
*   **Methods**:
    *   `connect`: Handles a new client connecting to the WebSocket.
    *   `disconnect`: Cleans up after a client disconnects.
    *   `broadcast`: Sends a message to all currently connected WebSocket clients. This is used for system-wide notifications like new alerts.
    *   `broadcast_threat`: Sends a `NEW_THREAT` event payload to all connected clients.
    *   `broadcast_summary_update`: Sends a `THREAT_SUMMARY_UPDATE` event payload to all connected clients.

### 2. Database Layer

The database layer, located in `app/db/`, is responsible for managing all communication with the PostgreSQL database.

*   **Connection Management**: It uses SQLAlchemy's asynchronous engine to maintain a high-performance connection pool. This allows the application to efficiently reuse database connections, which is critical for a high-traffic, asynchronous environment.
*   **Session Handling**: A FastAPI dependency (`get_db`) provides a transactional database session for each incoming API request. This pattern ensures that a request's database operations are atomic: they either all succeed (and are committed) or are all rolled back in case of an error, guaranteeing data consistency.
*   **Schema Initialization**: On application startup, a dedicated function (`create_tables`) sets up the database schema. It creates all necessary tables based on the SQLAlchemy models and, importantly, configures the time-series tables (`radar_readings`, `lidar_readings`) as TimescaleDB hypertables. This is a key architectural choice that enables highly efficient storage and querying of time-series sensor data.
*   **Engine Configuration**: The engine enables `pool_pre_ping`, sets pool sizing (`pool_size=20`, `max_overflow=30`), recycles connections (`pool_recycle=3600`), and uses `echo=True` for SQL logging. SSL is disabled via `connect_args`.

### 3. Models

The `app/models/` directory defines the data structure of the application using SQLAlchemy ORM models. Each class corresponds to a table in the PostgreSQL database.

*   **`Sensor` (`sensor.py`)**
    *   **Purpose**: Represents a physical or simulated sensor in the system. It stores metadata such as the sensor's ID, type (Radar or LiDAR), geographical location, and operational status.
    *   **Key Attributes**: `sensor_id`, `sensor_type`, `status`, `lat`, `lng`, `location`, `coverage_radius_m`, `last_ping`, `created_at`.
    *   **Table Configuration**: Enforces a unique constraint on `(lat, lng)`.
    *   **Relationships**: A `Sensor` is the parent for its associated readings and logs. It has one-to-many relationships with `RadarReading`, `LidarReading`, and `ThreatLog`. When a sensor is deleted, all its associated data is automatically removed (cascade delete).

*   **`RadarReading` & `LidarReading` (`sensor_reading.py`)**
    *   **Purpose**: These models store the raw time-series data generated by the sensors. They are configured as TimescaleDB hypertables for efficient time-based querying.
    *   **Key Attributes**: `id`, `timestamp`, `sensor_id`, `status`, and data fields specific to the sensor type (e.g., `range_m`, `azimuth_deg`, `radial_velocity_mps` for radar; bounding box, centroid, `point_count`, `intensity_avg` for LiDAR).
    *   **Relationships**: Each reading belongs to a single `Sensor`.

*   **`ThreatLog` (`threat_log.py`)**
    *   **Purpose**: Records a log of every threat detected by the system. This serves as the historical ledger for all alert-worthy events.
    *   **Key Attributes**: `alert_id`, `timestamp`, `sensor_id`, `sensor_type`, `threat_type`, `severity`, `confidence`, and optional object metadata (`track_id`, `object_type`, `object_state`, `object_lat`, `object_lng`, `object_bearing_deg`, `object_range_m`).
    *   **Relationships**: Each threat log is associated with the `Sensor` that detected it.

*   **`User` (`user.py`)**
    *   **Purpose**: Represents a user account in the system. It stores credentials and role information for authentication and authorization.
    *   **Key Attributes**: `user_id`, `username`, `email`, `password_hash`, and `role`.

### 4. Cursor-Based Pagination

For endpoints that return a large number of items, such as the list of historical threats, the API uses cursor-based pagination to provide an efficient and scalable way to navigate through the data.

*   **How it Works**: Instead of using traditional offset-based pagination (e.g., `page=2`), which can be inefficient for large datasets, the API uses a "cursor." A cursor is an opaque string that acts as a bookmark to a specific item in the sorted list. When a client requests a page of data, the API returns the items and a `next_cursor` value.

*   **Client Implementation**: To get the next page of results, the client should send this `next_cursor` value back to the server in the `cursor` query parameter of its next request.

*   **Cursor Encoding**: The cursor is a Base64-encoded string containing both the `timestamp` and a unique `alert_id` of the last item on the page. This composite key is essential. The `timestamp` allows the database to efficiently locate the correct time-slice of data, while the `alert_id` acts as a tie-breaker to ensure a stable and correct ordering if multiple threats share the exact same timestamp.
*   **Ordering and Offset**: The list is ordered by `timestamp` (descending) with `alert_id` as a tie-breaker. An optional `offset` parameter is supported as a fallback when provided, but cursor-based navigation is preferred for large datasets.

*   **`has_more` Flag**: The paginated response includes a boolean flag, `has_more`, which is `true` if there are more results available after the current page. When the client receives a response with `has_more: false`, it knows it has reached the end of the dataset.

This approach provides a stable and performant way to paginate through time-series data, even as new data is being written to the database.

### 5. Analytics Filtering

The analytics endpoints provide a powerful and consistent way to query aggregated threat data. This is managed through a shared set of filtering parameters defined in the `AnalyticsFilter` schema.

*   **Shared Filters**: All analytics endpoints accept a common set of optional query parameters to slice the data:
    *   `from_dt` & `to_dt`: Define a specific time window for the analysis.
    *   `location`: Filters for threats from sensors in a specific named location.
    *   `sensor_type`: Filters for threats from a specific type of sensor (e.g., `radar` or `lidar`).
    *   `severity`: Filters for threats of a certain severity level (e.g., `high`).
    *   `threat_type`: Filters for a specific category of threat.

*   **Efficient Filtering with Joins**: When a filter on `location` or `sensor_type` is used, the service layer dynamically adds a `JOIN` from the `threat_logs` table to the `sensors` table in the database query. This allows for efficient filtering on sensor metadata without denormalizing data. This is a key advantage of using the SQLAlchemy ORM, which builds these queries programmatically.

*   **Time Bucketing (`bucket_by`)**: The "Threat Timeline" endpoint uses a `bucket_by` parameter to group threat counts into time intervals. This can be set to `minute`, `hour`, or `day`. The backend uses the `date_trunc` function in PostgreSQL to perform this aggregation directly in the database, which is highly efficient.

*   **Timezone Handling**: The system follows a clear timezone protocol to ensure consistency:
    1.  **Frontend**: The client should always send `from_dt` and `to_dt` parameters in UTC.
    2.  **Backend**: The backend performs all database queries and time bucketing in UTC.
    3.  **Frontend**: The client is responsible for converting the UTC timestamps received from the API into the user's local timezone for display.

---

## Deliverable 2: API Endpoints Reference

### 1. Schemas
*(...to be filled in...)*

### 2. Services
*(...to be filled in...)*

### 3. API Endpoints
Pagination for threat listings uses a composite cursor based on `(timestamp, alert_id)` and is ordered by `timestamp` descending with `alert_id` as a tie-breaker. The client should pass the `next_cursor` value back to continue paging. An optional `offset` is supported as a fallback when provided, but cursor-based pagination is recommended for large datasets.

*(...to be filled in...)*

### 4. WebSocket Events
The backend emits a small set of event payloads to connected WebSocket clients:

*   **`CONNECTION_CONFIRMED`**: Sent immediately after a client connects. Payload includes a short status message and a `status` value of `live`.
*   **`NEW_THREAT`**: Broadcast when a new threat is detected. Payload is a threat object formatted for the frontend threat stream.
*   **`THREAT_SUMMARY_UPDATE`**: Broadcast after a threat is processed to provide updated summary counts.
