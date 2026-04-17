import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { ThreatMap } from '../components/ThreatMap';
import { LiveAlerts } from '../components/LiveAlerts';
import { ThreatPlaybackTimeline } from '../components/ThreatPlaybackTimeline';
import { useSensors } from '../context/SensorContext';
import { useMapNavigation } from '../context/MapNavigationContext';
import { apiGet, APIError } from '../services/apiClient';
import { PagedThreats, ThreatLog } from '../types/api';

const PLAYBACK_WINDOW_HOURS = 12;
const PLAYBACK_WINDOW_MS = PLAYBACK_WINDOW_HOURS * 60 * 60 * 1000;
const PLAYBACK_DOT_WINDOW_MS = 60 * 1000;
const PLAYBACK_BUCKET_MS = 5 * 60 * 1000;
const PLAYBACK_PAGE_SIZE = 500;
const PLAYBACK_MAX_PAGES = 80;
const PLAYBACK_TICK_INTERVAL_MS = 200;
const PLAYBACK_BASE_ADVANCE_MS = 30 * 1000;

const buildPlaybackBuckets = (
  threats: ThreatLog[],
  startMs: number,
  endMs: number,
  bucketMs: number
) => {
  const bucketCount = Math.max(1, Math.ceil((endMs - startMs) / bucketMs));
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    bucketStartMs: startMs + index * bucketMs,
    count: 0,
  }));

  threats.forEach((threat) => {
    const threatMs = new Date(threat.timestamp).getTime();
    if (threatMs < startMs || threatMs > endMs) {
      return;
    }

    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor((threatMs - startMs) / bucketMs))
    );
    buckets[bucketIndex].count += 1;
  });

  return buckets;
};

export function Dashboard() {
  const { sensorList } = useSensors();
  const { selectedThreat, setSelectedThreat } = useMapNavigation();

  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackWindowStartMs, setPlaybackWindowStartMs] = useState(Date.now() - PLAYBACK_WINDOW_MS);
  const [playbackWindowEndMs, setPlaybackWindowEndMs] = useState(Date.now());
  const [playbackCursorMs, setPlaybackCursorMs] = useState<number | null>(null);
  const [historicalThreats, setHistoricalThreats] = useState<ThreatLog[]>([]);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const fetchPlaybackThreats = useCallback(async () => {
    setPlaybackLoading(true);
    setPlaybackError(null);

    const endMs = Date.now();
    const startMs = endMs - PLAYBACK_WINDOW_MS;
    const threatsByAlertId = new Map<string, ThreatLog>();
    let cursor: string | null = null;
    let hasMore = true;
    let pagesLoaded = 0;

    try {
      while (hasMore && pagesLoaded < PLAYBACK_MAX_PAGES) {
        const params = new URLSearchParams();
        params.append('from_dt', new Date(startMs).toISOString());
        params.append('to_dt', new Date(endMs).toISOString());
        params.append('page_size', String(PLAYBACK_PAGE_SIZE));

        if (cursor) {
          params.append('cursor', cursor);
        }

        const page = await apiGet<PagedThreats>(`/api/v1/threats?${params.toString()}`);
        page.items.forEach((threat) => {
          threatsByAlertId.set(threat.alert_id, threat);
        });

        cursor = page.next_cursor;
        hasMore = Boolean(page.has_more && cursor);
        pagesLoaded += 1;
      }

      const sortedThreats = Array.from(threatsByAlertId.values()).sort(
        (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      );

      setHistoricalThreats(sortedThreats);
      setPlaybackWindowStartMs(startMs);
      setPlaybackWindowEndMs(endMs);
      setPlaybackCursorMs(startMs);
      return true;
    } catch (error) {
      const message = error instanceof APIError ? error.message : 'Unable to load playback history.';
      setPlaybackError(message);
      return false;
    } finally {
      setPlaybackLoading(false);
    }
  }, []);

  const handleStartPlayback = useCallback(async () => {
    setIsPlaybackMode(true);
    setIsPlaybackRunning(false);
    setSelectedThreat(null);

    const loaded = await fetchPlaybackThreats();
    if (!loaded) {
      setIsPlaybackRunning(false);
      return;
    }

    setIsPlaybackRunning(true);
  }, [fetchPlaybackThreats, setSelectedThreat]);

  const handleExitPlayback = useCallback(() => {
    setIsPlaybackMode(false);
    setIsPlaybackRunning(false);
    setPlaybackError(null);
    setPlaybackCursorMs(null);
    setHistoricalThreats([]);
  }, []);

  const handleModeToggle = useCallback(
    async (mode: 'live' | 'playback') => {
      if (mode === 'live') {
        handleExitPlayback();
        return;
      }

      if (!isPlaybackMode) {
        await handleStartPlayback();
      }
    },
    [handleExitPlayback, handleStartPlayback, isPlaybackMode]
  );

  const handleSeek = useCallback(
    (nextMs: number) => {
      const clamped = Math.min(playbackWindowEndMs, Math.max(playbackWindowStartMs, nextMs));
      setPlaybackCursorMs(clamped);
    },
    [playbackWindowEndMs, playbackWindowStartMs]
  );

  const handleSeekRelative = useCallback(
    (deltaMs: number) => {
      setPlaybackCursorMs((previous) => {
        if (previous === null) {
          return previous;
        }

        const nextValue = previous + deltaMs;
        return Math.min(playbackWindowEndMs, Math.max(playbackWindowStartMs, nextValue));
      });
    },
    [playbackWindowEndMs, playbackWindowStartMs]
  );

  useEffect(() => {
    if (!isPlaybackMode || !isPlaybackRunning || playbackCursorMs === null) {
      return;
    }

    const tick = window.setInterval(() => {
      setPlaybackCursorMs((previous) => {
        if (previous === null) {
          return previous;
        }

        const nextValue = previous + PLAYBACK_BASE_ADVANCE_MS * playbackSpeed;
        if (nextValue >= playbackWindowEndMs) {
          setIsPlaybackRunning(false);
          return playbackWindowEndMs;
        }

        return nextValue;
      });
    }, PLAYBACK_TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(tick);
    };
  }, [isPlaybackMode, isPlaybackRunning, playbackCursorMs, playbackSpeed, playbackWindowEndMs]);

  const playbackBuckets = useMemo(
    () => buildPlaybackBuckets(historicalThreats, playbackWindowStartMs, playbackWindowEndMs, PLAYBACK_BUCKET_MS),
    [historicalThreats, playbackWindowStartMs, playbackWindowEndMs]
  );

  const playbackVisibleThreats = useMemo(() => {
    if (!isPlaybackMode || playbackCursorMs === null) {
      return [];
    }

    const frameStartMs = playbackCursorMs - PLAYBACK_DOT_WINDOW_MS;

    return historicalThreats.filter((threat) => {
      const threatMs = new Date(threat.timestamp).getTime();
      return threatMs >= frameStartMs && threatMs <= playbackCursorMs;
    });
  }, [historicalThreats, isPlaybackMode, playbackCursorMs]);

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
  const playbackOverlayHeight = isPlaybackMode ? 90 : 68;
  const playbackOverlayRight = isPlaybackMode ? 360 : 296;
  const activeSensorCount = useMemo(
    () => sensorList.filter((sensor) => sensor.status?.toLowerCase() === 'active').length,
    [sensorList]
  );
  const displayedSensorCount = activeSensorCount > 0 ? activeSensorCount : sensorList.length;

  return (
    <div className="relative h-[calc(100vh-5rem)] min-h-0 overflow-hidden p-4 lg:p-6">
      <div className="relative h-full min-h-0 overflow-hidden rounded-[28px] border shadow-sm" style={{ borderColor: 'rgba(226,232,240,0.9)' }}>
        <ThreatMap
          playbackMode={isPlaybackMode}
          playbackCursorMs={playbackCursorMs}
          playbackThreats={playbackVisibleThreats}
          playbackDotWindowMs={PLAYBACK_DOT_WINDOW_MS}
        />

        {!isPlaybackMode && (
          <div
            className="absolute left-20 top-3 z-[640] flex items-center gap-2 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur-md"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,255,250,0.96) 100%)',
              borderColor: 'rgba(22,163,74,0.25)',
              boxShadow: '0 10px 24px rgba(15,23,42,0.16)',
            }}
          >
            <span
              className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[0.72rem] font-bold"
              style={{
                background: 'rgba(22,163,74,0.12)',
                borderColor: 'rgba(22,163,74,0.35)',
                color: '#166534',
              }}
            >
              {displayedSensorCount}
            </span>
            <div className="flex items-center gap-1.5 pr-1">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: '#166534' }}>
                active {displayedSensorCount === 1 ? 'sensor' : 'sensors'}
              </span>
            </div>
          </div>
        )}

        {isPlaybackMode && (
          <button
            type="button"
            onClick={handleStartPlayback}
            disabled={playbackLoading}
            className="absolute left-20 top-3 z-[640] rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] shadow-lg backdrop-blur-md transition disabled:opacity-60"
            style={{
              background: 'rgba(2, 132, 199, 0.15)',
              borderColor: '#0284C7',
              color: '#0284C7',
            }}
          >
            {playbackLoading ? 'LOADING 12H' : 'REFRESH 12H'}
          </button>
        )}

        <div
          className="absolute top-3 z-[645] hidden xl:block"
          style={{
            right: '308px',
          }}
        >
          <div
            className="relative inline-grid grid-cols-2 items-center rounded-full border p-1 shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.94)',
              borderColor: 'rgba(226,232,240,0.9)',
            }}
          >
            <span
              className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-full transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                transform: isPlaybackMode ? 'translateX(100%)' : 'translateX(0)',
                background: isPlaybackMode ? 'rgba(2,132,199,0.14)' : 'rgba(22,163,74,0.14)',
              }}
            />
            <button
              type="button"
              onClick={() => void handleModeToggle('live')}
              disabled={playbackLoading}
              className="relative z-10 w-[92px] rounded-full px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-60"
              style={{
                color: !isPlaybackMode ? '#16A34A' : '#64748B',
              }}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => void handleModeToggle('playback')}
              disabled={playbackLoading}
              className="relative z-10 w-[92px] rounded-full px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-60"
              style={{
                color: isPlaybackMode ? '#0284C7' : '#64748B',
              }}
            >
              {playbackLoading ? 'Loading' : 'Playback'}
            </button>
          </div>
        </div>

        <div className="absolute right-4 top-3 z-[645] xl:hidden">
          <div
            className="relative inline-grid grid-cols-2 items-center rounded-full border p-1 shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.94)',
              borderColor: 'rgba(226,232,240,0.9)',
            }}
          >
            <span
              className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-full transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                transform: isPlaybackMode ? 'translateX(100%)' : 'translateX(0)',
                background: isPlaybackMode ? 'rgba(2,132,199,0.14)' : 'rgba(22,163,74,0.14)',
              }}
            />
            <button
              type="button"
              onClick={() => void handleModeToggle('live')}
              disabled={playbackLoading}
              className="relative z-10 w-[92px] rounded-full px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-60"
              style={{
                color: !isPlaybackMode ? '#16A34A' : '#64748B',
              }}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => void handleModeToggle('playback')}
              disabled={playbackLoading}
              className="relative z-10 w-[92px] rounded-full px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 disabled:opacity-60"
              style={{
                color: isPlaybackMode ? '#0284C7' : '#64748B',
              }}
            >
              {playbackLoading ? 'Loading' : 'Playback'}
            </button>
          </div>
        </div>

        {/* Selected Threat Banner */}
        {selectedThreat && threatBannerColor && (
          <div
            className="absolute left-1/2 top-14 z-[620] -translate-x-1/2 flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md"
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
              className="ml-2 rounded p-1 transition-colors hover:bg-opacity-20"
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

        {isPlaybackMode && (
          <div
            className="absolute bottom-4 z-[700] hidden xl:block"
            style={{
              left: '280px',
              right: `${playbackOverlayRight}px`,
              height: `${playbackOverlayHeight}px`,
            }}
          >
            <div
              className="h-full border-t px-3"
              style={{
                background: 'linear-gradient(180deg, #F5FAFF 0%, #EAF4FF 100%)',
                borderTopColor: '#93C5FD',
                boxShadow: '0 10px 26px rgba(14, 116, 144, 0.2), inset 0 1px 0 rgba(255,255,255,0.7)',
                borderRadius: '12px',
              }}
            >
              <ThreatPlaybackTimeline
                isPlaybackMode={isPlaybackMode}
                isPlaying={isPlaybackRunning}
                isLoading={playbackLoading}
                error={playbackError}
                startMs={playbackWindowStartMs}
                endMs={playbackWindowEndMs}
                cursorMs={playbackCursorMs ?? playbackWindowStartMs}
                speed={playbackSpeed}
                buckets={playbackBuckets}
                totalThreats={historicalThreats.length}
                onStartPlayback={handleStartPlayback}
                onTogglePlay={() => setIsPlaybackRunning((previous) => !previous)}
                onSeek={handleSeek}
                onSeekRelative={handleSeekRelative}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </div>
        )}

        {isPlaybackMode && (
          <div className="absolute inset-x-4 bottom-[8.25rem] z-[700] xl:hidden" style={{ height: `${playbackOverlayHeight}px` }}>
            <div
              className="h-full border-t px-3"
              style={{
                background: 'linear-gradient(180deg, #F5FAFF 0%, #EAF4FF 100%)',
                borderTopColor: '#93C5FD',
                boxShadow: '0 10px 26px rgba(14, 116, 144, 0.2), inset 0 1px 0 rgba(255,255,255,0.7)',
                borderRadius: '12px',
              }}
            >
              <ThreatPlaybackTimeline
                isPlaybackMode={isPlaybackMode}
                isPlaying={isPlaybackRunning}
                isLoading={playbackLoading}
                error={playbackError}
                startMs={playbackWindowStartMs}
                endMs={playbackWindowEndMs}
                cursorMs={playbackCursorMs ?? playbackWindowStartMs}
                speed={playbackSpeed}
                buckets={playbackBuckets}
                totalThreats={historicalThreats.length}
                onStartPlayback={handleStartPlayback}
                onTogglePlay={() => setIsPlaybackRunning((previous) => !previous)}
                onSeek={handleSeek}
                onSeekRelative={handleSeekRelative}
                onSpeedChange={setPlaybackSpeed}
              />
            </div>
          </div>
        )}

        <div className="absolute inset-x-4 bottom-4 z-[600] xl:hidden">
          <LiveAlerts />
        </div>
      </div>
    </div>
  );
}