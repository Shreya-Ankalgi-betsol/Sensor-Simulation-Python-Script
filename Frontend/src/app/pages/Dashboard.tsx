import { ThreatMap } from '../components/ThreatMap';
import { LiveAlerts } from '../components/LiveAlerts';

export function Dashboard() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 gap-4 overflow-hidden p-6">
      {/* Map Area - 75% */}
      <div className="flex-[0_0_75%] h-full min-h-0">
        <ThreatMap />
      </div>

      {/* Live Alerts Panel - 25%, Sticky with scrollable threats */}
      <div className="flex-[0_0_25%] flex h-full min-h-0 flex-col">
        <LiveAlerts />
      </div>
    </div>
  );
}