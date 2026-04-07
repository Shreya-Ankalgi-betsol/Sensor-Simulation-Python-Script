"""
Centralized constants and magic numbers for the backend.
Eliminates scattered configuration values across the codebase.
"""

# ==================== DATABASE ====================
# Coordinate matching tolerance for duplicate sensor detection
COORD_EPSILON = 1e-9

# Database connection pool settings
DB_POOL_SIZE = 20
DB_POOL_MAX_OVERFLOW = 30
DB_POOL_RECYCLE = 3600  # seconds (1 hour)
DB_POOL_TIMEOUT = 30  # seconds

# ==================== SENSORS ====================
# Time after which a sensor is marked inactive if no ping received
SENSOR_INACTIVE_AFTER_SECONDS = 6

# ==================== RADAR DETECTOR ====================
RADAR_VELOCITY_THRESHOLD = 0.5
RADAR_FAST_APPROACH_THRESHOLD = 2.0
RADAR_RCS_THRESHOLD = 15.0
RADAR_STRONG_SIGNAL_THRESHOLD = 10.0
RADAR_SNR_NOISE_FLOOR = 3.0
RADAR_STATIONARY_VELOCITY_EPSILON = 0.1

# ==================== LIDAR DETECTOR ====================
LIDAR_LARGE_VOLUME_THRESHOLD = 5.0
LIDAR_DENSE_POINT_THRESHOLD = 100
LIDAR_MOVING_VELOCITY_THRESHOLD = 0.5
LIDAR_TALL_HEIGHT_THRESHOLD = 1.5
LIDAR_WIDE_WIDTH_THRESHOLD = 2.0
LIDAR_HIGH_DENSITY_THRESHOLD = 40.0
LIDAR_MIN_POINT_COUNT = 10
LIDAR_VELOCITY_NOISE_FLOOR = 0.1

# ==================== THREAT DETECTION ====================
THREAT_DETECTION_HISTORY_SIZE = 1
THREAT_DETECTION_CONFIRMATION_THRESHOLD = 1
DETECTION_THRESHOLD = 0.6

# ==================== TCP INGEST ====================
TCP_BUFFER_SIZE = 4096
TCP_READ_SIZE = 4096

# ==================== PAGINATION ====================
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500
MIN_PAGE_SIZE = 1

# ==================== API ====================
API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

# ==================== WEBSOCKET ====================
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MESSAGE_BATCH_SIZE = 10
