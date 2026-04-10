import { AlertTriangle, RadioTower, ShieldAlert, Waves } from 'lucide-react';
import { ThreatMap } from '../components/ThreatMap';
import { LiveAlerts } from '../components/LiveAlerts';
import { useSensors } from '../context/SensorContext';
import { useWebSocket } from '../context/WebSocketContext';

export function Dashboard() {
  const { sensorList } = useSensors();
  const { liveThreats, connectionStatus } = useWebSocket();

  const activeSensors = sensorList.filter((sensor) => sensor.status === 'active').length;
  const criticalThreats = liveThreats.filter((threat) => ['high', 'critical'].includes(threat.severity)).length;
  const recentThreats = liveThreats.length;

  const statusPill = {
    connecting: { label: 'Connecting', tone: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
    connected: { label: 'Live feed', tone: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' },
    disconnected: { label: 'Disconnected', tone: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)' },
  }[connectionStatus];

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