import { useState, useEffect, useRef, useCallback } from "react";
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Calendar, Clock } from "lucide-react";
import { useWebSocket } from '../context/WebSocketContext'
import { useSensors } from "../context/SensorContext";
import { apiGet, APIError } from '../services/apiClient';
import { ThreatLog, ThreatSummaryOut, PagedThreats } from '../types/api';
import { parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Common IANA timezones for date-fns-tz support
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

export function Threats() {
  const { sensorList, loading: sensorsLoading } = useSensors();
  const { liveThreats } = useWebSocket()
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatSummaryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterTime, setFilterTime] = useState("All");
  const [filterSensorType, setFilterSensorType] = useState("All");
  const [filterSensorId, setFilterSensorId] = useState("All");
  const [filterThreatType, setFilterThreatType] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  
  // Custom date range state
  const [fromDateTime, setFromDateTime] = useState<Date | null>(null)
  const [toDateTime, setToDateTime] = useState<Date | null>(null)
  const [timezone, setTimezone] = useState<string>('UTC');
  const [availableThreatTypes, setAvailableThreatTypes] = useState<string[]>([]);
  
  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to format UTC timestamp in the selected timezone
  const formatTimestampInTimezone = (utcTimestamp: string): string => {
    try {
      return new Date(utcTimestamp).toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return utcTimestamp; // Fallback if timezone is invalid
    }
  };

  // Helper function to calculate from_dt and to_dt based on selected time range
  // Always returns UTC timestamps in ISO 8601 format (with Z suffix)
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
      case "Last 1 hour":
        from = new Date(now.getTime() - 60 * 60 * 1000);
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

  // Fetch threats with filters and pagination
  const fetchThreats = useCallback(async (cursor: string | null = null, isInitial: boolean = false) => {
    try {
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filterSensorType !== "All") params.append("sensor_type", filterSensorType.toLowerCase());
      if (filterSensorId !== "All") params.append("sensor_id", filterSensorId);
      if (filterSeverity !== "All") params.append("severity", filterSeverity);
      if (filterThreatType !== "All") params.append("threat_type", filterThreatType);
      
      // Add date range filters based on selected time range
      const { from_dt, to_dt } = calculateDateRange();
      if (from_dt) params.append("from_dt", from_dt);
      if (to_dt) params.append("to_dt", to_dt);
      
      if (cursor) params.append("cursor", cursor);
      params.append("page_size", "20");

      const url = `/api/v1/threats?${params.toString()}`;
      const [pagedThreats, summary] = await Promise.all([
        apiGet<PagedThreats>(url),
        isInitial ? apiGet<ThreatSummaryOut>('/api/v1/threats/summary') : Promise.resolve(null),
      ]);
      
      if (isInitial) {
        setThreats(pagedThreats.items);
        // Extract available threat types from the fetched data
        const threatTypes = Array.from(
          new Set(pagedThreats.items.map(t => t.threat_type).filter(Boolean))
        );
        setAvailableThreatTypes(threatTypes);
      } else {
        // For pagination, append new items
        setThreats(prev => [...prev, ...pagedThreats.items]);
      }
      
      setNextCursor(pagedThreats.next_cursor);
      setHasMore(pagedThreats.has_more);
      if (summary) {
        setThreatSummary(summary);
      }
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to fetch threats';
      setError(message);
      console.error('[Threats] Error fetching:', err);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [filterSensorType, filterSensorId, filterSeverity, filterThreatType, filterTime, fromDateTime, toDateTime]);

  // Initial fetch
  useEffect(() => {
    fetchThreats(null, true);
  }, []);

  // Refetch when filters change (reset to first page)
  useEffect(() => {
    fetchThreats(null, true);
  }, [filterTime, filterSensorType, filterSensorId, filterThreatType, filterSeverity, fromDateTime, toDateTime]);

  // Listen for new WebSocket threats and prepend to displayed list
  useEffect(() => {
    if (liveThreats.length === 0) return;

    setThreats((prevThreats) => {
      // Find threats in liveThreats that aren't in prevThreats (new threats)
      const newThreats = liveThreats.filter(
        (liveThreat) => !prevThreats.some((t) => t.alert_id === liveThreat.alert_id)
      );

      // If there are new threats, prepend them
      if (newThreats.length > 0) {
        console.log(`[Threats] Adding ${newThreats.length} new WebSocket threat(s) to display`);
        return [...newThreats, ...prevThreats];
      }

      return prevThreats;
    });
  }, [liveThreats]);

  // Setup infinite scroll listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) {
      console.log('[Scroll] Container ref not found!');
      return;
    }

    console.log('[Scroll] Listener attached. Container scrollHeight:', container.scrollHeight);

    const listener = () => {
      const scrollDiff = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isAtBottom = scrollDiff < 100;

      if (scrollDiff < 200) { // Log when getting close to bottom
        console.log('[Scroll Event]', {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
          clientHeight: container.clientHeight,
          scrollDiff,
          isAtBottom,
          hasMore,
          loadingMore,
          nextCursor: nextCursor ? 'YES' : 'NO'
        });
      }

      if (isAtBottom && nextCursor && !loadingMore && hasMore) {
        console.log('[Scroll] FETCHING MORE');
        fetchThreats(nextCursor, false);
      }
    };

    container.addEventListener('scroll', listener);
    return () => container.removeEventListener('scroll', listener);
  }, [nextCursor, hasMore, loadingMore, fetchThreats]);

  const stats = {
    total: threatSummary?.total_threats ?? threats.length,
    high: threatSummary?.high_severity_count ?? threats.filter((t) => t.severity === "high").length,
    active: threatSummary?.active_sensor_count ?? 6,
  };

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
    setFilterSensorType("All");
    setFilterSensorId("All");
    setFilterThreatType("All");
    setFilterSeverity("All");
    setFromDateTime(null)
    setToDateTime(null)
  };

  const handleTimeRangeChange = (value: string) => {
    setFilterTime(value);
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

      {/* Page Header */}
      <div>
        <div
          className="mb-2"
          style={{
            fontSize: "0.865rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Dashboard / Threats
        </div>
        <h1
          className="font-heading"
          style={{
            fontSize: "2.3rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          THREATS
        </h1>
      </div>

      {!loading && !error && (
        <>
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Threats",
            value: stats.total,
            color: "#0284C7",
          },
          {
            label: "High Priority",
            value: stats.high,
            color: "#DC2626",
          },
          {
            label: "Active",
            value: stats.active,
            color: "#D97706",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-4 border-t-2 transition-all duration-200"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderTopColor: stat.color,
              borderTopWidth: "3px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
                fontSize: "2.59375rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "0.71875rem",
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

      {/* Filter Bar */}
      <div>
        <div
          className="rounded-lg p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex flex-wrap items-end gap-4">
            {/* Time Range */}
            <div className="flex-1 min-w-[150px]">
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
                Time Range
              </label>
              <div className="relative">
                <select
                  value={filterTime}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
                  }}
                >
                  <option value="All">All</option>
                  <option value="Last 30 min">Last 30 min</option>
                  <option value="Last 1 Hour">Last 1 Hour</option>
                  <option value="Last 2 Hours">Last 2 Hours</option>
                  <option value="Custom">Custom</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            {/* Sensor Type */}
            <div className="flex-1 min-w-[150px]">
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
                Sensor Type
              </label>
              <div className="relative">
                <select
                  value={filterSensorType}
                  onChange={(e) => setFilterSensorType(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
                  }}
                >
                  <option value="All">All</option>
                  <option value="radar">Radar</option>
                  <option value="lidar">Lidar</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            {/* Sensor ID */}
            <div className="flex-1 min-w-[150px]">
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
                Sensor ID
              </label>
              <div className="relative">
                <select
                  value={filterSensorId}
                  onChange={(e) => setFilterSensorId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
                  }}
                >
                  <option value="All">All</option>
                  {sensorList.map((sensor) => (
                    <option key={sensor.sensor_id} value={sensor.sensor_id}>
                      {sensor.sensor_id}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            {/* Threat Type */}
            <div className="flex-1 min-w-[150px]">
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
                Threat Type
              </label>
              <div className="relative">
                <select
                  value={filterThreatType}
                  onChange={(e) => setFilterThreatType(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
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
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            {/* Severity */}
            <div className="flex-1 min-w-[150px]">
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
                Severity
              </label>
              <div className="relative">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
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
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="flex-1 min-w-[150px]">
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
                Timezone
              </label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "1.00625rem",
                  }}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
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

      {/* Threat Log */}
      <div>
        <h2
          className="mb-4 font-heading"
          style={{
            fontSize: "1.44375rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          THREAT LOG
        </h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div 
            ref={tableContainerRef}
            className="threat-table-container overflow-auto"
            style={{
              maxHeight: "calc(100vh - 420px)",
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
            <div className="w-full">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-table-header)",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    {[
                      "Threat ID",
                      "Threat",
                      "Sensor ID",
                      "Sensor Type",
                      "Location",
                      "Severity",
                      "Time",
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
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div style={{
                          fontSize: "1rem",
                          color: "var(--text-secondary)",
                        }}>
                          No threats found matching the current filters.
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
                            fontSize: "1.00625rem",
                            color: "var(--accent-cyan)",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                          }}
                        >
                          {threat.alert_id}
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
                        <td
                          className="px-4 py-3"
                          style={{
                            fontSize: "0.865rem",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {formatTimestampInTimezone(threat.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Loading More Indicator */}
              {loadingMore && (
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
              {!hasMore && threats.length > 0 && (
                <div className="px-4 py-6 text-center border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    End of threat log
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
    </>
  );
}