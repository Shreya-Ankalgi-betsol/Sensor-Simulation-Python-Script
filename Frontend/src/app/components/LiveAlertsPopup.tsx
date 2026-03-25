import { useState, useEffect } from 'react';
import { X, Bell, Shield, User, Flame, Plane } from 'lucide-react';
import { threats, LiveAlert } from '../data/mockData';

export function LiveAlertsPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>(
    threats.slice(0, 3).map((t) => ({ ...t, isNew: false }))
  );

  useEffect(() => {
    // Simulate real-time alerts every 8 seconds
    const interval = setInterval(() => {
      const randomThreat = threats[Math.floor(Math.random() * threats.length)];
      const newAlert: LiveAlert = {
        ...randomThreat,
        id: `T-${Date.now()}`,
        timestamp: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        isNew: true,
      };

      setLiveAlerts((prev) => {
        const updated = [newAlert, ...prev.slice(0, 2)];
        return updated;
      });

      // Remove new flag after 2 seconds
      setTimeout(() => {
        setLiveAlerts((prev) =>
          prev.map((alert) =>
            alert.id === newAlert.id ? { ...alert, isNew: false } : alert
          )
        );
      }, 2000);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Drone':
        return <Plane size={16} />;
      case 'Trespassing':
        return <User size={16} />;
      case 'Temperature':
        return <Flame size={16} />;
      case 'Weapon':
        return <Shield size={16} />;
      default:
        return <Shield size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#D97706';
      case 'Low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-5 z-[200] p-3 rounded-full transition-all duration-200 shadow-lg"
        style={{
          background: 'var(--accent-cyan)',
          color: '#FFFFFF',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Bell size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed top-20 right-5 z-[200] rounded-xl shadow-lg"
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border-color)',
        width: '280px',
        maxHeight: '400px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div
          className="uppercase tracking-wider"
          style={{
            fontSize: '0.8625rem',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Live Alerts
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded transition-all duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F0F9FF';
            e.currentTarget.style.color = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Alerts List */}
      <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
        {liveAlerts.map((alert, index) => (
          <div
            key={alert.id}
            className="px-4 py-3 border-b transition-all duration-300"
            style={{
              borderColor: 'var(--border-color)',
              background: alert.isNew ? '#DBEAFE' : '#FFFFFF',
              animation: alert.isNew ? 'pulse 0.5s ease-in-out' : 'none',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 p-2 rounded"
                style={{
                  background: `${getSeverityColor(alert.severity)}15`,
                  color: getSeverityColor(alert.severity),
                }}
              >
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium truncate"
                  style={{
                    fontSize: '0.92188rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {alert.type}
                </div>
                <div
                  className="truncate"
                  style={{
                    fontSize: '0.8625rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {alert.description}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontSize: '0.78938rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {alert.timestamp}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
