import { useState, useEffect } from 'react';
import { AlertTriangle, User, Flame, Sword } from 'lucide-react';
import { threats, LiveAlert } from '../data/mockData';

export function LiveAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>(
    threats.slice(0, 5).map((t) => ({ ...t, isNew: false }))
  );

  // Simulate new alerts coming in
  useEffect(() => {
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
        }),
        isNew: true,
      };

      setAlerts((prev) => {
        const updated = [newAlert, ...prev.slice(0, 9)];
        // Remove isNew flag after animation
        setTimeout(() => {
          setAlerts((current) =>
            current.map((a) => (a.id === newAlert.id ? { ...a, isNew: false } : a))
          );
        }, 500);
        return updated;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Drone':
        return <AlertTriangle size={20} />;
      case 'Trespassing':
        return <User size={20} />;
      case 'Temperature':
        return <Flame size={20} />;
      case 'Weapon':
        return <Sword size={20} />;
      default:
        return <AlertTriangle size={20} />;
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

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return '#FEE2E2';
      case 'Medium':
        return '#FEF3C7';
      case 'Low':
        return '#DCFCE7';
      default:
        return '#F3F4F6';
    }
  };

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, isNew: false } : alert))
    );
  };

  return (
    <div
      className="h-full rounded-lg flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
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
          Live Alerts
        </h3>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.map((alert, index) => {
          const severityColor = getSeverityColor(alert.severity);
          const severityBgColor = getSeverityBgColor(alert.severity);
          
          return (
            <div
              key={alert.id}
              className={`rounded-lg transition-all duration-500 ${
                alert.isNew ? 'animate-in slide-in-from-right' : ''
              }`}
              style={{
                background: alert.isNew ? '#DBEAFE' : 'var(--bg-primary)',
                borderLeft: `4px solid ${severityColor}`,
                padding: '12px',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="mt-1 flex-shrink-0 p-2 rounded"
                  style={{ 
                    color: severityColor,
                    background: `${severityColor}15`,
                  }}
                >
                  {getIcon(alert.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4
                      className="font-heading uppercase"
                      style={{
                        fontSize: '1.00625rem',
                        fontWeight: 700,
                        color: severityColor,
                        lineHeight: 1.2,
                      }}
                    >
                      {alert.type.toUpperCase()} DETECTED
                    </h4>
                    {alert.isNew && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs animate-pulse"
                        style={{
                          background: severityBgColor,
                          color: severityColor,
                          fontSize: '0.71875rem',
                          fontWeight: 600,
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  <p
                    className="mb-2"
                    style={{
                      fontSize: '0.865rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {alert.description}
                  </p>

                  <div
                    className="flex items-center gap-2"
                    style={{
                      fontSize: '0.865rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      {alert.sensorId}
                    </span>
                    <span>·</span>
                    <span>{alert.location}</span>
                    <span>·</span>
                    <span>{alert.timestamp.split(',')[1]?.trim() || alert.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}