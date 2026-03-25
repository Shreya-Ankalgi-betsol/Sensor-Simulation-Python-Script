import { useState } from "react";
import { sensors, Sensor } from "../data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ChevronDown, MoreVertical } from "lucide-react";
import { NotificationBell } from "../components/NotificationBell";

export function Sensors() {
  const [sensorList, setSensorList] = useState<Sensor[]>(sensors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSensor, setDeletingSensor] = useState<Sensor | null>(null);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    type: "Radar" as "Radar" | "Lidar",
    location: "",
    status: "Active" as "Active" | "Offline" | "Error",
  });
  const [selectedSensorId, setSelectedSensorId] = useState("");

  const stats = {
    total: sensorList.length,
    active: sensorList.filter((s) => s.status === "Active").length,
    offline: sensorList.filter((s) => s.status === "Offline").length,
    error: sensorList.filter((s) => s.status === "Error").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "#16A34A";
      case "Error":
        return "#DC2626";
      case "Offline":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const openAddModal = () => {
    setEditingSensor(null);
    setFormData({
      id: "",
      type: "Radar",
      location: "",
      status: "Active",
    });
    setIsModalOpen(true);
    setShowManageMenu(false);
  };

  const openEditModal = () => {
    setShowManageMenu(false);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = () => {
    setShowManageMenu(false);
    setIsDeleteModalOpen(true);
  };

  const handleEditSensorSelect = (id: string) => {
    setSelectedSensorId(id);
    const sensor = sensorList.find((s) => s.id === id);
    if (sensor) {
      setEditingSensor(sensor);
      setFormData({
        id: sensor.id,
        type: sensor.type,
        location: sensor.location,
        status: sensor.status,
      });
    }
  };

  const handleDeleteSensorSelect = (id: string) => {
    setSelectedSensorId(id);
    const sensor = sensorList.find((s) => s.id === id);
    if (sensor) {
      setDeletingSensor(sensor);
    }
  };

  const handleSaveAdd = () => {
    const newSensor: Sensor = {
      id: formData.id,
      type: formData.type,
      status: formData.status,
      location: formData.location,
      lastUpdated: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      position: { x: 50, y: 50 },
      coverageRadius: formData.type === "Radar" ? 15 : 12,
    };
    setSensorList((prev) => [...prev, newSensor]);
    setIsModalOpen(false);
  };

  const handleSaveEdit = () => {
    if (editingSensor) {
      setSensorList((prev) =>
        prev.map((s) =>
          s.id === editingSensor.id
            ? {
                ...s,
                type: formData.type,
                location: formData.location,
                status: formData.status,
                lastUpdated: new Date().toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : s
        )
      );
    }
    setIsEditModalOpen(false);
    setEditingSensor(null);
    setSelectedSensorId("");
  };

  const handleDelete = () => {
    if (deletingSensor) {
      setSensorList((prev) =>
        prev.filter((s) => s.id !== deletingSensor.id)
      );
    }
    setIsDeleteModalOpen(false);
    setDeletingSensor(null);
    setSelectedSensorId("");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notification Bell */}
      <NotificationBell />

      {/* Page Header with Manage Button */}
      <div className="flex items-start justify-between">
        <div>
          <div
            className="mb-2"
            style={{
              fontSize: "0.865rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Dashboard / Sensors
          </div>
          <h1
            className="font-heading"
            style={{
              fontSize: "2.3rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            SENSORS
          </h1>
        </div>

        {/* Common Manage Sensors Button */}
        <div className="relative" style={{ marginTop: '40px' }}>
          <button
            onClick={() => setShowManageMenu(!showManageMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid #E2E8F0',
              color: 'var(--text-primary)',
              fontSize: '0.865rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F9FF';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <MoreVertical size={16} />
            MANAGE SENSORS
          </button>

          {/* Dropdown Menu */}
          {showManageMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowManageMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 z-20 rounded-lg overflow-hidden"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  width: '200px',
                }}
              >
                <button
                  onClick={openAddModal}
                  className="w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-2"
                  style={{
                    fontSize: '1.00625rem',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F0F9FF';
                    e.currentTarget.style.color = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  ➕ Add Sensor
                </button>
                <button
                  onClick={openEditModal}
                  className="w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-2"
                  style={{
                    fontSize: '1.00625rem',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F0F9FF';
                    e.currentTarget.style.color = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  ✏️ Edit Sensor
                </button>
                <button
                  onClick={openDeleteModal}
                  className="w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-2"
                  style={{
                    fontSize: '1.00625rem',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F0F9FF';
                    e.currentTarget.style.color = 'var(--accent-cyan)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  🗑️ Delete Sensor
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
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
            label: "Offline",
            value: stats.offline,
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

      {/* Sensor Table */}
      <div>
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
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  {[
                    "Sensor ID",
                    "Type",
                    "Status",
                    "Location",
                    "Last Updated",
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
                {sensorList.map((sensor, index) => (
                  <tr
                    key={sensor.id}
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
                        fontSize: "1.00625rem",
                        color: "var(--accent-cyan)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {sensor.id}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "1.00625rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {sensor.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                        style={{
                          background: `${getStatusColor(sensor.status)}20`,
                          color: getStatusColor(sensor.status),
                          fontSize: "0.865rem",
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
                        fontSize: "1.00625rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {sensor.location}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontSize: "0.865rem",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {sensor.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
          </DialogHeader>
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
                value={formData.id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    id: e.target.value,
                  })
                }
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
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "Radar" | "Lidar",
                    })
                  }
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="Radar">Radar</option>
                  <option value="Lidar">Lidar</option>
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
                htmlFor="status"
                style={{ color: "var(--text-secondary)" }}
              >
                Status
              </Label>
              <div className="relative mt-1">
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as
                        | "Active"
                        | "Offline"
                        | "Error",
                    })
                  }
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Offline">Offline</option>
                  <option value="Error">Error</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--accent-cyan)" }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                  e.currentTarget.style.color = "var(--accent-cyan)";
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
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  background: "var(--accent-cyan)",
                  color: "#FFFFFF",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#0369A1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent-cyan)";
                }}
              >
                SAVE
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
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label style={{ color: "var(--text-secondary)" }}>
                Sensor ID
              </Label>
              <div className="relative mt-1">
                <select
                  value={selectedSensorId}
                  onChange={(e) => handleEditSensorSelect(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Select Sensor</option>
                  {sensorList.map((sensor) => (
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.id}
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

            {editingSensor && (
              <>
                <div>
                  <Label htmlFor="edit-type" style={{ color: "var(--text-secondary)" }}>
                    Type
                  </Label>
                  <div className="relative mt-1">
                    <select
                      id="edit-type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as "Radar" | "Lidar",
                        })
                      }
                      className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="Radar">Radar</option>
                      <option value="Lidar">Lidar</option>
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
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-status"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Status
                  </Label>
                  <div className="relative mt-1">
                    <select
                      id="edit-status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as
                            | "Active"
                            | "Offline"
                            | "Error",
                        })
                      }
                      className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Offline">Offline</option>
                      <option value="Error">Error</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--accent-cyan)" }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedSensorId("");
                  setEditingSensor(null);
                }}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                  e.currentTarget.style.color = "var(--accent-cyan)";
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
                disabled={!editingSensor}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  background: editingSensor ? "var(--accent-cyan)" : "#9CA3AF",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: editingSensor ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => {
                  if (editingSensor) {
                    e.currentTarget.style.background = "#0369A1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (editingSensor) {
                    e.currentTarget.style.background = "var(--accent-cyan)";
                  }
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--danger-red)",
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
              DELETE SENSOR
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label style={{ color: "var(--text-secondary)" }}>
                Sensor ID
              </Label>
              <div className="relative mt-1">
                <select
                  value={selectedSensorId}
                  onChange={(e) => handleDeleteSensorSelect(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">Select Sensor</option>
                  {sensorList.map((sensor) => (
                    <option key={sensor.id} value={sensor.id}>
                      {sensor.id}
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

            {deletingSensor && (
              <div
                className="p-3 rounded"
                style={{ background: '#F3F4F6' }}
              >
                <div className="space-y-1" style={{ fontSize: '0.865rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Type:</strong> {deletingSensor.type}</div>
                  <div><strong>Location:</strong> {deletingSensor.location}</div>
                  <div><strong>Status:</strong> {deletingSensor.status}</div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedSensorId("");
                  setDeletingSensor(null);
                }}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                  e.currentTarget.style.color = "var(--accent-cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                disabled={!deletingSensor}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: "1.00625rem",
                  fontWeight: 600,
                  background: deletingSensor ? "var(--danger-red)" : "#9CA3AF",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: deletingSensor ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => {
                  if (deletingSensor) {
                    e.currentTarget.style.background = "#B91C1C";
                  }
                }}
                onMouseLeave={(e) => {
                  if (deletingSensor) {
                    e.currentTarget.style.background = "var(--danger-red)";
                  }
                }}
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}