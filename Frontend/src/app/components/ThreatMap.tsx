import { useState, useEffect } from 'react';
import { Plus, Minus, Navigation } from 'lucide-react';
import { sensors } from '../data/mockData';

export function ThreatMap() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [dronePosition, setDronePosition] = useState(0);

  // Animate drone along path
  useEffect(() => {
    const interval = setInterval(() => {
      setDronePosition((prev) => (prev + 0.5) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getSensorColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#16A34A';
      case 'Error':
        return '#DC2626';
      case 'Offline':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const selectedSensorData = sensors.find((s) => s.id === selectedSensor);

  return (
    <div
      className="h-full rounded-lg relative"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        overflow: zoom > 1 ? 'auto' : 'hidden',
      }}
    >
      {/* Map Container */}
      <div
        className="w-full h-full relative"
        style={{
          background: 'var(--bg-map)',
          backgroundImage: `
            linear-gradient(rgba(226, 232, 240, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226, 232, 240, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        {/* Facility Boundary */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: `scale(${zoom})` }}
        >
          <rect
            x="10%"
            y="10%"
            width="80%"
            height="80%"
            fill="none"
            stroke="rgba(2, 132, 199, 0.25)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />
        </svg>

        {/* Drone Path */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d="M 20% 30% Q 50% 10%, 80% 40% T 70% 70%"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
          
          {/* Animated Drone */}
          <circle
            cx={`${20 + (dronePosition / 100) * 50}%`}
            cy={`${30 - Math.sin(dronePosition / 10) * 10}%`}
            r="6"
            fill="#DC2626"
            className="animate-pulse"
          />
        </svg>

        {/* Sensor Markers */}
        <div className="absolute inset-0" style={{ transform: `scale(${zoom})` }}>
          {sensors.map((sensor) => {
            const color = getSensorColor(sensor.status);
            
            return (
              <div
                key={sensor.id}
                className="absolute"
                style={{
                  left: `${sensor.position.x}%`,
                  top: `${sensor.position.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Coverage Area */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: `${sensor.coverageRadius * 2}vw`,
                    height: `${sensor.coverageRadius * 2}vw`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(2, 132, 199, 0.08)',
                    border: '2px dashed rgba(2, 132, 199, 0.25)',
                  }}
                />

                {/* Sensor Marker */}
                <button
                  onClick={() => setSelectedSensor(sensor.id === selectedSensor ? null : sensor.id)}
                  className="relative z-10 transition-all duration-200 cursor-pointer"
                  style={{
                    width: '48px',
                    height: '48px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center relative"
                    style={{
                      background: 'var(--bg-card)',
                      border: `3px solid ${color}`,
                      boxShadow: `0 0 20px ${color}40`,
                    }}
                  >
                    {/* Pulse ring for active sensors */}
                    {sensor.status === 'Active' && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                          background: color,
                          opacity: 0.2,
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div style={{ color }}>
                      {sensor.type === 'Radar' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 2C12 2 12 12 12 12M12 12C12 12 22 12 22 12M12 12C12 12 12 22 12 22M12 12C12 12 2 12 2 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <circle cx="12" cy="12" r="3" fill="currentColor" />
                          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" fill="none" />
                          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded"
                    style={{
                      background: 'var(--bg-card)',
                      color,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    {sensor.id}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Sensor Popup */}
        {selectedSensorData && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-200"
            style={{
              width: '280px',
              background: 'var(--bg-card)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'var(--bg-hover)',
                      color: getSensorColor(selectedSensorData.status),
                    }}
                  >
                    {selectedSensorData.type === 'Radar' ? '📡' : '🔦'}
                  </div>
                  <span
                    className="font-heading"
                    style={{
                      fontSize: '1.29375rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {selectedSensorData.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSensor(null)}
                  className="transition-colors"
                  style={{ 
                    fontSize: '1.4375rem', 
                    lineHeight: 1,
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-2" style={{ fontSize: '1.00625rem' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedSensorData.type}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{selectedSensorData.location}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Latest Reading:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {selectedSensorData.status === 'Active' ? 'Motion Detected' : selectedSensorData.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>Timestamp:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.865rem' }}>
                    {selectedSensorData.lastUpdated}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span
                    className="px-2 py-1 rounded font-semibold"
                    style={{
                      background: `${getSensorColor(selectedSensorData.status)}20`,
                      color: getSensorColor(selectedSensorData.status),
                      fontSize: '0.865rem',
                    }}
                  >
                    {selectedSensorData.status === 'Active' && '🟢'} {selectedSensorData.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div
          className="absolute bottom-4 right-4 flex flex-col gap-2"
          style={{ zIndex: 40 }}
        >
          <button
            onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
            className="w-10 h-10 flex items-center justify-center rounded transition-all duration-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <Plus size={20} />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
            className="w-10 h-10 flex items-center justify-center rounded transition-all duration-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-10 h-10 flex items-center justify-center rounded transition-all duration-200"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <Navigation size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}