import { useState, useEffect } from 'react';
import { AlertTriangle, User, Flame, Sword, Activity } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { ThreatLog } from '../types/api';

interface LiveAlert extends ThreatLog {
  isNew?: boolean;
}

export function LiveAlerts() {
  const { liveThreats, connectionStatus } = useWebSocket();
  const [displayAlerts, setDisplayAlerts] = useState<LiveAlert[]>([]);

  // Update display alerts when live threats change
  useEffect(() => {
    if (liveThreats && liveThreats.length > 0) {
      // Take top 10 threats and mark recently added ones as new
      const newAlerts = liveThreats.slice(0, 10).map((threat, index) => ({
        ...threat,
        isNew: index === 0, // Only the first (most recent) one is marked as new
      }));
      setDisplayAlerts(newAlerts);
    }
  }, [liveThreats]);

  const getIcon = (threat: string) => {
    switch (threat?.toLowerCase()) {
      case 'drone':
        return <AlertTriangle size={20} />;
      case 'trespassing':
        return <User size={20} />;
      case 'temperature':
        return <Flame size={20} />;
      case 'weapon':
        return <Sword size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return '#DC2626';
      case 'med':
      case 'medium':
        return '#D97706';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return '#FEE2E2';
      case 'med':
      case 'medium':
        return '#FEF3C7';
      case 'low':
        return '#DCFCE7';
      default:
        return '#F3F4F6';
    }
  };

  const connectionMeta = {
    connecting: { label: 'Connecting', tone: '#D97706' },
    connected: { label: 'Live', tone: '#16A34A' },
    disconnected: { label: 'Offline', tone: '#DC2626' },
  }[connectionStatus];

  return (
    <div
      className="h-full rounded-2xl flex flex-col overflow-hidden border shadow-sm"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
        borderColor: 'rgba(226,232,240,0.9)',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
        <div>
          <div
            className="uppercase tracking-[0.2em]"
            style={{
              fontSize: 'var(--fs-1)',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Threat feed
          </div>
          <h3 className="mt-1 font-semibold text-slate-900" style={{ fontSize: 'var(--fs-4)' }}>
            Live alerts
          </h3>
        </div>

      </div>

      {/* Alert List - Scrollable Container */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--accent-cyan) transparent',
        }}
      >
        <style>{`
          div[class*="overflow-y-auto"]::-webkit-scrollbar {
            width: 6px;
          }
          div[class*="overflow-y-auto"]::-webkit-scrollbar-track {
            background: transparent;
          }
          div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
            background: var(--accent-cyan);
            border-radius: 3px;
            opacity: 0.5;
          }
          div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb:hover {
            opacity: 0.8;
          }
        `}</style>
        {displayAlerts.length === 0 ? (
          <div
            className="rounded-xl border border-dashed p-5 text-center"
            style={{
              color: 'var(--text-secondary)',
              borderColor: 'rgba(226,232,240,0.9)',
              background: 'rgba(248,250,252,0.8)',
            }}
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--accent-cyan)' }}>
              <Activity size={18} />
            </div>
            <div className="font-semibold text-slate-900" style={{ fontSize: 'var(--fs-3)' }}>Waiting for live detections</div>
            <div className="mt-1" style={{ fontSize: 'var(--fs-2)' }}>New incidents will appear here as soon as sensors report them.</div>
          </div>
        ) : (
          displayAlerts.map((alert, index) => {
            const severityColor = getSeverityColor(alert.severity);
            const severityBgColor = getSeverityBgColor(alert.severity);
            
            return (
              <div
                key={alert.alert_id || `threat-${index}`}  // Fallback to index if alert_id is missing
                className="rounded-xl border transition-all duration-500"
                style={{
                  background: alert.isNew ? 'rgba(219,234,254,0.75)' : 'rgba(255,255,255,0.95)',
                  borderColor: 'rgba(226,232,240,0.9)',
                  borderLeft: `4px solid ${severityColor}`,
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="mt-1 flex-shrink-0 rounded-lg p-1.5"
                    style={{
                      color: severityColor,
                      background: `${severityColor}15`,
                    }}
                  >
                    {getIcon(alert.threat_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className="font-heading uppercase"
                        style={{
                          fontSize: 'var(--fs-2)',
                          fontWeight: 700,
                          color: severityColor,
                          lineHeight: 1.2,
                        }}
                      >
                        {alert.threat_type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'} DETECTED
                      </h4>
                      {alert.isNew && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs animate-pulse"
                          style={{
                            background: severityBgColor,
                            color: severityColor,
                            fontSize: 'var(--fs-1)',
                            fontWeight: 600,
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
                      style={{
                        fontSize: 'var(--fs-2)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span className="shrink-0" style={{ color: 'var(--accent-cyan)' }}>
                        {alert.sensor_id}
                      </span>
                      <span className="shrink-0" style={{ color: 'var(--text-secondary)' }}>&middot;</span>
                      <span className="truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--fs-1)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}