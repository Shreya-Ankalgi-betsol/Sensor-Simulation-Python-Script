import { useEffect, useState } from "react";

interface DetectedObject {
  type: string;
  confidence: number;
  severity?: string;
}

interface ThreatData {
  sensor_id: string;
  sensor_type: string;
  timestamp: string;
  detected_objects?: DetectedObject[];
  error?: string;
}

interface ApiResponse {
  stats: {
    processed: number;
    threats: number;
    errors: number;
  };
  threats: ThreatData[];
}

export function ThreatsBackend() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://127.0.0.1:5050/api/threats");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Live Threats from Backend</h1>

      {error && (
        <div
          style={{
            color: "red",
            backgroundColor: "#ffe0e0",
            padding: "10px",
            marginBottom: "20px",
            borderRadius: "4px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ fontSize: "16px", color: "#999" }}>Loading...</div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <div
              style={{
                padding: "15px",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#666" }}>Processed</div>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                {data.stats.processed}
              </div>
            </div>

            <div
              style={{
                padding: "15px",
                backgroundColor: "#ffe0e0",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#666" }}>
                Threats Detected
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "red" }}>
                {data.stats.threats}
              </div>
            </div>

            <div
              style={{
                padding: "15px",
                backgroundColor: "#fff0e0",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#666" }}>Errors</div>
              <div style={{ fontSize: "28px", fontWeight: "bold" }}>
                {data.stats.errors}
              </div>
            </div>
          </div>

          <h2>Recent Detections</h2>

          {data.threats.length === 0 ? (
            <p style={{ color: "#999" }}>No threats detected yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #ddd",
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Sensor
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Time
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Detection
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Confidence
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "12px",
                        textAlign: "left",
                      }}
                    >
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.threats.map((threat, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {threat.sensor_id}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.sensor_type?.toUpperCase() || "—"}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.error ? (
                          <span style={{ color: "red" }}>Error: {threat.error}</span>
                        ) : threat.detected_objects &&
                          threat.detected_objects.length > 0 ? (
                          <span>
                            {threat.detected_objects
                              .map((obj) => obj.type)
                              .join(", ")}
                          </span>
                        ) : (
                          <span style={{ color: "#999" }}>No detection</span>
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.detected_objects &&
                        threat.detected_objects.length > 0 ? (
                          <span style={{ fontWeight: "bold" }}>
                            {(threat.detected_objects[0].confidence * 100).toFixed(
                              0
                            )}
                            %
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.detected_objects &&
                        threat.detected_objects.length > 0 &&
                        threat.detected_objects[0].severity ? (
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                threat.detected_objects[0].severity === "CRITICAL"
                                  ? "#dc2626"
                                  : threat.detected_objects[0].severity === "HIGH"
                                    ? "#f59e0b"
                                    : threat.detected_objects[0].severity === "MEDIUM"
                                      ? "#3b82f6"
                                      : "#10b981",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {threat.detected_objects[0].severity}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
