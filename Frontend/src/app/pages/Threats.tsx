import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { threats } from "../data/mockData";
import { NotificationBell } from "../components/NotificationBell";

export function Threats() {
  const [filterTime, setFilterTime] = useState("Last 1 Hour");
  const [filterSensorType, setFilterSensorType] = useState("All");
  const [filterThreatType, setFilterThreatType] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  
  // Custom date range state
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("23:59");
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const stats = {
    total: threats.length,
    high: threats.filter((t) => t.severity === "High").length,
    active: 6,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "#DC2626";
      case "Medium":
        return "#D97706";
      case "Low":
        return "#16A34A";
      default:
        return "#6B7280";
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "#FEE2E2";
      case "Medium":
        return "#FEF3C7";
      case "Low":
        return "#DCFCE7";
      default:
        return "#F3F4F6";
    }
  };

  const handleTimeRangeChange = (value: string) => {
    setFilterTime(value);
    setShowCustomDatePicker(value === "Custom");
  };

  // Calendar helpers
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const renderCalendar = (isFrom: boolean) => {
    const days = daysInMonth(currentMonth, currentYear);
    const firstDay = firstDayOfMonth(currentMonth, currentYear);
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div
        className="absolute top-full mt-2 z-50 rounded-lg shadow-lg p-4"
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          width: '320px',
        }}
      >
        {/* Month/Year header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ fontSize: '1.00625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {monthNames[currentMonth]} {currentYear}
          </div>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div
              key={day}
              className="text-center"
              style={{ fontSize: '0.8625rem', color: 'var(--text-secondary)', fontWeight: 600 }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((blank) => (
            <div key={`blank-${blank}`} />
          ))}
          {daysArray.map((day) => {
            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
            return (
              <button
                key={day}
                onClick={() => {
                  const dateStr = `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
                  if (isFrom) {
                    setFromDate(dateStr);
                    setShowFromCalendar(false);
                  } else {
                    setToDate(dateStr);
                    setShowToCalendar(false);
                  }
                }}
                className="p-2 rounded text-center transition-all duration-200"
                style={{
                  fontSize: '0.92188rem',
                  background: isToday ? '#DBEAFE' : 'transparent',
                  color: isToday ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  fontWeight: isToday ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#EFF6FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isToday ? '#DBEAFE' : 'transparent';
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notification Bell */}
      <NotificationBell />

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

      {/* Filter Bar */}
      <div>
        <div
          className="mb-3 uppercase tracking-wider"
          style={{
            fontSize: "0.865rem",
            fontWeight: 600,
            color: "var(--accent-cyan)",
            letterSpacing: "0.1em",
          }}
        >
          Filters
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            {
              label: "TIME RANGE",
              value: filterTime,
              options: [
                "Last 30 min",
                "Last 1 Hour",
                "Last 2 Hours",
                "Custom",
              ],
              setter: handleTimeRangeChange,
            },
            {
              label: "SENSOR TYPE",
              value: filterSensorType,
              options: ["All", "Lidar", "Radar"],
              setter: setFilterSensorType,
            },
            {
              label: "THREAT TYPE",
              value: filterThreatType,
              options: [
                "All",
                "Drone",
                "Trespassing",
                "Temperature",
                "Weapon",
              ],
              setter: setFilterThreatType,
            },
            {
              label: "SEVERITY",
              value: filterSeverity,
              options: ["All", "Low", "Medium", "High"],
              setter: setFilterSeverity,
            },
          ].map((filter) => (
            <div key={filter.label} className="relative">
              <div
                className="mb-1 uppercase"
                style={{
                  fontSize: "0.71875rem",
                  color: "#6B7280",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.05em",
                }}
              >
                {filter.label}
              </div>
              <select
                value={filter.value}
                onChange={(e) => filter.setter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded cursor-pointer transition-all duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "1.00625rem",
                  fontFamily: "var(--font-mono)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--accent-cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--border-color)";
                }}
              >
                {filter.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 bottom-3 pointer-events-none"
                style={{ color: "var(--accent-cyan)" }}
              />
            </div>
          ))}
        </div>

        {/* Custom Date/Time Range Picker */}
        {showCustomDatePicker && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="grid grid-cols-2 gap-6">
              {/* FROM */}
              <div>
                <div
                  className="mb-2 uppercase tracking-wider"
                  style={{
                    fontSize: "0.8625rem",
                    fontWeight: 600,
                    color: "var(--accent-cyan)",
                    letterSpacing: "0.1em",
                  }}
                >
                  From
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={fromDate}
                      onClick={() => {
                        setShowFromCalendar(!showFromCalendar);
                        setShowToCalendar(false);
                      }}
                      placeholder="DD/MM/YYYY"
                      readOnly
                      className="w-full px-3 py-2 rounded cursor-pointer"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "1.00625rem",
                      }}
                    />
                    {showFromCalendar && renderCalendar(true)}
                  </div>
                  <input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className="w-full px-3 py-2 rounded"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "1.00625rem",
                    }}
                  />
                </div>
              </div>

              {/* TO */}
              <div>
                <div
                  className="mb-2 uppercase tracking-wider"
                  style={{
                    fontSize: "0.8625rem",
                    fontWeight: 600,
                    color: "var(--accent-cyan)",
                    letterSpacing: "0.1em",
                  }}
                >
                  To
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={toDate}
                      onClick={() => {
                        setShowToCalendar(!showToCalendar);
                        setShowFromCalendar(false);
                      }}
                      placeholder="DD/MM/YYYY"
                      readOnly
                      className="w-full px-3 py-2 rounded cursor-pointer"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        fontSize: "1.00625rem",
                      }}
                    />
                    {showToCalendar && renderCalendar(false)}
                  </div>
                  <input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className="w-full px-3 py-2 rounded"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "1.00625rem",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  // Apply custom date range
                  console.log(`From: ${fromDate} ${fromTime} To: ${toDate} ${toTime}`);
                }}
                className="px-6 py-2 rounded transition-all duration-200"
                style={{
                  background: "var(--accent-cyan)",
                  color: "#FFFFFF",
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#0369A1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-cyan)";
                }}
              >
                APPLY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats - Only 3 cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Threats",
            value: stats.total,
            color: "#0284C7",
          },
          {
            label: "High Severity",
            value: stats.high,
            color: "#DC2626",
          },
          {
            label: "Active Sensors",
            value: stats.active,
            color: "#16A34A",
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

      {/* Threat Log Table */}
      <div>
        <div
          className="mb-4 uppercase tracking-wider"
          style={{
            fontSize: "0.865rem",
            fontWeight: 600,
            color: "var(--accent-cyan)",
            letterSpacing: "0.1em",
          }}
        >
          Threat Log
        </div>

        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: "var(--bg-table-header)",
                    borderBottom:
                      "1px solid var(--border-color)",
                  }}
                >
                  {[
                    "Threat ID",
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
                {threats.map((threat, index) => (
                  <tr
                    key={threat.id}
                    className="border-b transition-all duration-200 group relative"
                    style={{
                      background:
                        index % 2 === 0
                          ? "var(--bg-card)"
                          : "var(--bg-table-alt)",
                      borderColor: "var(--border-color)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--bg-hover)";
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
                        color: "#0284C7",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      TH-{String(index + 1).padStart(3, '0')}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "1.00625rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {threat.type}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "1.00625rem",
                        color: "var(--accent-cyan)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {threat.sensorId}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "1.00625rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {threat.sensorType}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "1.00625rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {threat.location}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full"
                        style={{
                          background: getSeverityBgColor(threat.severity),
                          color: getSeverityColor(threat.severity),
                          fontSize: "0.865rem",
                          fontWeight: 600,
                        }}
                      >
                        {threat.severity === "High" && "🔴"}
                        {threat.severity === "Medium" && "🟠"}
                        {threat.severity === "Low" && "🟡"}
                        {threat.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}