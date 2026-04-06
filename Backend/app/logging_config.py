"""
Centralized logging configuration for real-time threat detection visibility
"""

import logging

logger = logging.getLogger(__name__)


def log_detection_result(sensor_id: str, sensor_type: str, detected_objects: list) -> None:
    """Log threat detection results in real-time"""
    # COMMENTED OUT for debugging sensor updates
    # if not detected_objects:
    #     logger.info(
    #         "🔍 [DETECTOR] ✅ CLEAR | Sensor: %s (%s) | No threats detected",
    #         sensor_id,
    #         sensor_type,
    #     )
    # else:
    #     for i, obj in enumerate(detected_objects, 1):
    #         logger.error(
    #             "🔍 [DETECTOR] 🚨 THREAT #%d | Sensor: %s (%s) | Type: %s | "
    #             "Confidence: %.2f%% | Severity: %s",
    #             i,
    #             sensor_id,
    #             sensor_type,
    #             obj.get("type", "UNKNOWN"),
    #             obj.get("confidence", 0.0) * 100,
    #             obj.get("severity", "UNKNOWN"),
    #         )


def log_data_saved(table_name: str, sensor_id: str, count: int) -> None:
    """Log when data is persisted to database"""
    # logger.info(  # COMMENTED OUT for debugging sensor updates
    #     "💾 [DATABASE] ✓ Saved %d record(s) to %s | Sensor: %s",
    #     count,
    #     table_name,
    #     sensor_id,
    # )


def log_websocket_broadcast(alert_count: int, sensor_id: str, severity: str) -> None:
    """Log WebSocket broadcast to connected clients"""
    # logger.info(  # COMMENTED OUT for debugging sensor updates
    #     "📡 [WEBSOCKET] Broadcast %d alert(s) | Sensor: %s | Severity: %s",
    #     alert_count,
    #     sensor_id,
    #     severity,
    # )


def log_tcp_payload_received(sensor_id: str, sensor_type: str) -> None:
    """Log when TCP payload is validated and received"""
    # logger.debug(  # COMMENTED OUT for debugging sensor updates
    #     "📥 [TCP] Payload received | Sensor: %s (%s)",
    #     sensor_id,
    #     sensor_type,
    # )
