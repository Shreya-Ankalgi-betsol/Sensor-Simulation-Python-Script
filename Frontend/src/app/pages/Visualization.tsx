import { useCallback, useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, MapPin, RotateCcw, ShieldAlert, Waves } from 'lucide-react';
import { formatISO } from 'date-fns';
import HeadlessUIDropdown from '../components/HeadlessUIDropdown';
import CheckboxGroup from '../components/CheckboxGroup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useWebSocket } from '../context/WebSocketContext';
import { useSensors } from '../context/SensorContext';
import { apiGet, APIError } from '../services/apiClient';
import { PagedThreats, ThreatLog } from '../types/api';

type ThreatWithContext = ThreatLog & {
  location: string;
  severity_normalized: 'low' | 'med' | 'high' | 'critical';
};

const severityPalette: Record<'low' | 'med' | 'high' | 'critical', string> = {
  low: '#16a34a',
  med: '#f59e0b',
  high: '#ea580c',
  critical: '#dc2626',
};

const severityWeight: Record<'low' | 'med' | 'high' | 'critical', number> = {
  low: 1,
  med: 2,
  high: 3,
  critical: 5,
};

function normalizeSeverity(value: string): 'low' | 'med' | 'high' | 'critical' {
  const cleaned = value.toLowerCase().trim();
  if (cleaned === 'critical') return 'critical';
  if (cleaned === 'high') return 'high';
  if (cleaned === 'medium' || cleaned === 'med') return 'med';
  return 'low';
}

function formatSeverityLabel(value: string): string {
  const normalized = normalizeSeverity(value);
  if (normalized === 'med') return 'Medium';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getStartTime(timeRange: string, customFrom: Date | null): Date | null {
  const now = new Date();
  if (timeRange === 'Last 30 Min') return new Date(now.getTime() - 30 * 60 * 1000);
  if (timeRange === 'Last 1 Hour') return new Date(now.getTime() - 60 * 60 * 1000);
  if (timeRange === 'Last 24 Hours') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (timeRange === 'Last 7 Days') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (timeRange === 'Last 30 Days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (timeRange === 'Custom') return customFrom;
  return null;
}

function getEndTime(timeRange: string, customTo: Date | null): Date | null {
  if (timeRange === 'Custom') return customTo;
  return null;
}

function makeHourLabel(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${ampm}`;
}

function getConfidenceBand(confidence: number): string {
  if (confidence < 0.2) return '0-20%';
  if (confidence < 0.4) return '20-40%';
  if (confidence < 0.6) return '40-60%';
  if (confidence < 0.8) return '60-80%';
  return '80-100%';
}

export function Visualization() {
  const { liveThreats } = useWebSocket();
  const { sensorList } = useSensors();

  const [allThreats, setAllThreats] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTimeRange, setFilterTimeRange] = useState('Last 7 Days');
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterThreatType, setFilterThreatType] = useState<string[]>([]);
  const [filterSensorType, setFilterSensorType] = useState<string[]>([]);
  const [filterSensorId, setFilterSensorId] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [fromDateTime, setFromDateTime] = useState<Date | null>(null);
  const [toDateTime, setToDateTime] = useState<Date | null>(null);

  const sensorLocationMap = useMemo(() => {
    const map = new Map<string, string>();
    sensorList.forEach((sensor) => {
      map.set(sensor.sensor_id, sensor.location || 'Unknown');
    });
    return map;
  }, [sensorList]);

  const fetchThreatLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let cursor: string | null = null;
      let hasMore = true;
      let pageCount = 0;
      const maxPages = 12;
      const merged: ThreatLog[] = [];

      while (hasMore && pageCount < maxPages) {
        const params = new URLSearchParams();
        params.append('page_size', '500');
        if (cursor) params.append('cursor', cursor);

        const response = await apiGet<PagedThreats>(`/api/v1/threats?${params.toString()}`);
        merged.push(...response.items);
        cursor = response.next_cursor;
        hasMore = response.has_more;
        pageCount += 1;

        if (!response.items.length) {
          break;
        }
      }

      setAllThreats(merged);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to fetch threat logs';
      setError(message);
      console.error('[Visualization] Error loading threat logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreatLogs();
  }, [fetchThreatLogs]);

  const mergedThreats = useMemo(() => {
    return Array.from(new Map([...allThreats, ...liveThreats].map((item) => [item.alert_id, item])).values());
  }, [allThreats, liveThreats]);

  const threatsWithContext = useMemo<ThreatWithContext[]>(() => {
    return mergedThreats.map((threat) => ({
      ...threat,
      location: sensorLocationMap.get(threat.sensor_id) || 'Unknown',
      severity_normalized: normalizeSeverity(threat.severity),
    }));
  }, [mergedThreats, sensorLocationMap]);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(threatsWithContext.map((t) => t.location).filter(Boolean))).sort();
  }, [threatsWithContext]);

  const availableThreatTypes = useMemo(() => {
    const scopedThreats = threatsWithContext.filter((threat) => {
      if (filterSensorType.length && !filterSensorType.includes(threat.sensor_type.toLowerCase())) {
        return false;
      }
      if (filterSensorId.length && !filterSensorId.includes(threat.sensor_id)) {
        return false;
      }
      return true;
    });

    return Array.from(new Set(scopedThreats.map((t) => t.threat_type).filter(Boolean))).sort();
  }, [threatsWithContext, filterSensorType, filterSensorId]);

  const availableSensorTypes = useMemo(() => {
    let fromThreats = threatsWithContext.map((t) => t.sensor_type.toLowerCase());
    let fromSensors = sensorList.map((s) => s.sensor_type.toLowerCase());
    
    // If sensor ID is selected, filter to only that sensor's type
    if (filterSensorId.length > 0) {
      const selectedSensorTypes = new Set(
        sensorList
          .filter((s) => filterSensorId.includes(s.sensor_id))
          .map((s) => s.sensor_type.toLowerCase())
      );
      fromThreats = fromThreats.filter((t) => selectedSensorTypes.has(t));
      fromSensors = fromSensors.filter((t) => selectedSensorTypes.has(t));
    }
    
    return Array.from(new Set([...fromThreats, ...fromSensors])).filter(Boolean).sort();
  }, [threatsWithContext, sensorList, filterSensorId]);

  const availableSensorIds = useMemo(() => {
    // If sensor type is selected, filter sensor IDs to only those sensor types
    let sensors = sensorList;
    if (filterSensorType.length > 0) {
      sensors = sensors.filter((s) =>
        filterSensorType.includes(s.sensor_type.toLowerCase())
      );
    }
    return sensors.map((s) => s.sensor_id).sort();
  }, [sensorList, filterSensorType]);

  useEffect(() => {
    setFilterThreatType((previous) => previous.filter((threatType) => availableThreatTypes.includes(threatType)));
  }, [availableThreatTypes]);

  const filteredThreats = useMemo(() => {
    const startTime = getStartTime(filterTimeRange, fromDateTime);
    const endTime = getEndTime(filterTimeRange, toDateTime);

    return threatsWithContext
      .filter((threat) => {
        if (filterLocation.length && !filterLocation.includes(threat.location)) return false;
        if (filterThreatType.length && !filterThreatType.includes(threat.threat_type)) return false;
        if (filterSensorType.length && !filterSensorType.includes(threat.sensor_type.toLowerCase())) return false;
        if (filterSensorId.length && !filterSensorId.includes(threat.sensor_id)) return false;
        if (filterSeverity.length && !filterSeverity.includes(threat.severity_normalized)) return false;

        const threatTime = new Date(threat.timestamp);
        if (startTime && threatTime < startTime) return false;
        if (endTime && threatTime > endTime) return false;

        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [
    threatsWithContext,
    filterLocation,
    filterThreatType,
    filterSensorType,
    filterSensorId,
    filterSeverity,
    filterTimeRange,
    fromDateTime,
    toDateTime,
  ]);

  const summary = useMemo(() => {
    const total = filteredThreats.length;
    const highOrCritical = filteredThreats.filter((t) => ['high', 'critical'].includes(t.severity_normalized)).length;
    const uniqueLocations = new Set(filteredThreats.map((t) => t.location)).size;
    const uniqueSensors = new Set(filteredThreats.map((t) => t.sensor_id)).size;
    const averageConfidence =
      total === 0
        ? 0
        : Math.round((filteredThreats.reduce((acc, t) => acc + Math.max(0, Math.min(1, t.confidence || 0)), 0) / total) * 100);

    return {
      total,
      highOrCritical,
      highRate: total ? Math.round((highOrCritical / total) * 100) : 0,
      uniqueLocations,
      uniqueSensors,
      averageConfidence,
    };
  }, [filteredThreats]);

  const timelineData = useMemo(() => {
    if (!filteredThreats.length) return [];

    const granularByHour = ['Last 30 Min', 'Last 1 Hour', 'Last 24 Hours'].includes(filterTimeRange);
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: granularByHour ? 'numeric' : undefined,
      minute: granularByHour ? '2-digit' : undefined,
    });

    const bucketMap = new Map<string, { label: string; count: number; high_count: number }>();

    filteredThreats.forEach((threat) => {
      const timestamp = new Date(threat.timestamp);
      const bucketDate = new Date(timestamp);

      if (granularByHour) {
        bucketDate.setMinutes(0, 0, 0);
      } else {
        bucketDate.setHours(0, 0, 0, 0);
      }

      const key = bucketDate.toISOString();
      const existing = bucketMap.get(key) || {
        label: formatter.format(bucketDate),
        count: 0,
        high_count: 0,
      };

      existing.count += 1;
      if (['high', 'critical'].includes(threat.severity_normalized)) {
        existing.high_count += 1;
      }

      bucketMap.set(key, existing);
    });

    return Array.from(bucketMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([, value]) => value);
  }, [filteredThreats, filterTimeRange]);

  const locationRiskData = useMemo(() => {
    const locationMap = new Map<string, { location: string; count: number; risk_score: number }>();

    filteredThreats.forEach((threat) => {
      const existing = locationMap.get(threat.location) || {
        location: threat.location,
        count: 0,
        risk_score: 0,
      };

      existing.count += 1;
      existing.risk_score += severityWeight[threat.severity_normalized];
      locationMap.set(threat.location, existing);
    });

    return Array.from(locationMap.values())
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 10);
  }, [filteredThreats]);

  const threatTypeDistributionData = useMemo(() => {
    const map = new Map<string, { threat_type: string; count: number }>();

    filteredThreats.forEach((threat) => {
      const existing = map.get(threat.threat_type) || { threat_type: threat.threat_type, count: 0 };
      existing.count += 1;
      map.set(threat.threat_type, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredThreats]);

  const severityBreakdownData = useMemo(() => {
    const counter: Record<'low' | 'med' | 'high' | 'critical', number> = {
      low: 0,
      med: 0,
      high: 0,
      critical: 0,
    };

    filteredThreats.forEach((threat) => {
      counter[threat.severity_normalized] += 1;
    });

    return Object.entries(counter)
      .filter(([, count]) => count > 0)
      .map(([key, value]) => ({
        name: formatSeverityLabel(key),
        value,
        color: severityPalette[key as 'low' | 'med' | 'high' | 'critical'],
      }));
  }, [filteredThreats]);

  const threatTypeSeverityData = useMemo(() => {
    const map = new Map<
      string,
      {
        threat_type: string;
        low: number;
        med: number;
        high: number;
        critical: number;
      }
    >();

    filteredThreats.forEach((threat) => {
      const existing = map.get(threat.threat_type) || {
        threat_type: threat.threat_type,
        low: 0,
        med: 0,
        high: 0,
        critical: 0,
      };

      existing[threat.severity_normalized] += 1;
      map.set(threat.threat_type, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.high + b.critical - (a.high + a.critical));
  }, [filteredThreats]);

  const confidenceDistributionData = useMemo(() => {
    const bands = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    const counter = new Map(bands.map((label) => [label, 0]));

    filteredThreats.forEach((threat) => {
      const band = getConfidenceBand(Math.max(0, Math.min(1, threat.confidence || 0)));
      counter.set(band, (counter.get(band) || 0) + 1);
    });

    return bands.map((band) => ({ band, count: counter.get(band) || 0 }));
  }, [filteredThreats]);

  const hourlyIntensity = useMemo(() => {
    const rows = ['low', 'med', 'high', 'critical'] as const;
    const matrix = rows.map((severity) => ({ severity, hours: Array(24).fill(0) as number[] }));

    filteredThreats.forEach((threat) => {
      const hour = new Date(threat.timestamp).getHours();
      const row = matrix.find((item) => item.severity === threat.severity_normalized);
      if (row) {
        row.hours[hour] += 1;
      }
    });

    const maxValue = Math.max(...matrix.flatMap((row) => row.hours), 0);
    return { matrix, maxValue };
  }, [filteredThreats]);

  const sensorHotspots = useMemo(() => {
    const map = new Map<
      string,
      {
        sensor_id: string;
        sensor_type: string;
        location: string;
        total: number;
        high_critical: number;
      }
    >();

    filteredThreats.forEach((threat) => {
      const existing = map.get(threat.sensor_id) || {
        sensor_id: threat.sensor_id,
        sensor_type: threat.sensor_type,
        location: threat.location,
        total: 0,
        high_critical: 0,
      };
      existing.total += 1;
      if (['high', 'critical'].includes(threat.severity_normalized)) {
        existing.high_critical += 1;
      }
      map.set(threat.sensor_id, existing);
    });

    return Array.from(map.values())
      .map((sensor) => ({
        ...sensor,
        risk_ratio: sensor.total ? Math.round((sensor.high_critical / sensor.total) * 100) : 0,
      }))
      .sort((a, b) => b.high_critical - a.high_critical)
      .slice(0, 8);
  }, [filteredThreats]);

  const resetFilters = () => {
    setFilterTimeRange('Last 7 Days');
    setFilterLocation([]);
    setFilterThreatType([]);
    setFilterSensorType([]);
    setFilterSensorId([]);
    setFilterSeverity([]);
    setFromDateTime(null);
    setToDateTime(null);
  };

  return (
    <>
      <style>{`
        .react-datepicker-wrapper input {
          width: 100% !important;
          padding: 8px 12px !important;
          border: 1px solid #dbe3ef !important;
          border-radius: 8px !important;
          font-size: 1rem !important;
          color: var(--text-primary) !important;
          background: #ffffff !important;
          transition: all 0.2s duration !important;
          outline: none;
        }
        .react-datepicker-wrapper input:hover {
          border-color: #0f4c81 !important;
        }
        .react-datepicker-wrapper input:focus {
          border-color: #0f4c81 !important;
          box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.12) !important;
        }
        [role="tablist"] [role="tab"][data-state="active"] {
          background-color: #0f4c81 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        [role="tablist"] [role="tab"] {
          transition: all 0.2s ease !important;
        }
      `}</style>

      <div className="p-4 space-y-4 xl:p-5">
        <div className="flex items-center justify-between mb-2">
          <h1
            className="font-heading"
            style={{ fontSize: 'var(--fs-5)', fontWeight: 700, color: 'var(--text-primary)' }}
          >
            Visualization
          </h1>
          <button
            onClick={fetchThreatLogs}
            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200"
            style={{
              border: '1px solid #0f4c81',
              color: '#0f4c81',
              background: '#ffffff',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            <RotateCcw size={12} />
            Refresh
          </button>
        </div>

        <div
          className="rounded-3xl p-3 border"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(15,76,129,0.12), rgba(14,116,144,0.02) 55%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
            borderColor: 'rgba(203,213,225,0.9)',
          }}
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<AlertTriangle size={18} />}
              title="Filtered Threats"
              value={summary.total.toLocaleString()}
              subtitle={`${summary.highOrCritical.toLocaleString()} high/critical`}
              tone="#0f4c81"
            />
            <StatCard
              icon={<ShieldAlert size={18} />}
              title="High-Risk Ratio"
              value={`${summary.highRate}%`}
              subtitle="High + Critical / Total"
              tone="#b45309"
            />
            <StatCard
              icon={<Waves size={18} />}
              title="Confidence Mean"
              value={`${summary.averageConfidence}%`}
              subtitle="Average model confidence"
              tone="#0f766e"
            />
            <StatCard
              icon={<MapPin size={18} />}
              title="Operational Spread"
              value={`${summary.uniqueLocations} locations`}
              subtitle={`${summary.uniqueSensors} active sensors in view`}
              tone="#7c2d12"
            />
          </div>
        </div>

        {error && (
          <div
            className="p-4 rounded-lg border"
            style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}
          >
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: '#0f4c81' }}
              />
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.875rem' }}>
                Loading threat analytics...
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div
              className="rounded-3xl p-4 shadow-sm"
              style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(203,213,225,0.9)' }}
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[160px]">
                  <HeadlessUIDropdown
                    value={filterTimeRange}
                    onChange={setFilterTimeRange}
                    options={[
                      { value: 'Last 30 Min', label: 'Last 30 Min' },
                      { value: 'Last 1 Hour', label: 'Last 1 Hour' },
                      { value: 'Last 24 Hours', label: 'Last 24 Hours' },
                      { value: 'Last 7 Days', label: 'Last 7 Days' },
                      { value: 'Last 30 Days', label: 'Last 30 Days' },
                      { value: 'All', label: 'All Time' },
                      { value: 'Custom', label: 'Custom' },
                    ]}
                    label="Time Range"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <CheckboxGroup
                    label="Location"
                    selected={filterLocation}
                    onChange={setFilterLocation}
                    options={availableLocations.map((location) => ({ value: location, label: location }))}
                    placeholderText="All Locations"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <CheckboxGroup
                    label="Threat Type"
                    selected={filterThreatType}
                    onChange={setFilterThreatType}
                    options={availableThreatTypes.map((threatType) => ({
                      value: threatType,
                      label: threatType,
                    }))}
                    placeholderText="All Threat Types"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <CheckboxGroup
                    label="Sensor Type"
                    selected={filterSensorType}
                    onChange={setFilterSensorType}
                    options={availableSensorTypes.map((sensorType) => ({
                      value: sensorType,
                      label: sensorType.toUpperCase(),
                    }))}
                    placeholderText="All Sensor Types"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <CheckboxGroup
                    label="Sensor ID"
                    selected={filterSensorId}
                    onChange={setFilterSensorId}
                    options={availableSensorIds.map((id) => ({
                      value: id,
                      label: id,
                    }))}
                    placeholderText="All Sensor IDs"
                  />
                </div>

                <div className="flex-1 min-w-[160px]">
                  <CheckboxGroup
                    label="Severity"
                    selected={filterSeverity}
                    onChange={setFilterSeverity}
                    options={[
                      { value: 'critical', label: 'Critical' },
                      { value: 'high', label: 'High' },
                      { value: 'med', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                    placeholderText="All Severities"
                  />
                </div>

                <div>
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
                    style={{
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      height: '42px',
                      background: '#ffffff',
                    }}
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
              </div>

              {filterTimeRange === 'Custom' && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e2e8f0' }}>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label
                        className="block mb-2"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                        }}
                      >
                        From
                      </label>
                      <DatePicker
                        selected={fromDateTime}
                        onChange={(date: Date | null) => {
                          setFromDateTime(date);
                          if (toDateTime && date && toDateTime < date) setToDateTime(null);
                        }}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={5}
                        dateFormat="dd/MM/yyyy HH:mm"
                        placeholderText="DD/MM/YYYY HH:MM"
                        isClearable
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label
                        className="block mb-2"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                        }}
                      >
                        To
                      </label>
                      <DatePicker
                        selected={toDateTime}
                        onChange={(date: Date | null) => setToDateTime(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={5}
                        dateFormat="dd/MM/yyyy HH:mm"
                        placeholderText="DD/MM/YYYY HH:MM"
                        minDate={fromDateTime || undefined}
                        isClearable
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Tabs defaultValue="command" className="space-y-4">
              <TabsList className="w-full max-w-[620px] grid grid-cols-3 h-11 p-1 rounded-2xl border" style={{ borderColor: '#dbe3ef', background: '#f8fafc' }}>
                <TabsTrigger value="command" className="rounded-xl">Command View</TabsTrigger>
                <TabsTrigger value="risk" className="rounded-xl">Risk Breakdown</TabsTrigger>
                <TabsTrigger value="feed" className="rounded-xl">Event Feed</TabsTrigger>
              </TabsList>

              <TabsContent value="command" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <ChartCard title="Threat Pulse Over Time" subtitle="Total detections and high/critical trend">
                    <ChartEmptyGuard hasData={timelineData.length > 0}>
                      <ResponsiveContainer width="100%" height={290}>
                        <AreaChart data={timelineData}>
                          <defs>
                            <linearGradient id="threatTotalGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0f4c81" stopOpacity={0.34} />
                              <stop offset="95%" stopColor="#0f4c81" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.8)" />
                          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #dbe3ef',
                              borderRadius: '10px',
                            }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="count" name="Total Threats" stroke="#0f4c81" fill="url(#threatTotalGradient)" strokeWidth={2.4} />
                          <Line type="monotone" dataKey="high_count" name="High + Critical" stroke="#dc2626" strokeWidth={2.2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartEmptyGuard>
                  </ChartCard>

                  <ChartCard title="Location Risk Ranking" subtitle="Severity-weighted hotspots">
                    <ChartEmptyGuard hasData={locationRiskData.length > 0}>
                      <div style={{ overflowY: 'auto', maxHeight: '450px' }}>
                        <ResponsiveContainer width="100%" height={Math.max(290, locationRiskData.length * 28)}>
                          <BarChart data={locationRiskData} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.7)" />
                          <XAxis type="number" stroke="#64748b" fontSize={12} label={{ value: 'Risk Score / Threat Count', position: 'insideBottomRight', offset: -10, style: { fontSize: '11px', fill: '#64748b' } }} />
                          <YAxis type="category" dataKey="location" width={0} stroke="#64748b" fontSize={12} tick={false} />
                          <Tooltip
                            formatter={(value: number, name: string) => [Math.round(value), name]}
                            labelFormatter={(location) => `Location: ${location}`}
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #dbe3ef',
                              borderRadius: '10px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="risk_score" name="Risk Score" fill="#0f766e" radius={[0, 8, 8, 0]} />
                          <Bar dataKey="count" name="Threat Count" fill="#0f4c81" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartEmptyGuard>
                  </ChartCard>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <ChartCard title="Threat Type Distribution" subtitle="Top detection categories">
                    <ChartEmptyGuard hasData={threatTypeDistributionData.length > 0}>
                      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                        <ResponsiveContainer width={Math.max(500, threatTypeDistributionData.length * 60)} height={290}>
                          <BarChart data={threatTypeDistributionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.7)" />
                          <XAxis dataKey="threat_type" stroke="#64748b" fontSize={12} tick={false} label={{ value: 'Threat Type', position: 'bottom', offset: 10, style: { fontSize: '12px', fill: '#64748b' } }} />
                          <YAxis stroke="#64748b" fontSize={12} label={{ value: 'Threat Count', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }} />
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #dbe3ef',
                              borderRadius: '10px',
                            }}
                            formatter={(value) => [value, 'Detections']}
                            labelFormatter={(type) => `Type: ${type}`}
                          />
                          <Bar dataKey="count" fill="#334155" radius={[8, 8, 0, 0]}>
                              {threatTypeDistributionData.map((entry) => (
                              <Cell key={entry.threat_type} fill="#334155" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartEmptyGuard>
                  </ChartCard>

                  <ChartCard title="Severity Split" subtitle="Distribution of severity classes">
                    <ChartEmptyGuard hasData={severityBreakdownData.length > 0}>
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart>
                          <Pie
                            data={severityBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={64}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {severityBreakdownData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #dbe3ef',
                              borderRadius: '10px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartEmptyGuard>
                  </ChartCard>
                </div>
              </TabsContent>

              <TabsContent value="risk" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <ChartCard title="Threat Type x Severity" subtitle="Stacked risk profile by category">
                    <ChartEmptyGuard hasData={threatTypeSeverityData.length > 0}>
                      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                        <ResponsiveContainer width={Math.max(600, threatTypeSeverityData.length * 78)} height={310}>
                          <BarChart data={threatTypeSeverityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.7)" />
                            <XAxis
                              dataKey="threat_type"
                              stroke="#64748b"
                              fontSize={12}
                              tick={false}
                              label={{ value: 'Threat Type', position: 'bottom', offset: 10, style: { fontSize: '12px', fill: '#64748b' } }}
                            />
                            <YAxis
                              stroke="#64748b"
                              fontSize={12}
                              label={{ value: 'Threat Count', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }}
                            />
                            <Tooltip
                              labelFormatter={(type) => `Type: ${type}`}
                              contentStyle={{
                                background: '#ffffff',
                                border: '1px solid #dbe3ef',
                                borderRadius: '10px',
                              }}
                            />
                            <Legend />
                            <Bar dataKey="low" stackId="risk" fill={severityPalette.low} />
                            <Bar dataKey="med" stackId="risk" fill={severityPalette.med} />
                            <Bar dataKey="high" stackId="risk" fill={severityPalette.high} />
                            <Bar dataKey="critical" stackId="risk" fill={severityPalette.critical} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartEmptyGuard>
                  </ChartCard>

                  <ChartCard title="Confidence Distribution" subtitle="Model confidence quality across threats">
                    <ChartEmptyGuard hasData={confidenceDistributionData.some((item) => item.count > 0)}>
                      <ResponsiveContainer width="100%" height={310}>
                        <LineChart data={confidenceDistributionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.7)" />
                          <XAxis dataKey="band" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #dbe3ef',
                              borderRadius: '10px',
                            }}
                          />
                          <Line type="monotone" dataKey="count" stroke="#0f4c81" strokeWidth={2.6} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartEmptyGuard>
                  </ChartCard>
                </div>

                <ChartCard title="Hourly Severity Heatmap" subtitle="Temporal intensity by hour of day">
                  <ChartEmptyGuard hasData={summary.total > 0}>
                    <div className="overflow-x-auto">
                      <div className="min-w-[860px]">
                        <div className="grid" style={{ gridTemplateColumns: '120px repeat(24, minmax(24px, 1fr))', gap: '6px' }}>
                          <div />
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <div key={`hour-${hour}`} className="text-center" style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                              {makeHourLabel(hour)}
                            </div>
                          ))}

                          {hourlyIntensity.matrix.map((row) => (
                            <>
                              <div
                                key={`${row.severity}-label`}
                                className="flex items-center"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#334155',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {formatSeverityLabel(row.severity)}
                              </div>
                              {row.hours.map((value, hourIndex) => {
                                const intensity = hourlyIntensity.maxValue === 0 ? 0 : value / hourlyIntensity.maxValue;
                                const alpha = value === 0 ? 0.06 : Math.max(0.15, intensity);
                                return (
                                  <div
                                    key={`${row.severity}-${hourIndex}`}
                                    title={`${formatSeverityLabel(row.severity)} at ${makeHourLabel(hourIndex)}: ${value}`}
                                    className="rounded-md"
                                    style={{
                                      height: '26px',
                                      background: `rgba(15, 76, 129, ${alpha})`,
                                      border: '1px solid rgba(148,163,184,0.18)',
                                    }}
                                  />
                                );
                              })}
                            </>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ChartEmptyGuard>
                </ChartCard>
              </TabsContent>

              <TabsContent value="feed" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2">
                    <ChartCard title="Recent Threat Feed" subtitle="Latest 20 filtered threat records">
                      <ChartEmptyGuard hasData={filteredThreats.length > 0}>
                        <div className="overflow-auto" style={{ maxHeight: '430px' }}>
                          <table className="w-full">
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                {['Timestamp', 'Type', 'Severity', 'Sensor', 'Location', 'Confidence'].map((column) => (
                                  <th
                                    key={column}
                                    className="text-left px-3 py-2"
                                    style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredThreats.slice(0, 20).map((threat, index) => (
                                <tr
                                  key={threat.alert_id}
                                  style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: index % 2 === 0 ? 'rgba(248,250,252,0.6)' : '#ffffff',
                                  }}
                                >
                                  <td className="px-3 py-2" style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'var(--font-mono)' }}>
                                    {new Date(threat.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2" style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                                    {threat.threat_type}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className="inline-flex px-2 py-1 rounded-full"
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        background: `${severityPalette[threat.severity_normalized]}1a`,
                                        color: severityPalette[threat.severity_normalized],
                                      }}
                                    >
                                      {formatSeverityLabel(threat.severity_normalized)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2" style={{ fontSize: '0.82rem', color: '#334155' }}>
                                    {threat.sensor_id} ({threat.sensor_type})
                                  </td>
                                  <td className="px-3 py-2" style={{ fontSize: '0.82rem', color: '#334155' }}>
                                    {threat.location}
                                  </td>
                                  <td className="px-3 py-2" style={{ fontSize: '0.82rem', color: '#334155' }}>
                                    {Math.round(Math.max(0, Math.min(1, threat.confidence || 0)) * 100)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ChartEmptyGuard>
                    </ChartCard>
                  </div>

                  <div>
                    <ChartCard title="Sensor Hotspots" subtitle="Most risk-heavy sensor nodes">
                      <ChartEmptyGuard hasData={sensorHotspots.length > 0}>
                        <div className="space-y-2">
                          {sensorHotspots.map((sensor) => (
                            <div
                              key={sensor.sensor_id}
                              className="p-3 rounded-xl border"
                              style={{ borderColor: '#e2e8f0', background: '#ffffff' }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                    {sensor.sensor_id}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {sensor.sensor_type.toUpperCase()} • {sensor.location}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
                                  {sensor.risk_ratio}% risk
                                </div>
                              </div>
                              <div className="mt-2" style={{ fontSize: '0.75rem', color: '#334155' }}>
                                {sensor.high_critical} high/critical of {sensor.total} total detections
                              </div>
                            </div>
                          ))}
                        </div>
                      </ChartEmptyGuard>
                    </ChartCard>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  tone: string;
}) {
  return (
    <div
      className="rounded-lg border p-2"
      style={{
        borderColor: 'rgba(203,213,225,0.9)',
        background: '#ffffff',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div style={{ color: tone }}>{icon}</div>
        <div
          style={{
            fontSize: '0.58rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            fontWeight: 700,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>{subtitle}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl p-5 border shadow-sm"
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderColor: 'rgba(203,213,225,0.9)',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div className="mb-4">
        <h3 style={{ fontSize: '0.84rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#0f4c81', fontWeight: 700 }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ChartEmptyGuard({ hasData, children }: { hasData: boolean; children: React.ReactNode }) {
  if (!hasData) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center text-center" style={{ color: '#64748b', fontSize: '0.9rem' }}>
        No data available for the selected filters.
      </div>
    );
  }

  return <>{children}</>;
}
