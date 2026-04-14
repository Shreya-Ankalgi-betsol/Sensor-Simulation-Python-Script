import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { RotateCcw } from "lucide-react";
import { useWebSocket } from '../context/WebSocketContext'
import { useActiveTab } from '../context/ActiveTabContext';
import { useSensors } from "../context/SensorContext";
import { apiGet, APIError } from '../services/apiClient';
import { ThreatLog, ThreatSummaryOut, PagedThreats } from '../types/api';
import HeadlessUIDropdown from '../components/HeadlessUIDropdown';
import CheckboxGroup from '../components/CheckboxGroup';
import { NotificationBell } from '../components/NotificationBell';

// Common IANA timezones
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'America/Toronto',
  'America/Mexico_City',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
];

type ActiveTab = 'live' | 'logs';

export function Threats() {
  const { sensorList } = useSensors();
  const { liveThreats, isConnected, connectionStatus } = useWebSocket();
  const { setActiveTab: updateGlobalActiveTab } = useActiveTab();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  
  // Live Stream Tab State - tracks which threats to display in this tab
  const [liveStreamThreats, setLiveStreamThreats] = useState<ThreatLog[]>([]);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [streamPauseTimestamp, setStreamPauseTimestamp] = useState<number | null>(null); // Track when stream was paused
  const [liveStreamStats, setLiveStreamStats] = useState({ total: 0, high: 0, active: 0 });
  const [lastThreatTimestamp, setLastThreatTimestamp] = useState<number>(Date.now()); // Track when tab was opened
  const liveTableContainerRef = useRef<HTMLDivElement>(null);

  // Threat Logs Tab State
  const [logThreats, setLogThreats] = useState<ThreatLog[]>([]);
  const [threatLogSummary, setThreatLogSummary] = useState<ThreatSummaryOut | null>(null);
  const [logLoading, setLogLoading] = useState(true);
  const [logLoadingMore, setLogLoadingMore] = useState(false);
  
  const [filterTime, setFilterTime] = useState("All");
  const [filterSensorTypes, setFilterSensorTypes] = useState<string[]>([]);
  const [filterSensorIds, setFilterSensorIds] = useState<string[]>([]);
  const [filterThreatTypes, setFilterThreatTypes] = useState<string[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<string[]>([]);
  const [fromDateTime, setFromDateTime] = useState<Date | null>(null)
  const [toDateTime, setToDateTime] = useState<Date | null>(null)
  const [timezone, setTimezone] = useState<string>('UTC');
  const [availableThreatTypes, setAvailableThreatTypes] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const logTableContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const prevThreatCountRef = useRef<number>(0);
  const shouldRestoreScrollRef = useRef<boolean>(false);
  
  // Refs to maintain fresh state values in scroll listener without re-attaching
  const paginationStateRef = useRef({ 
    nextCursor: null as string | null, 
    hasMore: true, 
    logLoadingMore: false,
    fetchThreatLogs: null as any,
  });

  // Helper function to format UTC timestamp
  const formatTimestampInTimezone = (utcTimestamp: string, tz: string = timezone): string => {
    try {
      return new Date(utcTimestamp).toLocaleString('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return utcTimestamp;
    }
  };

  // Helper function to calculate date range
  const calculateDateRange = (): { from_dt: string | null; to_dt: string | null } => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = now;

    switch (filterTime) {
      case "All":
        return { from_dt: null, to_dt: null };
      case "Last 30 min":
        from = new Date(now.getTime() - 30 * 60 * 1000);
        break;
      case "Last 1 Hour":
        from = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "Last 2 Hours":
        from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case "Last 24 hours":
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "Last 7 days":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "Last 30 days":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "Custom":
        from = fromDateTime;
        to = toDateTime;
        break;
    }

    return {
      from_dt: from ? from.toISOString() : null,
      to_dt: to ? to.toISOString() : null,
    };
  };

  // Fetch all available threat types (independent of filters, or filtered by sensor type)
  const fetchAvailableThreatTypes = useCallback(async (sensorTypes: string[] = []) => {
    try {
      const params = new URLSearchParams();
      params.append("page_size", "1000"); // Get more threats to extract unique types
      
      // If specific sensor types are selected, filter by them
      sensorTypes.forEach(type => {
        params.append("sensor_type", type.toLowerCase());
      });
      
      const url = `/api/v1/threats?${params.toString()}`;
      const pagedThreats = await apiGet<PagedThreats>(url);
      
      const threatTypes = Array.from(
        new Set(pagedThreats.items.map(t => t.threat_type).filter(Boolean))
      ).sort();
      setAvailableThreatTypes(threatTypes);
    } catch (err) {
      console.error('[Threats] Error fetching available threat types:', err);
    }
  }, []);

  // Fetch threat logs for Threat Logs tab
  const fetchThreatLogs = useCallback(async (cursor: string | null = null, isInitial: boolean = false) => {
    try {
      if (isInitial) setLogLoading(true);
      else setLogLoadingMore(true);
      setError(null);

      const params = new URLSearchParams();
      
      // Build repeated query params for multi-select
      filterSensorTypes.forEach(t => params.append("sensor_type", t.toLowerCase()));
      filterSensorIds.forEach(id => params.append("sensor_id", id));
      filterSeverities.forEach(s => params.append("severity", s));
      filterThreatTypes.forEach(t => params.append("threat_type", t));
      
      const { from_dt, to_dt } = calculateDateRange();
      if (from_dt) params.append("from_dt", from_dt);
      if (to_dt) params.append("to_dt", to_dt);
      
      if (cursor) params.append("cursor", cursor);
      params.append("page_size", "20");

      const url = `/api/v1/threats?${params.toString()}`;
      const pagedThreats = await apiGet<PagedThreats>(url);
      
      if (isInitial) {
        setLogThreats(pagedThreats.items);
      } else {
        setLogThreats(prev => [...prev, ...pagedThreats.items]);
      }
      
      // Extract summary stats from backend response
      setThreatLogSummary({
        total_threats: pagedThreats.total,
        high_severity_count: pagedThreats.high_severity_count,
        active_sensor_count: pagedThreats.active_sensor_count,
      });
      
      setNextCursor(pagedThreats.next_cursor);
      setHasMore(pagedThreats.has_more);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to fetch threats';
      setError(message);
      console.error('[Threats] Error fetching:', err);
    } finally {
      if (isInitial) setLogLoading(false);
      else setLogLoadingMore(false);
    }
  }, [filterSensorTypes, filterSensorIds, filterSeverities, filterThreatTypes, filterTime, fromDateTime, toDateTime]);

  // Clear initial loading state on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Fetch all available threat types on mount
  useEffect(() => {
    fetchAvailableThreatTypes();
  }, [fetchAvailableThreatTypes]);

  // When sensor types change, reset sensor IDs and threat types, then fetch filtered threat types
  useEffect(() => {
    setFilterSensorIds([]);
    setFilterThreatTypes([]);
    fetchAvailableThreatTypes(filterSensorTypes);
  }, [filterSensorTypes, fetchAvailableThreatTypes]);

  // Initial load for Threat Logs
  useEffect(() => {
    fetchThreatLogs(null, true);
  }, []);

  // Refetch logs when filters change - reset cursor to load from beginning
  useEffect(() => {
    setNextCursor(null);
    fetchThreatLogs(null, true);
  }, [filterTime, filterSensorTypes, filterSensorIds, filterThreatTypes, filterSeverities, fromDateTime, toDateTime]);

  // Handle Live Stream data - only show threats received after tab was opened
  useEffect(() => {
    if (isStreamPaused) return;

    if (liveThreats.length === 0) return;

    setLiveStreamThreats((prevThreats) => {
      // Filter for only threats that arrived AFTER this tab was opened (or after pause was resumed)
      const referenceTime = streamPauseTimestamp ? new Date(streamPauseTimestamp).getTime() : lastThreatTimestamp;
      
      const newThreats = liveThreats.filter((liveThreat) => {
        // Don't display duplicates
        if (prevThreats.some((t) => t.alert_id === liveThreat.alert_id)) {
          return false;
        }
        // Only show threats created after tab was opened or after pause was resumed
        const threatTime = new Date(liveThreat.timestamp).getTime();
        return threatTime >= referenceTime;
      });

      if (newThreats.length > 0) {
        console.log(`[Threats] Adding ${newThreats.length} new WebSocket threat(s)`);
        
        // Update local stats
        setLiveStreamStats(prev => ({
          total: prev.total + newThreats.length,
          high: prev.high + newThreats.filter(t => t.severity === 'high').length,
          active: prev.active,
        }));

        // Combine threats and sort by timestamp (most recent first)
        const combined = [...newThreats, ...prevThreats];
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      return prevThreats;
    });
  }, [liveThreats, isStreamPaused, lastThreatTimestamp, streamPauseTimestamp]);

  // Handle tab change
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    updateGlobalActiveTab(tab);
    
    // When switching TO live tab, auto-start streaming (not paused)
    if (tab === 'live') {
      setLastThreatTimestamp(Date.now());
      setLiveStreamThreats([]);
      setLiveStreamStats({ total: 0, high: 0, active: 0 });
      setIsStreamPaused(false);
      setStreamPauseTimestamp(null);
    }

    // Always refresh threat logs when the logs tab is clicked.
    if (tab === 'logs') {
      fetchThreatLogs(null, true);
    }
  };

  // Handle PAUSE button - pause incoming threats
  const handlePauseStream = () => {
    setIsStreamPaused(true);
    setStreamPauseTimestamp(Date.now());
  };

  // Handle RESUME button - resume with missed threats and new ones
  const handleResumeStream = () => {
    setIsStreamPaused(false);
    setStreamPauseTimestamp(null);
    // The effect will automatically add any new threats that arrived during pause
  };

  // Handle CLEAR button - clear the live stream table
  const handleClearStream = () => {
    setLiveStreamThreats([]);
    setLiveStreamStats({ total: 0, high: 0, active: 0 });
    // Reset the timestamp so only threats from this point onward are shown
    setLastThreatTimestamp(Date.now());
  };

  // Initialize prevThreatCountRef when initial data loads
  useEffect(() => {
    if (logThreats.length > 0 && prevThreatCountRef.current === 0) {
      prevThreatCountRef.current = logThreats.length;
    }
  }, [logThreats.length]);

  // Restore scroll position after new data is loaded during pagination
  useEffect(() => {
    const container = logTableContainerRef.current;
    if (!container || activeTab !== 'logs' || !shouldRestoreScrollRef.current) return;

    // Restore scroll position after new rows are added
    if (!logLoadingMore && logThreats.length > prevThreatCountRef.current) {
      container.scrollTop = scrollPositionRef.current;
      shouldRestoreScrollRef.current = false;
      prevThreatCountRef.current = logThreats.length;
    }
  }, [logThreats.length, logLoadingMore, activeTab]);

  // Update pagination state ref whenever pagination values change
  useEffect(() => {
    paginationStateRef.current = {
      nextCursor,
      hasMore,
      logLoadingMore,
      fetchThreatLogs,
    };
  }, [nextCursor, hasMore, logLoadingMore, fetchThreatLogs]);

  // Infinite scroll for logs tab
  useEffect(() => {
    const container = logTableContainerRef.current;
    if (!container || activeTab !== 'logs') return;

    const listener = () => {
      const scrollDiff = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isAtBottom = scrollDiff < 100;

      if (isAtBottom && nextCursor && !logLoadingMore && hasMore) {
        // CRITICAL: Save scroll position RIGHT NOW before pagination starts
        scrollPositionRef.current = container.scrollTop;
        shouldRestoreScrollRef.current = true;
        fetchThreatLogs(nextCursor, false);
      }
    };

    container.addEventListener('scroll', listener);
    return () => container.removeEventListener('scroll', listener);
  }, [nextCursor, hasMore, logLoadingMore, fetchThreatLogs, activeTab]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#DC2626";
      case "med":
        return "#D97706";
      case "low":
        return "#16A34A";
      default:
        return "#6B7280";
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#FEE2E2";
      case "med":
        return "#FEF3C7";
      case "low":
        return "#DCFCE7";
      default:
        return "#F3F4F6";
    }
  };

  const resetFilters = () => {
    setFilterTime("All");
    setFilterSensorTypes([]);
    setFilterSensorIds([]);
    setFilterThreatTypes([]);
    setFilterSeverities([]);
    setFromDateTime(null)
    setToDateTime(null)
  };

  // Compute available sensor IDs based on selected sensor types
  const filteredSensorIds = filterSensorTypes.length === 0
    ? sensorList.map(s => s.sensor_id)
    : sensorList.filter(s => filterSensorTypes.includes(s.sensor_type.toLowerCase())).map(s => s.sensor_id);

  // Compute available sensors based on selected sensor types
  const filteredSensors = filterSensorTypes.length === 0
    ? sensorList
    : sensorList.filter(s => filterSensorTypes.includes(s.sensor_type.toLowerCase()));

  // Calculate active sensor count from sensor list
  const activeSensorCount = sensorList.filter(s => s.status === 'active').length;

  // Determine which stats to show based on active tab
  const displayStats = activeTab === 'live' ? {
    total: liveStreamStats.total,
    high: liveStreamStats.high,
    active: activeSensorCount,
  } : {
    total: threatLogSummary?.total_threats ?? 0,
    high: threatLogSummary?.high_severity_count ?? 0,
    active: threatLogSummary?.active_sensor_count ?? 0,
  };

  const ThreatTable = ({ 
    threats, 
    loading, 
    isLiveTab,
    onScroll 
  }: { 
    threats: ThreatLog[], 
    loading: boolean,
    isLiveTab: boolean,
    onScroll?: React.Ref<HTMLDivElement>,
  }) => (
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(226,232,240,0.9)',
        }}
    >
      <div 
        ref={onScroll}
        className="threat-table-container overflow-auto"
        style={{
          maxHeight: "calc(100vh - 340px)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 #F1F5F9",
        }}
      >
        <style>
          {`
            .threat-table-container::-webkit-scrollbar {
              width: 8px;
            }
            .threat-table-container::-webkit-scrollbar-track {
              background: #F1F5F9;
            }
            .threat-table-container::-webkit-scrollbar-thumb {
              background: #CBD5E1;
              border-radius: 4px;
            }
            .threat-table-container::-webkit-scrollbar-thumb:hover {
              background: #94A3B8;
            }
          `}
        </style>
        <table className="w-full">
          <thead>
            <tr
              style={{
                    background: 'rgba(248,250,252,0.95)',
                    borderBottom: '1px solid rgba(226,232,240,0.9)',
              }}
            >
              {[
                isLiveTab ? "Time (UTC)" : `Time (${timezone})`,
                "Threat",
                "Sensor ID",
                "Sensor Type",
                "Location",
                "Severity",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left uppercase tracking-wider"
                  style={{
                    fontSize: "0.865rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threats.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                  }}>
                    {isLiveTab ? "No live threats received yet. Waiting for data..." : "No threats found matching the current filters."}
                  </div>
                </td>
              </tr>
            ) : (
              threats.map((threat, index) => (
                <tr
                  key={threat.alert_id}
                  className="border-b transition-all duration-200"
                  style={{
                    background:
                      index % 2 === 0
                        ? "var(--bg-card)"
                        : "var(--bg-table-alt)",
                    borderColor: "var(--border-color)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      index % 2 === 0
                        ? "var(--bg-card)"
                        : "var(--bg-table-alt)";
                  }}
                >
                  <td
                    className="px-4 py-3"
                    style={{
                      fontSize: "0.865rem",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {formatTimestampInTimezone(threat.timestamp, isLiveTab ? 'UTC' : timezone)}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      fontSize: "1.00625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {threat.threat_type}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      fontSize: "1.00625rem",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {threat.sensor_id}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      fontSize: "1.00625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {threat.sensor_type}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      fontSize: "1.00625rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {sensorList.find(s => s.sensor_id === threat.sensor_id)?.location || "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                      style={{
                        background: getSeverityBgColor(threat.severity),
                        color: getSeverityColor(threat.severity),
                        fontSize: "0.865rem",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: getSeverityColor(threat.severity),
                        }}
                      />
                      {threat.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Loading More Indicator - Logs tab only */}
        {!activeTab && logLoadingMore && (
          <div className="px-4 py-6 text-center border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-center gap-2">
              <div
                className="inline-block animate-spin rounded-full h-5 w-5 border-b-2"
                style={{ borderColor: '#0284C7' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Loading more threats...
              </span>
            </div>
          </div>
        )}
        
        {/* End of List Indicator */}
        {!hasMore && logThreats.length > 0 && !activeTab && (
          <div className="px-4 py-6 text-center border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              End of threat log
            </span>
          </div>
        )}
      </div>
    </div>
  );

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

      <div className="p-4 space-y-4 xl:p-5">
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
                Loading threats...
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'logs' && (
              <NotificationBell
                liveThreats={liveThreats}
                enableToasts={false}
                clearOnMarkAllRead
              />
            )}

            {/* Page Header with Tabs */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1
                  className="font-heading"
                  style={{
                    fontSize: "var(--fs-5)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  THREATS
                </h1>

                {/* Tabs */}
                <div className="flex items-center gap-4" style={{ borderBottom: '1px solid rgba(226,232,240,0.9)', paddingBottom: '8px' }}>
                  <button
                    onClick={() => handleTabChange('live')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'var(--fs-2)',
                      fontWeight: activeTab === 'live' ? 600 : 400,
                      color: activeTab === 'live' ? '#0284C7' : '#64748B',
                      paddingBottom: '8px',
                      borderBottom: activeTab === 'live' ? '3px solid #0284C7' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'live') {
                        e.currentTarget.style.color = '#0284C7';
                        e.currentTarget.style.background = '#F0F9FF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'live') {
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.background = 'none';
                      }
                    }}
                  >
                    LIVE THREAT STREAM
                  </button>

                  <button
                    onClick={() => handleTabChange('logs')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 'var(--fs-2)',
                      fontWeight: activeTab === 'logs' ? 600 : 400,
                      color: activeTab === 'logs' ? '#0284C7' : '#64748B',
                      paddingBottom: '8px',
                      borderBottom: activeTab === 'logs' ? '3px solid #0284C7' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'logs') {
                        e.currentTarget.style.color = '#0284C7';
                        e.currentTarget.style.background = '#F0F9FF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'logs') {
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.background = 'none';
                      }
                    }}
                  >
                    THREAT LOGS
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Total Threats",
                  value: displayStats.total,
                  color: "#0284C7",
                },
                {
                  label: "High Priority",
                  value: displayStats.high,
                  color: "#DC2626",
                },
                {
                  label: "Active",
                  value: displayStats.active,
                  color: "#D97706",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-3.5 border-t-2 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.94)',
                    border: '1px solid rgba(226,232,240,0.9)',
                    borderTopColor: stat.color,
                    borderTopWidth: '3px',
                    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 20px ${stat.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                  }}
                >
                  <div
                    className="font-heading mb-1"
                    style={{
                      fontSize: "var(--fs-4)",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fs-1)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* LIVE THREAT STREAM TAB */}
            {activeTab === 'live' && (
              <>
                {/* Connection Status Bar */}
                <div
                  className="rounded-2xl p-2.5 flex items-center justify-between shadow-sm"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(226,232,240,0.9)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {!isStreamPaused && connectionStatus === 'connecting' && (
                      <>
                        <div
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ background: '#94A3B8' }}
                        />
                        <span style={{ color: 'var(--text-primary)', fontSize: 'var(--fs-2)', fontWeight: 600 }}>
                          CONNECTING...
                        </span>
                      </>
                    )}

                    {!isStreamPaused && connectionStatus === 'connected' && (
                      <>
                        <div
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ background: '#16A34A' }}
                        />
                        <span style={{ color: '#16A34A', fontSize: 'var(--fs-2)', fontWeight: 600 }}>
                          CONNECTED — Live data streaming
                        </span>
                      </>
                    )}

                    {isStreamPaused && (
                      <>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: '#F59E0B' }}
                        />
                        <span style={{ color: '#F59E0B', fontSize: 'var(--fs-2)', fontWeight: 600 }}>
                          PAUSED
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* CLEAR Button */}
                    <button
                      onClick={handleClearStream}
                      style={{
                        background: 'transparent',
                        border: '1px solid #6B7280',
                        color: '#6B7280',
                        padding: '6px 10px',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        fontSize: 'var(--fs-1)',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#6B728020';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Clear all threats from the table"
                    >
                      🗑 CLEAR
                    </button>

                    {/* PAUSE/RESUME Buttons */}
                    {!isStreamPaused ? (
                      <button
                        onClick={handlePauseStream}
                        style={{
                          background: 'transparent',
                          border: '1px solid #F59E0B',
                          color: '#F59E0B',
                          padding: '6px 10px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: 'var(--fs-1)',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F59E0B20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Pause live stream"
                      >
                        ⏸ PAUSE
                      </button>
                    ) : (
                      <button
                        onClick={handleResumeStream}
                        style={{
                          background: 'transparent',
                          border: '1px solid #16A34A',
                          color: '#16A34A',
                          padding: '6px 10px',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          fontSize: 'var(--fs-1)',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#16A34A20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Resume live stream with missed threats"
                      >
                        ▶ RESUME
                      </button>
                    )}
                  </div>
                </div>

                {/* Stream Paused Banner */}
                {isStreamPaused && (
                  <div
                    className="rounded-2xl p-2.5"
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#F59E0B',
                      fontSize: 'var(--fs-2)',
                      fontWeight: 500,
                      marginTop: '4px',
                    }}
                  >
                    ⏸ Stream paused — threats received during pause will load on resume
                  </div>
                )}

                {/* Live Threat Table */}
                <ThreatTable
                  threats={liveStreamThreats}
                  loading={false}
                  isLiveTab={true}
                  onScroll={liveTableContainerRef}
                />
              </>
            )}

            {/* THREAT LOGS TAB */}
            {activeTab === 'logs' && (
              <>
                {/* Filter Bar */}
                <div>
                  <div
                    className="rounded-2xl p-4 shadow-sm"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(226,232,240,0.9)',
                    }}
                  >
                    <div className="flex flex-wrap items-end gap-4">
                      {/* Time Range */}
                      <div className="flex-1 min-w-[150px]">
                        <HeadlessUIDropdown
                          value={filterTime}
                          onChange={setFilterTime}
                          options={[
                            { value: "All", label: "All" },
                            { value: "Last 30 min", label: "Last 30 min" },
                            { value: "Last 1 Hour", label: "Last 1 Hour" },
                            { value: "Last 2 Hours", label: "Last 2 Hours" },
                            { value: "Custom", label: "Custom" },
                          ]}
                          label="Time Range"
                        />
                      </div>

                      {/* Sensor Type */}
                      <div className="flex-1 min-w-[150px]">
                        <CheckboxGroup
                          label="Sensor Type"
                          options={[
                            { value: "radar", label: "Radar" },
                            { value: "lidar", label: "Lidar" },
                          ]}
                          selected={filterSensorTypes}
                          onChange={setFilterSensorTypes}
                        />
                      </div>

                      {/* Sensor ID */}
                      <div className="flex-1 min-w-[150px]">
                        <CheckboxGroup
                          label="Sensor ID"
                          options={filteredSensors.map((sensor) => ({
                            value: sensor.sensor_id,
                            label: sensor.sensor_id,
                          }))}
                          selected={filterSensorIds}
                          onChange={setFilterSensorIds}
                        />
                      </div>

                      {/* Threat Type */}
                      <div className="flex-1 min-w-[150px]">
                        <CheckboxGroup
                          label="Threat Type"
                          options={availableThreatTypes.map((threatType) => ({
                            value: threatType,
                            label: threatType,
                          }))}
                          selected={filterThreatTypes}
                          onChange={setFilterThreatTypes}
                        />
                      </div>

                      {/* Severity */}
                      <div className="flex-1 min-w-[150px]">
                        <CheckboxGroup
                          label="Severity"
                          options={[
                            { value: "high", label: "High" },
                            { value: "med", label: "Medium" },
                            { value: "low", label: "Low" },
                          ]}
                          selected={filterSeverities}
                          onChange={setFilterSeverities}
                        />
                      </div>

                      {/* Timezone */}
                      <div className="flex-1 min-w-[150px]">
                        <HeadlessUIDropdown
                          value={timezone}
                          onChange={setTimezone}
                          options={COMMON_TIMEZONES.map((tz) => ({
                            value: tz,
                            label: tz,
                          }))}
                          label="Timezone"
                        />
                      </div>

                      {/* Reset Button */}
                      <div>
                        <button
                          onClick={resetFilters}
                          className="flex items-center gap-2 px-4 py-2 rounded transition-all duration-200"
                          style={{
                            background: "transparent",
                            border: "1px solid #E2E8F0",
                            borderRadius: "8px",
                            color: "#64748B",
                            fontSize: "1.00625rem",
                            fontWeight: 600,
                            height: "42px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#0284C7";
                            e.currentTarget.style.color = "#0284C7";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#E2E8F0";
                            e.currentTarget.style.color = "#64748B";
                          }}
                        >
                          <RotateCcw size={16} />
                          RESET
                        </button>
                      </div>
                    </div>

                    {/* Custom Date Picker */}
                    {filterTime === "Custom" && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex flex-wrap items-end gap-4">
                          {/* FROM Date/Time */}
                          <div className="flex-1 min-w-[200px]">
                            <label
                              className="block mb-2"
                              style={{
                                fontSize: "0.71875rem",
                                color: "var(--text-secondary)",
                                fontFamily: "var(--font-mono)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                fontWeight: 600,
                              }}
                            >
                              FROM
                            </label>
                            <DatePicker
                              selected={fromDateTime}
                              onChange={(date: Date | null) => {
                                setFromDateTime(date);
                                if (toDateTime && date && toDateTime < date) setToDateTime(null);
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
                                fontSize: "0.71875rem",
                                color: "var(--text-secondary)",
                                fontFamily: "var(--font-mono)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
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

                          {/* Apply Button */}
                          <button
                            onClick={() => {}}
                            disabled={!fromDateTime || !toDateTime}
                            className="px-6 py-2.5 rounded transition-all duration-200"
                            style={{
                              background: !fromDateTime || !toDateTime ? "#CBD5E1" : "#0284C7",
                              color: "#FFFFFF",
                              fontSize: "1.00625rem",
                              fontWeight: 600,
                              border: "none",
                              cursor: !fromDateTime || !toDateTime ? "not-allowed" : "pointer",
                              opacity: !fromDateTime || !toDateTime ? 0.6 : 1,
                              padding: "10px 24px",
                            }}
                            onMouseEnter={(e) => {
                              if (!(!fromDateTime || !toDateTime)) {
                                e.currentTarget.style.background = "#0369A1";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = !fromDateTime || !toDateTime ? "#CBD5E1" : "#0284C7";
                            }}
                          >
                            APPLY
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Threat Log Table */}
                <ThreatTable
                  threats={logThreats}
                  loading={logLoading}
                  isLiveTab={false}
                  onScroll={logTableContainerRef}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
