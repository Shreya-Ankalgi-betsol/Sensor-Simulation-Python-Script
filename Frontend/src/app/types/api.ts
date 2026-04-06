/**
 * TypeScript interfaces matching FastAPI backend response schemas
 * Field names match backend snake_case format exactly
 */

/**
 * Sensor data structure from backend (GET /api/v1/sensors)
 * Matches backend SensorOut schema
 */
export interface SensorOut {
  sensor_id: string
  sensor_type: string // 'Radar' | 'Lidar'
  status: string // 'active' | 'inactive' | 'error'
  lat: number
  lng: number
  location: string
  coverage_radius_m: number
  last_ping: string | null // ISO datetime
  created_at: string // ISO datetime
}

/**
 * Threat/alert log entry from backend (GET /api/v1/threats)
 * Matches backend ThreatOut schema
 */
export interface ThreatLog {
  alert_id: string
  sensor_id: string
  sensor_type: string
  threat_type: string // e.g. "drone", "person", "vehicle"
  confidence: number // 0-1
  severity: string // 'low' | 'med' | 'high' | 'critical'
  timestamp: string // ISO datetime
}

/**
 * Paginated threats response from backend
 * Matches backend PagedThreats schema
 */
export interface PagedThreats {
  items: ThreatLog[]
  total: number
  next_cursor: string | null
  has_more: boolean
}

/**
 * Summary statistics for threats
 * Matches backend ThreatSummaryOut schema
 */
export interface ThreatSummaryOut {
  total_threats: number
  high_severity_count: number
  active_sensor_count: number
}

/**
 * Summary statistics for sensors
 * Matches backend SensorSummaryOut schema
 */
export interface SensorSummaryOut {
  total_count: number
  active_count: number
  inactive_count: number
  error_count: number
}

/**
 * Single data point for threats over time - timeline chunk
 * Matches backend ThreatTimelinePoint schema
 */
export interface ThreatTimelinePoint {
  bucket: string // ISO datetime
  count: number
}

/**
 * Threat timeline response wrapper
 * Matches backend ThreatTimelineOut schema
 */
export interface ThreatTimelineOut {
  data: ThreatTimelinePoint[]
  bucket_by: string // 'minute' | 'hour' | 'day'
}

/**
 * Threats per sensor data point
 * Matches backend ThreatPerSensorPoint schema
 */
export interface ThreatPerSensorPoint {
  sensor_id: string
  sensor_type: string
  location: string
  count: number
}

/**
 * Threats per sensor response wrapper
 * Matches backend ThreatsPerSensorOut schema
 */
export interface ThreatsPerSensorOut {
  data: ThreatPerSensorPoint[]
}

/**
 * Severity breakdown data point
 * Matches backend SeverityBreakdownPoint schema
 */
export interface SeverityBreakdownPoint {
  severity: string // 'low' | 'med' | 'high' | 'critical'
  count: number
}

/**
 * Severity breakdown response wrapper
 * Matches backend SeverityBreakdownOut schema
 */
export interface SeverityBreakdownOut {
  data: SeverityBreakdownPoint[]
  total: number
}

/**
 * Threat type breakdown data point
 * Matches backend ThreatTypeBreakdownPoint schema
 */
export interface ThreatTypeBreakdownPoint {
  threat_type: string
  count: number
}

/**
 * Threat type breakdown response wrapper
 * Matches backend ThreatTypeBreakdownOut schema
 */
export interface ThreatTypeBreakdownOut {
  data: ThreatTypeBreakdownPoint[]
  total: number
}

/**
 * User profile information (backend UserOut)
 * Matches backend UserOut schema
 */
export interface UserOut {
  user_id: string
  username: string
  email: string
  role: string
}

/**
 * WebSocket message base structure from backend
 */
export interface WebSocketMessage {
  type: string
  payload: any
}

/**
 * Specific WebSocket message for new threat detection
 */
export interface NewThreatMessage extends WebSocketMessage {
  type: 'NEW_THREAT'
  payload: ThreatLog
}

/**
 * Specific WebSocket message for sensor status change
 */
export interface SensorUpdateMessage extends WebSocketMessage {
  type: 'SENSOR_UPDATE'
  payload: {
    sensor_id: string
    status: string
  }
}
