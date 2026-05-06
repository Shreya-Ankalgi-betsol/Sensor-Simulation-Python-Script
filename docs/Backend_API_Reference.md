# Backend API Reference

This document provides a detailed reference for the backend API, including schemas, services, and endpoints.

---



## 1. API Endpoints

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


#### **Ingest a sensor payload**

Ingests a single radar or lidar payload, runs threat detection, stores results, and updates the sensor's activity status.

**Method**: `POST`
**Path**: `/api/v1/ingest/sensor`

---

##### **Request**

**Request Body (`application/json`)**

```json
{
  "sensor_id": "RADAR-001",
  "type": "radar",
  "timestamp": "2026-04-08T12:00:00Z",
  "raw_detection": {
    "range_m": 1200.5,
    "azimuth_deg": 45.1,
    "elevation_deg": 2.5,
    "radial_velocity_mps": -5.2,
    "rcs_dbsm": 12.3,
    "snr_db": 18.7
  },
  "lat": 34.0522,
  "lng": -118.2437,
  "location": "Main Gate"
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sensor_id` | string | Yes | The unique identifier for the sensor. |
| `type` | string | Yes | The type of sensor. Must be `radar` or `lidar`. |
| `timestamp` | string (datetime) | Yes | The timestamp of the reading in UTC. |
| `raw_detection` | object | Yes | The raw detection payload from the sensor. |
| `lat` | number | No | Optional latitude override for the sensor. |
| `lng` | number | No | Optional longitude override for the sensor. |
| `location` | string | No | Optional location override for the sensor. |

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "sensor_id": "RADAR-001",
  "sensor_type": "radar",
  "sensor_status": "active",
  "detected_objects": 2,
  "saved_threats": 1,
  "timestamp": "2026-04-08T12:00:00Z"
}
```

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
| `sensor_type` | array[string] | Filter by one or more sensor types (e.g., `radar`, `lidar`). |
| `sensor_id` | array[string] | Filter by one or more sensor IDs. |
| `threat_type` | array[string] | Filter by one or more threat types (e.g., `drone`). |
| `severity` | array[string] | Filter by one or more severity levels (`low`, `med`, `high`). |
| `from_dt` | string | ISO 8601 UTC timestamp to start the time range filter. |
| `to_dt` | string | ISO 8601 UTC timestamp to end the time range filter. |
| `page_size` | integer | The number of items to return per page. Defaults to `20` (min 1, max 200). |
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
      "track_id": "track-9",
      "object_type": "drone",
      "object_state": "tracking",
      "threat_type": "drone",
      "confidence": 0.95,
      "severity": "high",
      "object_lat": 34.0521,
      "object_lng": -118.2439,
      "object_bearing_deg": 182.5,
      "object_range_m": 1200.5,
      "timestamp": "2026-04-08T12:00:00Z"
    }
  ],
  "total": 1,
  "high_severity_count": 1,
  "active_sensor_count": 4,
  "next_cursor": "eyJ0aW1lc3RhbXAiOiAiMjAyNi0wNC0wOFQxMjowMDowMCswMDowMCIsICJhbGVydF9pZCI6ICJ1dWlkLWZvci10aHJlYXQtMSJ9",
  "has_more": false
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `items` | array | An array of `ThreatOut` objects. |
| `total` | integer | The total number of threats matching the filter criteria (not just the count on the current page). |
| `high_severity_count` | integer | The count of high-severity threats matching the filter criteria. |
| `active_sensor_count` | integer | The count of active sensors at the time of the query. |
| `next_cursor` | string | An opaque cursor string. Send this in the `cursor` query parameter to get the next page. `null` if `has_more` is false. |
| `has_more` | boolean | `true` if there are more pages of results available. |

---


#### **Get adaptive threat chunk manifest**

Returns adaptive chunk boundaries for the last 12 hours based on threat density.

**Method**: `GET`
**Path**: `/api/v1/threats/manifest`

---

##### **Request**

This endpoint does not require any query parameters or a request body.

---

##### **Response**

**Success Response (`200 OK`)**

```json
[
  {
    "chunk_id": "chunk_001",
    "start_time": "2026-04-08T10:00:00Z",
    "end_time": "2026-04-08T10:30:00Z",
    "threat_count": 12,
    "label": "medium"
  }
]
```

---


#### **Get threats for a chunk**

Returns the threats within a specific manifest chunk, with pagination support.

**Method**: `GET`
**Path**: `/api/v1/threats/chunk/{chunk_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `chunk_id` | string | The chunk identifier from the manifest. |

**Query Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `cursor` | string | The `next_cursor` value from a previous response to fetch the next page. |
| `page_size` | integer | The number of items to return per page. Defaults to `5000` (min 1, max 5000). |

---

##### **Response**

**Success Response (`200 OK`)**

```json
{
  "chunk_id": "chunk_001",
  "start_time": "2026-04-08T10:00:00Z",
  "end_time": "2026-04-08T10:30:00Z",
  "threat_count": 12,
  "items": [
    {
      "alert_id": "uuid-for-threat-1",
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "track_id": "track-9",
      "object_type": "drone",
      "object_state": "tracking",
      "threat_type": "drone",
      "confidence": 0.95,
      "severity": "high",
      "object_lat": 34.0521,
      "object_lng": -118.2439,
      "object_bearing_deg": 182.5,
      "object_range_m": 1200.5,
      "timestamp": "2026-04-08T12:00:00Z"
    }
  ],
  "next_cursor": null,
  "has_more": false
}
```

**Error Responses**

*   `404 Not Found`: Returned if the specified `chunk_id` does not exist.

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
| `location` | array[string] | (None) | Filter by one or more sensor locations (e.g., "Main Gate"). |
| `sensor_type` | array[string] | (None) | Filter by one or more sensor types (`radar` or `lidar`). |
| `severity` | array[string] | (None) | Filter by one or more severity levels (`low`, `med`, `high`). |
| `threat_type` | array[string] | (None) | Filter by one or more threat types (e.g., `drone`). |

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
| `location` | array[string] | Filter by one or more sensor locations. |
| `sensor_type` | array[string] | Filter by one or more sensor types (`radar` or `lidar`). |
| `severity` | array[string] | Filter by one or more severity levels (`low`, `med`, `high`). |
| `threat_type` | array[string] | Filter by one or more threat types. |

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
      "count": 10
    },
    {
      "severity": "med",
      "count": 15
    },
    {
      "severity": "low",
      "count": 17
    }
  ]
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total` | integer | The total number of threats matching the filter criteria. |
| `data` | array | An array of data points, each containing the `severity` level and the `count` of threats for that level. |

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
      "count": 25
    },
    {
      "threat_type": "person",
      "count": 10
    },
    {
      "threat_type": "vehicle",
      "count": 7
    }
  ]
}
```

**Response Body Fields**

| Field | Type | Description |
| :--- | :--- | :--- |
| `total` | integer | The total number of threats matching the filter criteria. |
| `data` | array | An array of data points, each containing the `threat_type` and the `count` of threats for that type. |

---

### Users (Not in use currently)

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

#### **Update a user**

Updates a user's profile information.

**Method**: `PUT`
**Path**: `/api/v1/users/{user_id}`

---

##### **Request**

**Path Parameters**

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `user_id` | string | The unique identifier of the user to update. |

**Request Body (`application/json`)**

```json
{
  "username": "newusername",
  "email": "newadmin@example.com"
}
```

**Request Body Fields**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `username` | string | No | The user's new username. |
| `email` | string | No | The user's new email address. |

---

##### **Response**

**Success Response (`200 OK`)**

Returns the updated user object, safely excluding the password.

```json
{
  "user_id": "uuid-for-existing-user",
  "username": "newusername",
  "email": "newadmin@example.com",
  "role": "admin"
}
```

**Error Responses**

*   `404 Not Found`: Returned if no user with the specified `user_id` exists.
*   `422 Unprocessable Entity`: Returned if the request body fails validation.

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

The server also sends a plain-text `ping` heartbeat every 30 seconds.

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
*   **Payload**: The payload includes threat details in the frontend format.
    ```json
    {
      "alert_id": "uuid-for-new-threat",
      "sensor_id": "RADAR-001",
      "sensor_type": "radar",
      "track_id": "track-9",
      "object_type": "drone",
      "object_state": "tracking",
      "threat_type": "drone",
      "severity": "high",
      "object_lat": 34.0521,
      "object_lng": -118.2439,
      "object_bearing_deg": 182.5,
      "object_range_m": 1200.5,
      "timestamp": "2026-04-08T20:30:00Z"
    }
    ```

---
*(Note: Based on my analysis, `trajectory_update` and `alert_acknowledged` events are not currently implemented in the backend services.)*

---
