import { useState } from "react";
import { useNavigate } from "react-router";
import { SensorOut } from "../types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ChevronDown, MoreVertical, Plus, RotateCcw } from "lucide-react";
import { PencilIcon, MapPinIcon } from "@heroicons/react/16/solid";
import { NotificationBell } from "../components/NotificationBell";
import { useSensors } from "../context/SensorContext";
import { useWebSocket } from "../context/WebSocketContext";
import { useMapNavigation } from "../context/MapNavigationContext";

export function Sensors() {
  const navigate = useNavigate();
  const { sensorList, updateSensor, addSensor, fetchSensors, loading, error } = useSensors();
  const { liveThreats: threats } = useWebSocket();
  const { setZoomTarget } = useMapNavigation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorOut | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [formData, setFormData] = useState({
    sensor_id: "",
    sensor_type: "radar" as "radar" | "lidar",
    location: "",
    lat: 0 as number,
    lng: 0 as number,
    coverage_radius_m: 50.0 as number,
  });

  const stats = {
    total: sensorList.length,
    active: sensorList.filter((s) => s.status === "active").length,
    inactive: sensorList.filter((s) => s.status === "inactive").length,
    error: sensorList.filter((s) => s.status === "error").length,
  }; // Force recompile

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#16A34A";
      case "error":
        return "#DC2626";
      case "inactive":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const openAddModal = () => {
    setFormData({
      sensor_id: "",
      sensor_type: "radar",
      location: "",
      lat: 0,
      lng: 0,
      coverage_radius_m: 50.0,
    });
    setEditError(null);
    setEditSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (sensor: SensorOut) => {
    setEditingSensor(sensor);
    setFormData({
      sensor_id: sensor.sensor_id,
      sensor_type: sensor.sensor_type as "radar" | "lidar",
      location: sensor.location,
      lat: sensor.lat,
      lng: sensor.lng,
      coverage_radius_m: sensor.coverage_radius_m,
    });
    setEditError(null);
    setEditSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    try {
      // Validate required fields
      if (!formData.sensor_id.trim()) {
        setEditError("Sensor ID is required");
        return;
      }
      if (!formData.location.trim()) {
        setEditError("Location is required");
        return;
      }

      setIsSubmitting(true);
      setEditError(null);
      setEditSuccess(false);

      // SensorCreate schema requires: sensor_id, sensor_type, lat, lng, location, coverage_radius_m
      const newSensor = {
        sensor_id: formData.sensor_id,
        sensor_type: formData.sensor_type,
        lat: formData.lat,
        lng: formData.lng,
        location: formData.location,
        coverage_radius_m: formData.coverage_radius_m,
      };
      await addSensor(newSensor);
      
      setEditSuccess(true);
      
      // Close modal after 1 second to show success feedback
      setTimeout(() => {
        setIsModalOpen(false);
        setEditSuccess(false);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add sensor';
      setEditError(errorMessage);
      console.error('Failed to add sensor:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingSensor) {
      // Validate required fields
      if (!formData.location.trim()) {
        setEditError("Location is required");
        return;
      }

      try {
        setIsSubmitting(true);
        setEditError(null);
        setEditSuccess(false);

        // SensorUpdate schema requires: location (required), lat/lng/coverage_radius_m (optional)
        await updateSensor(editingSensor.sensor_id, {
          location: formData.location,
          lat: formData.lat,
          lng: formData.lng,
          coverage_radius_m: formData.coverage_radius_m,
        });

        setEditSuccess(true);
        
        // Close modal after 1 second to show success feedback
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditingSensor(null);
          setEditSuccess(false);
        }, 1000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update sensor';
        setEditError(errorMessage);
        console.error('Failed to update sensor:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notification Bell */}
      <NotificationBell liveThreats={threats} enableToasts={false} />

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
            onClick={() => fetchSensors()}
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
              Loading sensors...
            </p>
          </div>
        </div>
      )}

      {/* Compact Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-heading"
            style={{
              fontSize: "var(--fs-5)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            SENSORS
          </h1>
          <p className="mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-2)' }}>
            Manage sensor inventory, status, and coverage from one central place.
          </p>
        </div>

        {/* Add Sensor Button */}
        <div style={{ marginTop: '0px' }}>
          <button
            onClick={openAddModal}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 disabled:opacity-50 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
              color: '#FFFFFF',
              fontSize: 'var(--fs-2)',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: 'none',
              letterSpacing: '0.025em',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 14px 28px rgba(14, 165, 233, 0.24)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(14, 165, 233, 0.16)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} />
            Add Sensor
          </button>
        </div>
      </div>

      {!loading && !error && (
        <>
          <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total Sensors",
            value: stats.total,
            color: "#0284C7",
          },
          {
            label: "Active",
            value: stats.active,
            color: "#16A34A",
          },
          {
            label: "Inactive",
            value: stats.inactive,
            color: "#6B7280",
          },
          {
            label: "Error",
            value: stats.error,
            color: "#DC2626",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-3 border-t-2 transition-all duration-200"
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

      {/* Sensor Table */}
      <div>
        <div
          style={{
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(226,232,240,0.9)',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
            borderRadius: '24px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 290px)' }}>
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: 'rgba(248,250,252,0.95)',
                    borderBottom: '1px solid rgba(226,232,240,0.9)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  {[
                    "Sensor ID",
                    "Type",
                    "Status",
                    "Location",
                    "Last Updated",
                    "",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left uppercase tracking-wider"
                      style={{
                        fontSize: "var(--fs-2)",
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
                {sensorList.map((sensor, index) => (
                  <tr
                    key={sensor.sensor_id}
                    className="border-b transition-all duration-200 group relative"
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
                        fontSize: "var(--fs-3)",
                        color: "var(--accent-cyan)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {sensor.sensor_id}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "var(--fs-3)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {sensor.sensor_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                        style={{
                          background: `${getStatusColor(sensor.status)}20`,
                          color: getStatusColor(sensor.status),
                          fontSize: "var(--fs-2)",
                          fontWeight: 600,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: getStatusColor(sensor.status),
                          }}
                        />
                        {sensor.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "var(--fs-3)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {sensor.location}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "var(--fs-2)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {new Date(sensor.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 relative" style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setMenuPosition({
                            top: rect.bottom + 4,
                            left: rect.right - 140,
                          })
                          setOpenMenuId(openMenuId === sensor.sensor_id ? null : sensor.sensor_id)
                        }}
                        className="p-2 rounded-full transition-all duration-200"
                        style={{ color: '#94A3B8', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(2,132,199,0.1)'
                          e.currentTarget.style.color = '#0284C7'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#94A3B8'
                        }}
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dropdown Menu Portal - Renders outside table constraints */}
      {openMenuId && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setOpenMenuId(null)}
          />
          {/* Dropdown */}
          <div
            style={{
              position: 'fixed',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '140px',
              zIndex: 1000,
              borderRadius: '6px',
              overflow: 'hidden',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            <button
              onClick={() => {
                setOpenMenuId(null)
                const sensor = sensorList.find(s => s.sensor_id === openMenuId)
                if (sensor) {
                  openEditModal(sensor)
                }
              }}
              style={{
                fontSize: '0.875rem',
                color: '#1E293B',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0F9FF'
                e.currentTarget.style.color = '#0284C7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#1E293B'
              }}
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                setOpenMenuId(null)
                const sensor = sensorList.find(s => s.sensor_id === openMenuId)
                if (sensor) {
                  // Set zoom target and navigate to dashboard
                  setZoomTarget({
                    sensorId: sensor.sensor_id,
                    lat: sensor.lat,
                    lng: sensor.lng,
                    zoomLevel: 16,
                  });
                  navigate('/');
                }
              }}
              style={{
                fontSize: '0.875rem',
                color: '#1E293B',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                padding: '8px 16px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                borderTop: '1px solid #E2E8F0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0F9FF'
                e.currentTarget.style.color = '#0284C7'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#1E293B'
              }}
            >
              <MapPinIcon className="w-4 h-4" />
              View on Map
            </button>
          </div>
        </>
      )}

      {/* Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--accent-cyan)",
            borderRadius: "12px",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-heading"
              style={{
                fontSize: "1.725rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              ADD SENSOR
            </DialogTitle>
            <DialogDescription
              className="font-heading"
              style={{
                fontSize: "0.865rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Add a new sensor to the system.
            </DialogDescription>
          </DialogHeader>

          {/* Error Message */}
          {editError && (
            <div
              className="p-3 rounded-lg border text-sm"
              style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
              }}
            >
              ⚠️ {editError}
            </div>
          )}

          {/* Success Message */}
          {editSuccess && (
            <div
              className="p-3 rounded-lg border text-sm"
              style={{
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#166534',
              }}
            >
              ✓ Sensor added successfully!
            </div>
          )}

          <div className="space-y-4 mt-4">
            <div>
              <Label
                htmlFor="sensorId"
                style={{ color: "var(--text-secondary)" }}
              >
                Sensor ID
              </Label>
              <Input
                id="sensorId"
                value={formData.sensor_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sensor_id: e.target.value,
                  })
                }
                placeholder="e.g. RADAR-4"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <Label htmlFor="type" style={{ color: "var(--text-secondary)" }}>
                Type
              </Label>
              <div className="relative mt-1">
                <select
                  id="type"
                  value={formData.sensor_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sensor_type: e.target.value as "radar" | "lidar",
                    })
                  }
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
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

            <div>
              <Label
                htmlFor="location"
                style={{ color: "var(--text-secondary)" }}
              >
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                placeholder="e.g. East Gate"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <Label
                htmlFor="latitude"
                style={{ color: "var(--text-secondary)" }}
              >
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                value={formData.lat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lat: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="e.g. 40.7128"
                min="-90"
                max="90"
                step="0.0001"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <Label
                htmlFor="longitude"
                style={{ color: "var(--text-secondary)" }}
              >
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                value={formData.lng}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lng: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="e.g. -74.0060"
                min="-180"
                max="180"
                step="0.0001"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <Label
                htmlFor="coverageRadius"
                style={{ color: "var(--text-secondary)" }}
              >
                Coverage Radius (meters)
              </Label>
              <Input
                id="coverageRadius"
                type="number"
                value={formData.coverage_radius_m}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coverage_radius_m: parseFloat(e.target.value) || 50.0,
                  })
                }
                placeholder="e.g. 50"
                min="0.1"
                step="1"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.borderColor = "var(--accent-cyan)";
                    e.currentTarget.style.color = "var(--accent-cyan)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveAdd}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  background: "var(--accent-cyan)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "#0369A1";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-cyan)";
                }}
              >
                {isSubmitting ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--accent-cyan)",
            borderRadius: "12px",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-heading"
              style={{
                fontSize: "1.725rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              EDIT SENSOR
            </DialogTitle>
            <DialogDescription
              className="font-heading"
              style={{
                fontSize: "0.865rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Update the details of an existing sensor.
            </DialogDescription>
          </DialogHeader>

          {/* Error Message */}
          {editError && (
            <div
              className="p-3 rounded-lg border text-sm"
              style={{
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
              }}
            >
              ⚠️ {editError}
            </div>
          )}

          {/* Success Message */}
          {editSuccess && (
            <div
              className="p-3 rounded-lg border text-sm"
              style={{
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#166534',
              }}
            >
              ✓ Sensor updated successfully!
            </div>
          )}

          <div className="space-y-4 mt-4">
            {/* Sensor ID - Disabled */}
            <div>
              <Label style={{ color: "var(--text-secondary)" }}>
                Sensor ID
              </Label>
              <Input
                value={formData.sensor_id}
                disabled
                className="mt-1"
                style={{
                  background: "#F1F5F9",
                  border: "1px solid var(--border-color)",
                  color: "#94A3B8",
                  cursor: "not-allowed",
                }}
              />
            </div>

            {/* Type - Disabled */}
            <div>
              <Label style={{ color: "var(--text-secondary)" }}>
                Type
              </Label>
              <div className="relative mt-1">
                <select
                  value={formData.sensor_type}
                  disabled
                  className="w-full appearance-none px-3 py-2 pr-10 rounded"
                  style={{
                    background: "#F1F5F9",
                    border: "1px solid var(--border-color)",
                    color: "#94A3B8",
                    cursor: "not-allowed",
                  }}
                >
                  <option value="radar">Radar</option>
                  <option value="lidar">Lidar</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "#94A3B8" }}
                />
              </div>
            </div>

            {/* Location - Editable */}
            <div>
              <Label
                htmlFor="edit-location"
                style={{ color: "var(--text-secondary)" }}
              >
                Location
              </Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value,
                  })
                }
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              />
            </div>

            {/* Latitude - Editable */}
            <div>
              <Label
                htmlFor="edit-latitude"
                style={{ color: "var(--text-secondary)" }}
              >
                Latitude
              </Label>
              <Input
                id="edit-latitude"
                type="number"
                value={formData.lat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lat: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="e.g. 40.7128"
                min="-90"
                max="90"
                step="0.0001"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              />
            </div>

            {/* Longitude - Editable */}
            <div>
              <Label
                htmlFor="edit-longitude"
                style={{ color: "var(--text-secondary)" }}
              >
                Longitude
              </Label>
              <Input
                id="edit-longitude"
                type="number"
                value={formData.lng}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lng: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="e.g. -74.0060"
                min="-180"
                max="180"
                step="0.0001"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              />
            </div>

            {/* Coverage Radius - Editable */}
            <div>
              <Label
                htmlFor="edit-coverageRadius"
                style={{ color: "var(--text-secondary)" }}
              >
                Coverage Radius (meters)
              </Label>
              <Input
                id="edit-coverageRadius"
                type="number"
                value={formData.coverage_radius_m}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coverage_radius_m: parseFloat(e.target.value) || 50.0,
                  })
                }
                placeholder="e.g. 50"
                min="0.1"
                step="1"
                className="mt-1"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSensor(null);
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.borderColor = "var(--accent-cyan)";
                    e.currentTarget.style.color = "var(--accent-cyan)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded transition-all duration-200 disabled:opacity-50"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  background: "var(--accent-cyan)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "#0369A1";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-cyan)";
                }}
              >
                {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}