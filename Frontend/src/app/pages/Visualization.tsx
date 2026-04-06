import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Download, ChevronDown, RotateCcw } from 'lucide-react';
import { parseISO, formatISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { NotificationBell } from '../components/NotificationBell';
import { useWebSocket } from '../context/WebSocketContext';
import { apiGet, APIError } from '../services/apiClient';
import { ThreatTimelineOut, ThreatsPerSensorOut, SeverityBreakdownOut, ThreatTypeBreakdownOut, ThreatLog, PagedThreats } from '../types/api';

export function Visualization() {
  const { liveThreats } = useWebSocket();
  
  // State for fetched analytics data
  const [threatsOverTimeData, setThreatsOverTimeData] = useState<any[]>([]);
  const [threatsByLocationData, setThreatsByLocationData] = useState<any[]>([]);
  const [threatTypeDistributionData, setThreatTypeDistributionData] = useState<any[]>([]);
  const [severityBreakdownData, setSeverityBreakdownData] = useState<any[]>([]);
  const [sensorActivityData, setSensorActivityData] = useState<any[]>([]);
  const [allThreats, setAllThreats] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterTimeRange, setFilterTimeRange] = useState('Last 7 Days');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterThreatType, setFilterThreatType] = useState('All');
  const [filterSensorType, setFilterSensorType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [fromDateTime, setFromDateTime] = useState<Date | null>(null);
  const [toDateTime, setToDateTime] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  });
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);
  const [availableThreatTypes, setAvailableThreatTypes] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  // Initialize available timezones
  useEffect(() => {
    try {
      const tzs = Intl.supportedValuesOf('timeZone');
      setAvailableTimezones(tzs);
    } catch {
      // Fallback to common timezones if not supported
      setAvailableTimezones(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']);
    }
  }, []);

  // Build query parameters based on current filters and timezone
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (filterLocation !== 'All') {
      params.append('location', filterLocation);
    }
    if (filterSensorType !== 'All') {
      params.append('sensor_type', filterSensorType);
    }
    if (filterThreatType !== 'All') {
      params.append('threat_type', filterThreatType);
    }
    if (filterSeverity !== 'All') {
      params.append('severity', filterSeverity);
    }

    // Handle time range parameters
    const now = new Date();
    let startTime: string | null = null;
    let endTime: string | null = null;

    if (filterTimeRange === 'Last 30 Min') {
      startTime = formatISO(new Date(now.getTime() - 30 * 60 * 1000));
    } else if (filterTimeRange === 'Last 1 Hour') {
      startTime = formatISO(new Date(now.getTime() - 60 * 60 * 1000));
    } else if (filterTimeRange === 'Last 24 Hours') {
      startTime = formatISO(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    } else if (filterTimeRange === 'Last 7 Days') {
      startTime = formatISO(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else if (filterTimeRange === 'Last 30 Days') {
      startTime = formatISO(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    } else if (filterTimeRange === 'Custom' && fromDateTime && toDateTime) {
      // Convert to timezone-adjusted ISO format
      const startZoned = toZonedTime(fromDateTime, timezone);
      const endZoned = toZonedTime(toDateTime, timezone);
      startTime = formatISO(startZoned);
      endTime = formatISO(endZoned);
    }

    if (startTime) {
      params.append('start_time', startTime);
    }
    if (endTime) {
      params.append('end_time', endTime);
    }

    return params.toString();
  };

  // Fetch analytics data when filters change
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const queryString = buildQueryParams();
        const suffix = queryString ? `?${queryString}` : '';

        const [timeline, perSensor, severity, threatTypeBreakdown, pagedThreats] = await Promise.all([
          apiGet<ThreatTimelineOut>(`/api/v1/analytics/threat-timeline${suffix}`),
          apiGet<ThreatsPerSensorOut>(`/api/v1/analytics/threats-per-sensor${suffix}`),
          apiGet<SeverityBreakdownOut>(`/api/v1/analytics/severity-breakdown${suffix}`),
          apiGet<ThreatTypeBreakdownOut>(`/api/v1/analytics/threat-type-breakdown${suffix}`),
          apiGet<PagedThreats>('/api/v1/threats'),
        ]);
        
        // Map threat timeline data: bucket => time field
        const timelineData = timeline.data.map(item => ({
          time: item.bucket,
          count: item.count,
        })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        setThreatsOverTimeData(timelineData);

        // Map threats per sensor with location field
        const locationData = perSensor.data
          .map(item => ({ 
            location: item.location || 'Unknown', 
            count: item.count 
          }))
          .sort((a, b) => b.count - a.count);
        setThreatsByLocationData(locationData);

        // Extract available locations from returned data
        const locations = Array.from(new Set(perSensor.data.map(item => item.location).filter(Boolean)));
        setAvailableLocations(locations);

        // Map threat type breakdown to vertical bar chart format
        const threatTypeData = threatTypeBreakdown.data.map(item => ({
          threat_type: item.threat_type,
          count: item.count,
        }));
        setThreatTypeDistributionData(threatTypeData);

        // Extract available threat types from returned data
        const threatTypes = Array.from(new Set(threatTypeBreakdown.data.map(item => item.threat_type)));
        setAvailableThreatTypes(threatTypes);

        // Map severity breakdown data with colors
        const severityColors: { [key: string]: string } = {
          low: '#16A34A',
          med: '#D97706',
          high: '#DC2626',
          critical: '#8B0000',
        };
        const severityData = severity.data.map(item => ({
          name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
          value: item.count,
          color: severityColors[item.severity] || '#999999',
        }));
        setSeverityBreakdownData(severityData);
        
        // Extract items from paginated response
        setAllThreats(pagedThreats.items);
      } catch (err) {
        const message = err instanceof APIError ? err.message : 'Failed to fetch analytics';
        setError(message);
        console.error('[Visualization] Error fetching:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [filterTimeRange, filterLocation, filterThreatType, filterSensorType, filterSeverity, fromDateTime, toDateTime, timezone]);

  // Merge API threats with live threats, removing duplicates by alert_id
  const mergedThreats = Array.from(
    new Map([...allThreats, ...liveThreats].map(t => [t.alert_id, t])).values()
  );

  // Filter threats based on all criteria
  const filteredThreats = mergedThreats.filter((threat) => {
    // Threat Type filter
    if (filterThreatType !== 'All' && threat.threat_type !== filterThreatType) {
      return false;
    }

    // Sensor Type filter
    if (filterSensorType !== 'All' && threat.sensor_type !== filterSensorType) {
      return false;
    }

    // Severity filter
    if (filterSeverity !== 'All' && threat.severity !== filterSeverity) {
      return false;
    }

    // Time Range filter
    if (filterTimeRange !== 'All') {
      const threatTime = new Date(threat.timestamp);
      const now = new Date();

      if (filterTimeRange === 'Last 30 Min') {
        if (threatTime < new Date(now.getTime() - 30 * 60 * 1000)) return false;
      } else if (filterTimeRange === 'Last 1 Hour') {
        if (threatTime < new Date(now.getTime() - 60 * 60 * 1000)) return false;
      } else if (filterTimeRange === 'Last 24 Hours') {
        if (threatTime < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return false;
      } else if (filterTimeRange === 'Last 7 Days') {
        if (threatTime < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
      } else if (filterTimeRange === 'Last 30 Days') {
        if (threatTime < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
      } else if (filterTimeRange === 'Custom' && fromDateTime && toDateTime) {
        if (threatTime < fromDateTime || threatTime > toDateTime) return false;
      }
    }

    return true;
  });

  // Reset filters
  const resetFilters = () => {
    setFilterTimeRange('Last 7 Days');
    setFilterLocation('All');
    setFilterThreatType('All');
    setFilterSensorType('All');
    setFilterSeverity('All');
    setFromDateTime(null);
    setToDateTime(null);
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTimezone('UTC');
    }
  };

  return (
    <>
      <style>{`
        .react-datepicker-wrapper input {
          width: 100% !important;
          padding: 8px 12px !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 6px !important;
          font-size: 1.00625rem !important;
          color: var(--text-primary) !important;
          background: #FFFFFF !important;
          font-family: inherit !important;
          transition: all 0.2s duration !important;
          outline: none;
        }
        .react-datepicker-wrapper input:hover {
          border-color: #0284C7 !important;
        }
        .react-datepicker-wrapper input:focus {
          border-color: #0284C7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1) !important;
        }
        .react-datepicker {
          font-size: 0.875rem !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        .react-datepicker__header {
          background-color: var(--bg-card) !important;
          border-bottom: 1px solid #E2E8F0 !important;
          border-radius: 8px 8px 0 0 !important;
        }
        .react-datepicker__current-month {
          color: var(--text-primary) !important;
          font-weight: 600 !important;
        }
        .react-datepicker__day {
          color: var(--text-primary) !important;
        }
        .react-datepicker__day--selected {
          background-color: #0284C7 !important;
          color: #FFFFFF !important;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: #0284C7 !important;
          color: #FFFFFF !important;
        }
        .react-datepicker__day:hover {
          background-color: #E0F2FE !important;
        }
        .react-datepicker__time-list-item--selected {
          background-color: #0284C7 !important;
          color: #FFFFFF !important;
        }
        .react-datepicker__time-list-item:hover {
          background-color: #E0F2FE !important;
        }
      `}</style>
      <div className="p-6 space-y-6">
        {/* Notification Bell */}
        <NotificationBell liveThreats={liveThreats} />

        {/* Page Header */}
        <div>
          <div
            className="mb-2"
            style={{
              fontSize: '0.865rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Dashboard / Visualization
          </div>
          <h1
            className="font-heading"
            style={{
              fontSize: '2.3rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            VISUALIZATION
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="p-4 rounded-lg border flex items-center justify-between"
            style={{
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
            }}
          >
            <span>⚠️ {error}</span>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1 rounded transition-colors"
              style={{
                background: '#991B1B',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: '#0284C7' }}
              />
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', fontSize: '0.875rem' }}>
                Loading analytics...
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
        <div>
          <div
            className="rounded-lg p-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
            }}
          >
            <div className="flex flex-wrap items-end gap-4">
              {/* Time Range */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Time Range
                </label>
                <div className="relative">
                  <select
                    value={filterTimeRange}
                    onChange={(e) => setFilterTimeRange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    <option value="Last 30 Min">Last 30 Min</option>
                    <option value="Last 1 Hour">Last 1 Hour</option>
                    <option value="Last 24 Hours">Last 24 Hours</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Location
                </label>
                <div className="relative">
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    <option value="All">All</option>
                    {availableLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Threat Type */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Threat Type
                </label>
                <div className="relative">
                  <select
                    value={filterThreatType}
                    onChange={(e) => setFilterThreatType(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    <option value="All">All</option>
                    {availableThreatTypes.map((threatType) => (
                      <option key={threatType} value={threatType}>
                        {threatType}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Sensor Type */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Sensor Type
                </label>
                <div className="relative">
                  <select
                    value={filterSensorType}
                    onChange={(e) => setFilterSensorType(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    <option value="All">All</option>
                    <option value="radar">Radar</option>
                    <option value="lidar">Lidar</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Severity */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Severity
                </label>
                <div className="relative">
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    <option value="All">All</option>
                    <option value="high">High</option>
                    <option value="med">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="flex-1 min-w-[150px]">
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '0.71875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  Timezone
                </label>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '1.00625rem',
                    }}
                  >
                    {availableTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <div>
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded transition-all duration-200"
                  style={{
                    background: 'transparent',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#64748B',
                    fontSize: '1.00625rem',
                    fontWeight: 600,
                    height: '42px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284C7';
                    e.currentTarget.style.color = '#0284C7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.color = '#64748B';
                  }}
                >
                  <RotateCcw size={16} />
                  RESET
                </button>
              </div>
            </div>

            {/* Custom Date Picker */}
            {filterTimeRange === 'Custom' && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex flex-wrap items-end gap-4">
                  {/* FROM Date/Time */}
                  <div className="flex-1 min-w-[200px]">
                    <label
                      className="block mb-2"
                      style={{
                        fontSize: '0.71875rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}
                    >
                      FROM
                    </label>
                    <DatePicker
                      selected={fromDateTime}
                      onChange={(date: Date | null) => {
                        setFromDateTime(date);
                        if (toDateTime && date && toDateTime < date)
                          setToDateTime(null);
                      }}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={1}
                      dateFormat="dd/MM/yyyy HH:mm"
                      placeholderText="DD/MM/YYYY HH:MM"
                      isClearable
                    />
                  </div>

                  {/* TO Date/Time */}
                  <div className="flex-1 min-w-[200px]">
                    <label
                      className="block mb-2"
                      style={{
                        fontSize: '0.71875rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}
                    >
                      TO
                    </label>
                    <DatePicker
                      selected={toDateTime}
                      onChange={(date: Date | null) => setToDateTime(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={1}
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
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Chart 1: Threats Over Time */}
          <ChartCard title="Threats Over Time">
            {filteredThreats.length === 0 ? (
              <div className="w-full h-[250px] flex items-center justify-center">
                <div
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No data available for selected filters
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={threatsOverTimeData}>
                  <defs>
                    <linearGradient
                      id="colorCount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(226, 232, 240, 0.8)"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0284C7"
                    strokeWidth={3}
                    fill="url(#colorCount)"
                    dot={{ fill: '#0284C7', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Chart 2: Threats by Location */}
          <ChartCard title="Threats by Location">
            {filteredThreats.length === 0 ? (
              <div className="w-full h-[250px] flex items-center justify-center">
                <div
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No data available for selected filters
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={threatsByLocationData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(226, 232, 240, 0.8)"
                  />
                  <XAxis
                    type="number"
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="location"
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {threatsByLocationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`rgba(2, 132, 199, ${0.4 + entry.count * 0.04})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Chart 3: Threat Type Distribution */}
          <ChartCard title="Threat Type Distribution">
            {threatTypeDistributionData.length === 0 ? (
              <div className="w-full h-[250px] flex items-center justify-center">
                <div
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No data available for selected filters
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={threatTypeDistributionData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(226, 232, 240, 0.8)"
                  />
                  <XAxis
                    dataKey="threat_type"
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="count" fill="#0284C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Chart 4: Severity Breakdown */}
          <ChartCard title="Severity Breakdown">
            {severityBreakdownData.length === 0 ? (
              <div className="w-full h-[250px] flex items-center justify-center">
                <div
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No data available for selected filters
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={severityBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {severityBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
        </>
        )}
      </div>
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 border transition-all duration-200 relative"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="uppercase tracking-wider"
          style={{
            fontSize: '0.865rem',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {title}
        </h3>
        <button
          className="p-1 rounded transition-all duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-cyan)';
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Download size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}