# Backend API Reference

This document provides a detailed reference for the backend API, including schemas, services, and endpoints.

---

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
    *   Fields: `alert_id`, `sensor_id`, `sensor_type`, `threat_type`, `confidence`, `severity`, `timestamp`.
*   **`PagedThreats` (Response)**: The wrapper for the paginated list of threats.
    *   Fields: `items` (a list of `ThreatOut`), `total`, `next_cursor`, `has_more`.
*   **`ThreatFilter` (Query Params)**: Defines the filters for querying the threat list.
    *   Fields: `sensor_type`, `sensor_id`, `threat_type`, `severity`, `from_dt`, `to_dt`, `page_size`, `cursor`.

**Analytics Schemas (`analytics.py`)**
*   **`AnalyticsFilter` (Query Params)**: Defines the shared filters for all analytics endpoints.
    *   Fields: `from_dt`, `to_dt`, `location`, `sensor_type`, `severity`, `threat_type`, `bucket_by`.
*   **`ThreatTimelineOut` (Response)**: The response for the threat timeline graph.
    *   Fields: `data` (list of `bucket` and `count`), `bucket_by`.
*   **`ThreatsPerSensorOut` (Response)**: The response for the threats-per-sensor breakdown.
    *   Fields: `data` (list of `sensor_id`, `sensor_type`, `location`, `count`).
*   **`SeverityBreakdownOut` (Response)**: Provides a count of threats for each severity level.
    *   Fields: `data` (list of `severity` and `count`).
*   **`ThreatTypeBreakdownOut` (Response)**: Provides a count of threats for each threat type.
    *   Fields: `data` (list of `threat_type` and `count`).

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
*   **Methods**:
    *   `get_threats`: Retrieves a paginated and filterable list of historical threats using the cursor-based pagination strategy.
    *   `push_alert`: A utility method that broadcasts a new threat alert to all connected WebSocket clients.
    *   `get_threat_summary`: Returns a high-level summary of threat counts.

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
    *   `send_to_client`: Sends a message to a single, specific WebSocket client.
    *   `broadcast`: Sends a message to all currently connected WebSocket clients. This is used for system-wide notifications like new alerts.

## 3. API Endpoints

This section provides a detailed reference for the backend API.

### Sensors

#### **Get All Sensors**

Retrieves a list of all registered sensors, ordered by their creation date.

**Method**: `GET`
**Path**: `/api/v1/sensors`

---

##### **Request**

This endpoint does not require any query parameters or a request body.

---

##### **Response**

**Success Response (`200 OK`)**

```json
[
  {
    "sensor_id": "RADAR-001",
    "sensor_type": "radar",
    "status": "active",
    "lat": 34.0522,
    "lng": -118.2437,
    "location": "Main Gate",
    "coverage_radius_m": 100.0,
    "last_ping": "2026-04-08T10:00:00Z",
    "created_at": "2026-04-01T12:00:00Z"
  },
  {
    "sensor_id": "LIDAR-002",
    "sensor_type": "lidar",
    "status": "inactive",
    "lat": 34.0550,
    "lng": -118.2450,
    "location": "Perimeter Fence",
    "coverage_radius_m": 150.0,
    "last_ping": null,
    "created_at": "2026-04-02T14:30:00Z"
  }
]
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `sensor_id` | string | The unique identifier for the sensor. |
| `sensor_type` | string | The type of the sensor (`radar` or `lidar`). |
| `status` | string | The current operational status (`active`, `inactive`, `error`). |
| `lat` | number | The latitude coordinate of the sensor. |
| `lng` | number | The longitude coordinate of the sensor. |
| `location` | string | A human-readable name for the sensor's location. |
| `coverage_radius_m`| number | The sensor's coverage radius in meters. |
| `last_ping` | string (datetime) | The UTC timestamp of the last time the sensor reported data. `null` if it has never reported. |
| `created_at` | string (datetime) | The UTC timestamp when the sensor was registered in the system. |

---


#### **Register a new sensor**

Creates a new sensor in the system. The sensor's status will default to `inactive` upon creation. A unique `sensor_id` and location coordinates are required.

**Method**: `POST`
**Path**: `/api/v1/sensors`

---

##### **Request**

**Request Body (`application/json`)**

```json
{
  "sensor_id": "LIDAR-003",
  "sensor_type": "lidar",
  "lat": 34.0600,
  "lng": -118.2500,
  "location": "West Wall",
  "coverage_radius_m": 120.0
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sensor_id` | string | Yes | The unique identifier for the new sensor. |
| `sensor_type` | string | Yes | The type of sensor. Must be `radar` or `lidar`. |
| `lat` | number | Yes | The latitude coordinate. Must be between -90 and 90. |
| `lng` | number | Yes | The longitude coordinate. Must be between -180 and 180. |
| `location` | string | Yes | A human-readable name for the sensor's location. |
| `coverage_radius_m`| number | No | The sensor's coverage radius in meters. Defaults to `50.0`. |

---

##### **Response**

**Success Response (`201 Created`)**

Returns the newly created sensor object.

```json
{
  "sensor_id": "LIDAR-003",
  "sensor_type": "lidar",
  "status": "inactive",
  "lat": 34.0600,
  "lng": -118.2500,
  "location": "West Wall",
  "coverage_radius_m": 120.0,
  "last_ping": null,
  "created_at": "2026-04-08T18:00:00Z"
}
```

**Error Responses**

*   `409 Conflict`: Returned if a sensor with the same `sensor_id` or at the exact same `lat`/`lng` coordinates already exists.
*   `422 Unprocessable Entity`: Returned if the request body fails validation (e.g., invalid `sensor_type`, out-of-range coordinates).

---


#### **Update a sensor**

Updates the properties of an existing sensor, such as its location or coverage radius. All fields in the request body are optional.

**Method**: `PUT`
**Path**: `/api/v1/sensors/{sensor_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `sensor_id` | string | The unique identifier of the sensor to update. |

**Request Body (`application/json`)**

Provide one or more fields to update.

```json
{
  "location": "Main Gate (North)",
  "coverage_radius_m": 110.0
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `lat` | number | No | The new latitude coordinate. |
| `lng` | number | No | The new longitude coordinate. |
| `location` | string | No | The new human-readable name for the location. |
| `coverage_radius_m`| number | No | The new coverage radius in meters. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns the full sensor object with the updated values.

```json
{
  "sensor_id": "RADAR-001",
  "sensor_type": "radar",
  "status": "active",
  "lat": 34.0522,
  "lng": -118.2437,
  "location": "Main Gate (North)",
  "coverage_radius_m": 110.0,
  "last_ping": "2026-04-08T10:00:00Z",
  "created_at": "2026-04-01T12:00:00Z"
}
```

**Error Responses**

*   `404 Not Found`: Returned if no sensor with the specified `sensor_id` exists.
*   `422 Unprocessable Entity`: Returned if the request body fails validation.

---


#### **Get sensor summary**

Returns a high-level summary of sensor counts, broken down by their operational status.

**Method**: `GET`
**Path**: `/api/v1/sensors/summary`

---

##### **Request**

This endpoint does not require any query parameters or a request body.

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "total_count": 5,
  "active_count": 3,
  "inactive_count": 1,
  "error_count": 1
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total_count` | integer | The total number of sensors registered in the system. |
| `active_count` | integer | The number of sensors currently in the `active` state. |
| `inactive_count` | integer | The number of sensors currently in the `inactive` state. |
| `error_count` | integer | The number of sensors currently in the `error` state. |

---


#### **Get a single sensor**

Returns a single sensor object, identified by its unique ID.

**Method**: `GET`
**Path**: `/api/v1/sensors/{sensor_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `sensor_id` | string | The unique identifier of the sensor to retrieve. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns the full sensor object.

```json
{
  "sensor_id": "RADAR-001",
  "sensor_type": "radar",
  "status": "active",
  "lat": 34.0522,
  "lng": -118.2437,
  "location": "Main Gate",
  "coverage_radius_m": 100.0,
  "last_ping": "2026-04-08T10:00:00Z",
  "created_at": "2026-04-01T12:00:00Z"
}
```

**Error Responses**

*   `404 Not Found`: Returned if no sensor with the specified `sensor_id` exists.

---


### Threats

#### **Get all threats**

Returns a cursor-paginated list of historical threats. The endpoint supports a variety of filters to refine the results.

**Method**: `GET`
**Path**: `/api/v1/threats`

---

##### **Request**

**Query Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `sensor_type` | string | Filter by sensor type (e.g., `radar`, `lidar`). |
| `sensor_id` | string | Filter by a specific sensor's ID. |
| `threat_type` | string | Filter by a specific threat type (e.g., `drone`). |
| `severity` | string | Filter by severity level (`low`, `med`, `high`). |
| `from_dt` | string | ISO 8601 UTC timestamp to start the time range filter. |
| `to_dt` | string | ISO 8601 UTC timestamp to end the time range filter. |
| `page_size` | integer | The number of items to return per page. Defaults to `20`. |
| `cursor` | string | The `next_cursor` value from a previous response to fetch the next page. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns a `PagedThreats` object containing the list of threats and pagination details.

```json
{
  "items": [
    {
      "alert_id": "uuid-for-threat-1",
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "threat_type": "drone",
      "confidence": 0.95,
      "severity": "high",
      "timestamp": "2026-04-08T12:00:00Z"
    }
  ],
  "total": 1,
  "next_cursor": "eyJ0aW1lc3RhbXAiOiAiMjAyNi0wNC0wOFQxMjowMDowMCswMDowMCIsICJhbGVydF9pZCI6ICJ1dWlkLWZvci10aHJlYXQtMSJ9",
  "has_more": false
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `items` | array | An array of `ThreatOut` objects. |
| `total` | integer | The total number of threats matching the filter criteria (not just the count on the current page). |
| `next_cursor` | string | An opaque cursor string. Send this in the `cursor` query parameter to get the next page. `null` if `has_more` is false. |
| `has_more` | boolean | `true` if there are more pages of results available. |

---


#### **Get a single threat**

Returns a single threat log, identified by its unique ID.

**Method**: `GET`
**Path**: `/api/v1/threats/{alert_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `alert_id` | string | The unique identifier of the threat to retrieve. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns the full threat object.

```json
{
  "alert_id": "uuid-for-threat-1",
  "sensor_id": "RADAR-001",
  "sensor_type": "radar",
  "threat_type": "drone",
  "confidence": 0.95,
  "severity": "high",
  "timestamp": "2026-04-08T12:00:00Z"
}
```

**Error Responses**

*   `404 Not Found`: Returned if no threat with the specified `alert_id` exists.

---


#### **Get threat summary**

Returns a high-level summary of threat statistics, including the total number of threats and a count of high-severity threats.

**Method**: `GET`
**Path**: `/api/v1/threats/summary`

---

##### **Request**

This endpoint does not require any query parameters or a request body.

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "total_threats": 125,
  "high_severity_threats": 15,
  "active_sensors_with_threats": 4
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total_threats` | integer | The total number of threats recorded in the system. |
| `high_severity_threats` | integer | The count of threats marked with `high` severity. |
| `active_sensors_with_threats` | integer | The number of `active` sensors that have detected at least one threat. |

---


### Analytics

#### **Get threat activity over time**

Returns a time-series of threat counts, grouped into buckets of a specified size (`minute`, `hour`, or `day`). This is useful for visualizing threat activity over time.

**Method**: `GET`
**Path**: `/api/v1/analytics/threat-timeline`

---

##### **Request**

**Query Parameters**

All parameters are optional and are used to filter the data before aggregation.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `bucket_by` | string | `hour` | The time interval to group results by. Options: `minute`, `hour`, `day`. |
| `from_dt` | string | (None) | ISO 8601 UTC timestamp to start the time range filter. |
| `to_dt` | string | (None) | ISO 8601 UTC timestamp to end the time range filter. |
| `location` | string | (None) | Filter by a specific sensor location (e.g., "Main Gate"). |
| `sensor_type` | string | (None) | Filter by sensor type (`radar` or `lidar`). |
| `severity` | string | (None) | Filter by severity level (`low`, `med`, `high`). |
| `threat_type` | string | (None) | Filter by a specific threat type (e.g., `drone`). |

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "data": [
    {
      "bucket": "2026-04-08T10:00:00Z",
      "count": 5
    },
    {
      "bucket": "2026-04-08T11:00:00Z",
      "count": 12
    }
  ],
  "bucket_by": "hour"
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | array | An array of data points, each containing a `bucket` timestamp and the `count` of threats within that time interval. |
| `bucket_by` | string | The time interval used for bucketing, reflecting the request parameter. |

---

#### **Get threat count per sensor**

Returns the total threat count for each sensor. The response includes all sensors that match the filters, even if their threat count is zero.

**Method**: `GET`
**Path**: `/api/v1/analytics/threats-per-sensor`

---

##### **Request**

**Query Parameters**

All parameters are optional and are used to filter the data before aggregation.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `from_dt` | string | ISO 8601 UTC timestamp to start the time range filter. |
| `to_dt` | string | ISO 8601 UTC timestamp to end the time range filter. |
| `location` | string | Filter by a specific sensor location. |
| `sensor_type` | string | Filter by sensor type (`radar` or `lidar`). |
| `severity` | string | Filter by severity level (`low`, `med`, `high`). |
| `threat_type` | string | Filter by a specific threat type. |

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "data": [
    {
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "location": "Main Gate",
      "count": 15
    },
    {
      "sensor_id": "LIDAR-002",
      "sensor_type": "lidar",
      "location": "Perimeter Fence",
      "count": 8
    }
  ]
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | array | An array of data points, each containing sensor metadata (`sensor_id`, `sensor_type`, `location`) and the total `count` of threats detected by that sensor within the filter constraints. |

---

#### **Get threat severity breakdown**

Returns the total count of threats grouped by each severity level (`low`, `med`, `high`).

**Method**: `GET`
**Path**: `/api/v1/analytics/severity-breakdown`

---

##### **Request**

**Query Parameters**

This endpoint supports the same optional filtering parameters as the other analytics endpoints (`from_dt`, `to_dt`, `location`, `sensor_type`, `threat_type`).

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "total": 42,
  "data": [
    {
      "severity": "high",
      "count": 10,
      "percentage": 23.8
    },
    {
      "severity": "med",
      "count": 15,
      "percentage": 35.7
    },
    {
      "severity": "low",
      "count": 17,
      "percentage": 40.5
    }
  ]
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total` | integer | The total number of threats matching the filter criteria. |
| `data` | array | An array of data points, each containing the `severity` level, the `count` of threats for that level, and the `percentage` of the total. |

---

#### **Get threat type breakdown**

Returns the total count of threats grouped by each unique threat type (e.g., `drone`, `person`).

**Method**: `GET`
**Path**: `/api/v1/analytics/threat-type-breakdown`

---

##### **Request**

**Query Parameters**

This endpoint supports the same optional filtering parameters as the other analytics endpoints (`from_dt`, `to_dt`, `location`, `sensor_type`, `severity`).

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "total": 42,
  "data": [
    {
      "threat_type": "drone",
      "count": 25,
      "percentage": 59.5
    },
    {
      "threat_type": "person",
      "count": 10,
      "percentage": 23.8
    },
    {
      "threat_type": "vehicle",
      "count": 7,
      "percentage": 16.7
    }
  ]
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total` | integer | The total number of threats matching the filter criteria. |
| `data` | array | An array of data points, each containing the `threat_type`, the `count` of threats for that type, and the `percentage` of the total. |

---

### Users

#### **Create a user**

Creates a new user in the system. By default, new users are assigned the `admin` role.

**Method**: `POST`
**Path**: `/api/v1/users`

---

##### **Request**

**Request Body (`application/json`)**

```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "a-very-secure-password"
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | Yes | The unique username for the new user. |
| `email` | string | Yes | The user's unique email address. |
| `password` | string | Yes | The user's password. (Note: The API currently stores this in plain text and does not implement hashing). |

---

##### **Response**

**Success Response (`201 Created`)**

Returns the newly created user object, safely excluding the password.

```json
{
  "user_id": "uuid-for-new-user",
  "username": "newadmin",
  "email": "newadmin@example.com",
  "role": "admin"
}
```

**Error Responses**

*   `422 Unprocessable Entity`: Returned if the request body fails validation.

---

#### **Get a user**

Returns a single user object by their unique ID.

**Method**: `GET`
**Path**: `/api/v1/users/{user_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `user_id` | string | The unique identifier of the user to retrieve. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns the user object, safely excluding the password.

```json
{
  "user_id": "uuid-for-existing-user",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin"
}
```

**Error Responses**

*   `404 Not Found`: Returned if no user with the specified `user_id` exists.

---

#### **Change password**

Changes the password for an existing user. This endpoint requires the user's current password for verification.

**Method**: `PUT`
**Path**: `/api/v1/users/{user_id}/change-password`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `user_id` | string | The unique identifier of the user whose password is being changed. |

**Request Body (`application/json`)**

```json
{
  "old_password": "a-very-secure-password",
  "new_password": "an-even-more-secure-password"
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `old_password` | string | Yes | The user's current password. |
| `new_password` | string | Yes | The desired new password. |

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "message": "Password changed successfully."
}
```

**Error Responses**

*   `400 Bad Request`: Returned if the provided `old_password` is incorrect.
*   `404 Not Found`: Returned if no user with the specified `user_id` exists.
*   `422 Unprocessable Entity`: Returned if the request body fails validation.

---

## 4. WebSocket Events

The backend uses a WebSocket connection at `/ws` to push real-time events to connected clients. All messages from the server follow a consistent format:

```json
{
  "type": "EVENT_NAME",
  "payload": { ... }
}
```

---

#### **`CONNECTION_CONFIRMED`**

*   **When**: Immediately after a client successfully establishes a WebSocket connection.
*   **Purpose**: To confirm to the client that the connection is live.
*   **Payload**:
    ```json
    {
      "message": "Connected to threat detection system",
      "status": "live"
    }
    ```

---

#### **`NEW_THREAT`**

*   **When**: When the `push_alert` method in the `ThreatService` is called, which happens when a new threat is processed by the system.
*   **Purpose**: To notify all clients of a new, real-time threat detection.
*   **Payload**: The payload is a full `ThreatOut` object.
    ```json
    {
      "alert_id": "uuid-for-new-threat",
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "threat_type": "drone",
      "confidence": 0.98,
      "severity": "high",
      "timestamp": "2026-04-08T20:30:00Z"
    }
    ```

---

#### **`SENSOR_UPDATE`**

*   **When**: When a sensor's status changes (e.g., from `inactive` to `active`). This is triggered by the ingestion service when it receives a new ping from a sensor.
*   **Purpose**: To allow clients to update the status of sensors on a live map or dashboard.
*   **Payload**: The payload is a full `SensorOut` object.
    ```json
    {
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "status": "active",
      "lat": 34.0522,
      "lng": -118.2437,
      "location": "Main Gate",
      "coverage_radius_m": 100.0,
      "last_ping": "2026-04-08T20:30:00Z",
      "created_at": "2026-04-01T12:00:00Z"
    }
    ```
*(Note: Based on my analysis, `trajectory_update` and `alert_acknowledged` events are not currently implemented in the backend services.)*

---
