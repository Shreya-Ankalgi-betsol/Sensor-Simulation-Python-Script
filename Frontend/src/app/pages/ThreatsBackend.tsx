import { useEffect, useMemo, useState } from "react";

interface ThreatEvent {
  id: number;
  sensor_id: string;
  sensor_type: string;
  threat_type: string;
  confidence: number;
  severity?: string | null;
  timestamp: string;
}

interface ApiResponse {
  db_path: string;
  threats: ThreatEvent[];
}

export function ThreatsBackend() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const threats = data?.threats ?? [];
    const critical = threats.filter((t) => String(t.severity).toUpperCase() === "CRITICAL").length;
    return {
      total: threats.length,
      critical,
    };
  }, [data]);

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/threats");
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Live Threats from Backend</h1>
        <p className="text-sm text-muted-foreground">
          Source: <span className="font-mono">/api/threats</span>
          {data?.db_path ? (
            <>
              {" "}• DB: <span className="font-mono">{data.db_path}</span>
            </>
          ) : null}
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to fetch: {error}
        </div>
      ) : null}

      {!data && loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : null}

      {data ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Total threats (latest 50)</div>
              <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Critical</div>
              <div className="mt-1 text-2xl font-semibold">{stats.critical}</div>
            </div>
            <div className="hidden rounded-lg border bg-card p-4 md:block">
              <div className="text-xs text-muted-foreground">Refresh</div>
              <div className="mt-1 text-2xl font-semibold">2s</div>
            </div>
          </div>

          {data.threats.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              No threats yet. Start the TCP server + simulator.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Sensor</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Threat</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.threats
                    .slice()
                    .reverse()
                    .map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{t.sensor_id}</td>
                        <td className="whitespace-nowrap px-4 py-3">{String(t.sensor_type).toUpperCase()}</td>
                        <td className="px-4 py-3">{t.threat_type}</td>
                        <td className="whitespace-nowrap px-4 py-3">{t.confidence.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {t.severity ? (
                            <span className="rounded-md border px-2 py-1 text-xs font-medium">
                              {String(t.severity).toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
