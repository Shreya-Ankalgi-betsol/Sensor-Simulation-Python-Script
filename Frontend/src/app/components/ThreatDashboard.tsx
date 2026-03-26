import { useEffect, useState } from "react";

interface ThreatEvent {
  id: number;
  sensor_id: string;
  sensor_type: string;
  timestamp: string;
  threat_type: string;
  confidence: number;
  severity?: string | null;
}

interface ApiResponse {
  db_path: string;
  threats: ThreatEvent[];
}

export default function ThreatDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/threats");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
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
    const interval = setInterval(fetchThreats, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Threat Detection Dashboard</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ color: "#666" }}>Loading...</div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginBottom: "30px",
              borderBottom: "1px solid #eee",
              paddingBottom: "20px",
            }}
          >
            <div>
              <strong>Total threats (latest 50):</strong> {data.threats.length}
            </div>
            <div>
              <strong>DB:</strong> {data.db_path}
            </div>
          </div>

          <h2>Recent Threats</h2>

          {data.threats.length === 0 ? (
            <p style={{ color: "#999" }}>No threats yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #ddd",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Sensor ID
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Type
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Timestamp
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Detection Type
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Confidence
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.threats.map((threat, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.sensor_id}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.sensor_type?.toUpperCase()}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.threat_type}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.confidence.toFixed(2)}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                        {threat.severity ?? "—"}
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
