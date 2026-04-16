import { AlertTriangle, RadioTower, ShieldAlert, Waves, X } from 'lucide-react';
import { ThreatMap } from '../components/ThreatMap';
import { LiveAlerts } from '../components/LiveAlerts';
import { useSensors } from '../context/SensorContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useMapNavigation } from '../context/MapNavigationContext';

export function Dashboard() {
  const { sensorList } = useSensors();
  const { liveThreats, connectionStatus } = useWebSocket();
  const { selectedThreat, setSelectedThreat } = useMapNavigation();

  const activeSensors = sensorList.filter((sensor) => sensor.status === 'active').length;
  const criticalThreats = liveThreats.filter((threat) => ['high', 'critical'].includes(threat.severity)).length;
  const recentThreats = liveThreats.length;

  const statusPill = {
    connecting: { label: 'Connecting', tone: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
    connected: { label: 'Live feed', tone: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' },
    disconnected: { label: 'Disconnected', tone: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },
  }[connectionStatus];

  // Get severity-based colors for selected threat banner
  const getSeverityBannerColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return { bg: 'rgba(220, 38, 38, 0.15)', border: '#DC2626', text: '#991B1B', icon: '#DC2626', subtitle: '#B91C1C' };
      case 'med':
      case 'medium':
        return { bg: 'rgba(234, 88, 12, 0.15)', border: '#EA580C', text: '#92400E', icon: '#EA580C', subtitle: '#C2410C' };
      case 'low':
        return { bg: 'rgba(22, 163, 74, 0.15)', border: '#16A34A', text: '#166534', icon: '#16A34A', subtitle: '#15803D' };
      default:
        return { bg: 'rgba(220, 38, 38, 0.15)', border: '#DC2626', text: '#991B1B', icon: '#DC2626', subtitle: '#B91C1C' };
    }
  };

  const threatBannerColor = selectedThreat ? getSeverityBannerColor(selectedThreat.severity) : null;

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-0 overflow-hidden p-4 lg:p-6">
      <div className="relative h-full min-h-0 rounded-[28px] border shadow-sm" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
        <ThreatMap />

        <div
          className="absolute left-4 top-4 z-[600] flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md"
          style={{
            background: 'rgba(255,255,255,0.94)',
            borderColor: 'rgba(226,232,240,0.9)',
          }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: statusPill.tone }}>
            <Waves size={16} />
            {statusPill.label}
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-sm font-semibold text-slate-900">{sensorList.length} sensors</div>
        </div>

        {/* Selected Threat Banner */}
        {selectedThreat && threatBannerColor && (
          <div
            className="absolute left-1/2 top-4 z-[600] -translate-x-1/2 flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md"
            style={{
              background: threatBannerColor.bg,
              borderColor: threatBannerColor.border,
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: threatBannerColor.icon }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: threatBannerColor.text }}>
                  Threat Selected
                </div>
                <div className="text-xs" style={{ color: threatBannerColor.subtitle }}>
                  {selectedThreat.threat_type} • {selectedThreat.sensor_id}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedThreat(null)}
              className="ml-2 p-1 hover:bg-opacity-20 rounded transition-colors"
              style={{ backgroundColor: threatBannerColor.border + '20' }}
              title="Clear selected threat"
            >
              <X size={18} style={{ color: threatBannerColor.icon }} />
            </button>
          </div>
        )}

        <div
          className="absolute right-4 top-4 bottom-4 z-[600] hidden w-[270px] xl:block"
        >
          <LiveAlerts />
        </div>

        <div
          className="absolute bottom-4 left-4 z-[600] rounded-3xl border px-4 py-3 shadow-lg backdrop-blur-md"
          style={{
            background: 'rgba(255,255,255,0.94)',
            borderColor: 'rgba(226,232,240,0.9)',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
            <ShieldAlert size={14} />
            Legend
          </div>
          <div className="mt-2 grid gap-1 text-sm">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Active sensor</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Recent threat</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Inactive / offline</div>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 z-[600] xl:hidden">
          <LiveAlerts />
        </div>
      </div>
    </div>
  );
}