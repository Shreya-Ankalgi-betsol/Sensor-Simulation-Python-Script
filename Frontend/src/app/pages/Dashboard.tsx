import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, ShieldAlert, X } from 'lucide-react';
import { ThreatMap } from '../components/ThreatMap';
import { LiveAlerts } from '../components/LiveAlerts';
import { ModeToggle } from '../components/dashboard/ModeToggle';
import { PlaybackTimelinePanel } from '../components/dashboard/PlaybackTimelinePanel';
import type { PlaybackBucket } from '../components/ThreatPlaybackTimeline';
import { useSensors } from '../context/SensorContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useTimezone } from '../context/TimezoneContext';
import { useMapNavigation } from '../context/MapNavigationContext';
import { useChunkManager } from '../hooks/useChunkManager';
import { APIError } from '../services/apiClient';
import type { ThreatChunkManifestItem, ThreatLog } from '../types/api';

const PLAYBACK_WINDOW_HOURS = 12;
const PLAYBACK_WINDOW_MS = PLAYBACK_WINDOW_HOURS * 60 * 60 * 1000;
const PLAYBACK_DOT_WINDOW_MS = 60 * 1000;
const PLAYBACK_BUCKET_MS = 5 * 60 * 1000;
const PLAYBACK_TICK_INTERVAL_MS = 200;
const PLAYBACK_BASE_ADVANCE_MS = 30 * 1000;
const PLAYBACK_FETCH_THROTTLE_MS = 250;
const SCRUB_THROTTLE_MS = 100;
const SCRUB_DEBOUNCE_MS = 300;

const OSM_LINES_REFERENCE_URL = 'https://wiki.openstreetmap.org/wiki/OpenStreetMap_Carto/Lines';

type OSMTopLegendItem = {
  label: string;
  color: string;
  kind: 'line' | 'fill';
  width?: number;
  dashed?: boolean;
};

const OSM_TOP_LEGEND: OSMTopLegendItem[] = [
  { label: 'Forest / Woodland', color: '#9cc58a', kind: 'fill' },
  { label: 'Open Land / Scrub', color: '#d7e6a3', kind: 'fill' },
  { label: 'Built-up Urban Area', color: '#e6e3db', kind: 'fill' },
  { label: 'Motorway / Expressway', color: '#ef8a73', kind: 'line', width: 4 },
  { label: 'Primary Road', color: '#f3b363', kind: 'line', width: 3 },
  { label: 'Secondary Road', color: '#f0d58b', kind: 'line', width: 2.5 },
  { label: 'Local / Minor Road', color: '#c8c8c8', kind: 'line', width: 2 },
  { label: 'Railway Track', color: '#6a6a6a', kind: 'line', width: 2 },
  { label: 'River / Canal', color: '#8db7e8', kind: 'line', width: 2 },
  { label: 'Administrative Boundary', color: '#a58bb6', kind: 'line', width: 2, dashed: true },
];

// Distribute chunk counts into fixed buckets for timeline display.
const buildManifestBuckets = (
  manifest: ThreatChunkManifestItem[],
  startMs: number,
  endMs: number,
  bucketMs: number
): PlaybackBucket[] => {
  const bucketCount = Math.max(1, Math.ceil((endMs - startMs) / bucketMs));
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    bucketStartMs: startMs + index * bucketMs,
    count: 0,
  }));

  manifest.forEach((chunk) => {
    if (chunk.threat_count <= 0) {
      return;
    }

    const chunkStart = new Date(chunk.start_time).getTime();
    const chunkEnd = new Date(chunk.end_time).getTime();
    const midpoint = (chunkStart + chunkEnd) / 2;

    if (midpoint < startMs || midpoint > endMs) {
      return;
    }

    const index = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor((midpoint - startMs) / bucketMs))
    );
    buckets[index].count += chunk.threat_count;
  });

  return buckets;
};

export function Dashboard() {
  const { sensorList } = useSensors();
  const { liveThreats } = useWebSocket();
  const { timezone } = useTimezone();
  const { selectedThreat, setSelectedThreat } = useMapNavigation();

  const {
    manifest,
    isLoading: isChunkLoading,
    getThreatsAtTime,
    currentChunkId,
    cacheSize,
    insertLiveThreat,
  } = useChunkManager();

  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackWindowStartMs, setPlaybackWindowStartMs] = useState(Date.now() - PLAYBACK_WINDOW_MS);
  const [playbackWindowEndMs, setPlaybackWindowEndMs] = useState(Date.now());
  const [playbackCursorMs, setPlaybackCursorMs] = useState<number | null>(null);
  const [playbackThreats, setPlaybackThreats] = useState<ThreatLog[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackLiveCount, setPlaybackLiveCount] = useState(0);
  const [isMapSymbolsOpen, setIsMapSymbolsOpen] = useState(false);
  const processedLiveThreatIdsRef = useRef<Set<string>>(new Set());
  const playbackLiveCountRef = useRef(0);
  const scrubThrottleRef = useRef(0);
  const scrubDebounceRef = useRef<number | null>(null);
  const playbackFetchThrottleRef = useRef(0);

  const playbackLoading = isChunkLoading;

  // Fetch cached threats near the selected playback time.
  const loadThreatsForTime = useCallback(
    async (targetMs: number) => {
      setPlaybackError(null);
      try {
        const threats = await getThreatsAtTime(targetMs);
        setPlaybackThreats(threats);
        console.log('[Dashboard] Loaded threats for time:', new Date(targetMs).toISOString());
      } catch (error) {
        const message = error instanceof APIError ? error.message : 'Unable to load playback chunk.';
        setPlaybackError(message);
      }
    },
    [getThreatsAtTime]
  );

  useEffect(() => {
    if (manifest.length === 0) {
      return;
    }

    const startMs = new Date(manifest[0].start_time).getTime();
    const endMs = new Date(manifest[manifest.length - 1].end_time).getTime();

    if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
      setPlaybackWindowStartMs(startMs);
      setPlaybackWindowEndMs(endMs);
      setPlaybackCursorMs((previous) => previous ?? startMs);
      playbackLiveCountRef.current = 0;
      setPlaybackLiveCount(0);
    }
  }, [manifest]);

  // Enter playback mode and load the initial chunk.
  const handleStartPlayback = useCallback(async () => {
    setIsPlaybackMode(true);
    setIsPlaybackRunning(false);
    setSelectedThreat(null);

    const fallbackStartMs = Date.now() - PLAYBACK_WINDOW_MS;
    const manifestStartMs = manifest.length > 0
      ? new Date(manifest[0].start_time).getTime()
      : fallbackStartMs;
    const startMs = Number.isFinite(manifestStartMs) ? manifestStartMs : fallbackStartMs;

    setPlaybackCursorMs(startMs);
    processedLiveThreatIdsRef.current = new Set(liveThreats.map((threat) => threat.alert_id));
    playbackLiveCountRef.current = 0;
    setPlaybackLiveCount(0);
    await loadThreatsForTime(startMs);
    setIsPlaybackRunning(true);
    console.log('[Dashboard] Playback started at', new Date(startMs).toISOString());
  }, [loadThreatsForTime, liveThreats, manifest, setSelectedThreat]);

  // Exit playback mode and reset playback state.
  const handleExitPlayback = useCallback(() => {
    setIsPlaybackMode(false);
    setIsPlaybackRunning(false);
    setPlaybackError(null);
    setPlaybackCursorMs(null);
    setPlaybackThreats([]);
    playbackLiveCountRef.current = 0;
    setPlaybackLiveCount(0);
    processedLiveThreatIdsRef.current.clear();
    if (scrubDebounceRef.current) {
      window.clearTimeout(scrubDebounceRef.current);
      scrubDebounceRef.current = null;
    }
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

  // Handle scrubber drag with throttle + debounce.
  const handleSeek = useCallback(
    (nextMs: number) => {
      const clamped = Math.min(playbackWindowEndMs, Math.max(playbackWindowStartMs, nextMs));
      const nowMs = Date.now();

      if (nowMs - scrubThrottleRef.current >= SCRUB_THROTTLE_MS) {
        setPlaybackCursorMs(clamped);
        scrubThrottleRef.current = nowMs;
      }

      if (scrubDebounceRef.current) {
        window.clearTimeout(scrubDebounceRef.current);
      }

      scrubDebounceRef.current = window.setTimeout(() => {
        setPlaybackCursorMs(clamped);
        void loadThreatsForTime(clamped);
        console.log('[Dashboard] Scrub settled at', new Date(clamped).toISOString());
      }, SCRUB_DEBOUNCE_MS);
    },
    [loadThreatsForTime, playbackWindowEndMs, playbackWindowStartMs]
  );

  // Jump playback cursor by a relative delta.
  const handleSeekRelative = useCallback(
    (deltaMs: number) => {
      if (playbackCursorMs === null) {
        return;
      }

      const nextValue = Math.min(
        playbackWindowEndMs,
        Math.max(playbackWindowStartMs, playbackCursorMs + deltaMs)
      );
      setPlaybackCursorMs(nextValue);
      void loadThreatsForTime(nextValue);
    },
    [loadThreatsForTime, playbackCursorMs, playbackWindowEndMs, playbackWindowStartMs]
  );

  const handleLiveAlertClick = useCallback((threat: ThreatLog) => {
    setSelectedThreat(threat);
  }, [setSelectedThreat]);

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

  useEffect(() => {
    if (!isPlaybackMode || !isPlaybackRunning || playbackCursorMs === null) {
      return;
    }

    const nowMs = Date.now();
    if (nowMs - playbackFetchThrottleRef.current < PLAYBACK_FETCH_THROTTLE_MS) {
      return;
    }

    playbackFetchThrottleRef.current = nowMs;
    void loadThreatsForTime(playbackCursorMs);
  }, [isPlaybackMode, isPlaybackRunning, loadThreatsForTime, playbackCursorMs]);

  useEffect(() => {
    if (!isPlaybackMode) {
      return;
    }

    console.log('[Dashboard] Cache status:', {
      currentChunkId,
      cacheSize,
    });
  }, [cacheSize, currentChunkId, isPlaybackMode]);

  useEffect(() => {
    if (!isPlaybackMode || liveThreats.length === 0) {
      return;
    }

    const knownIds = processedLiveThreatIdsRef.current;
    const incomingFromSocket: ThreatLog[] = [];

    for (const threat of liveThreats) {
      if (knownIds.has(threat.alert_id)) {
        break;
      }
      incomingFromSocket.push(threat);
    }

    if (incomingFromSocket.length === 0) {
      return;
    }

    incomingFromSocket.forEach((threat) => {
      knownIds.add(threat.alert_id);
      insertLiveThreat(threat);
    });

    if (isPlaybackMode) {
      playbackLiveCountRef.current += incomingFromSocket.length;
      setPlaybackLiveCount(playbackLiveCountRef.current);
    }

    console.log('[Dashboard] Live threats merged into cache:', incomingFromSocket.length);
  }, [insertLiveThreat, isPlaybackMode, liveThreats]);

  const playbackBuckets = useMemo(
    () => buildManifestBuckets(manifest, playbackWindowStartMs, playbackWindowEndMs, PLAYBACK_BUCKET_MS),
    [manifest, playbackWindowStartMs, playbackWindowEndMs]
  );

  const playbackVisibleThreats = useMemo(
    () => (isPlaybackMode ? playbackThreats : []),
    [isPlaybackMode, playbackThreats]
  );

  const totalPlaybackThreats = useMemo(
    () => manifest.reduce((sum, chunk) => sum + chunk.threat_count, 0) + playbackLiveCount,
    [manifest, playbackLiveCount]
  );

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

        <ModeToggle
          containerClassName="absolute top-3 z-[645] hidden xl:block"
          containerStyle={{ right: '308px' }}
          isPlaybackMode={isPlaybackMode}
          playbackLoading={playbackLoading}
          onToggle={handleModeToggle}
        />

        <ModeToggle
          containerClassName="absolute right-4 top-3 z-[645] xl:hidden"
          isPlaybackMode={isPlaybackMode}
          playbackLoading={playbackLoading}
          onToggle={handleModeToggle}
        />

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
          <LiveAlerts onAlertClick={handleLiveAlertClick} />
        </div>

        <div className="absolute bottom-4 left-4 z-[600] flex flex-col items-start gap-2">
          <div
            className="w-fit rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.94)',
              borderColor: 'rgba(226,232,240,0.9)',
            }}
          >
            <div className="grid gap-1 text-xs">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Red dot - Threat</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Green dot - Active sensor</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Gray dot - Inactive sensor</div>
            </div>
          </div>

          <div
            className="rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.94)',
              borderColor: 'rgba(226,232,240,0.9)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsMapSymbolsOpen((previous) => !previous)}
              className="flex w-full items-center justify-between rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--text-secondary)', background: 'rgba(248,250,252,0.92)' }}
              aria-expanded={isMapSymbolsOpen}
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={12} />
                Legend
              </span>
              {isMapSymbolsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isMapSymbolsOpen && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(226,232,240,0.95)' }}>
                <div className="grid gap-1.5 text-xs" style={{ maxHeight: '170px', overflowY: 'auto' }}>
                  {OSM_TOP_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        style={item.kind === 'fill'
                          ? {
                              width: '14px',
                              height: '10px',
                              borderRadius: '3px',
                              border: '1px solid rgba(100,116,139,0.35)',
                              background: item.color,
                              display: 'inline-block',
                            }
                          : {
                              width: '20px',
                              borderTop: `${item.width || 2}px ${item.dashed ? 'dashed' : 'solid'} ${item.color}`,
                              display: 'inline-block',
                            }}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={OSM_LINES_REFERENCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
                  style={{
                    color: '#0f4c81',
                    background: 'rgba(15, 76, 129, 0.08)',
                  }}
                >
                  Show all symbols
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {isPlaybackMode && (
          <PlaybackTimelinePanel
            containerClassName="absolute bottom-4 z-[700] hidden xl:block"
            containerStyle={{
              left: '280px',
              right: `${playbackOverlayRight}px`,
              height: `${playbackOverlayHeight}px`,
            }}
            isPlaybackMode={isPlaybackMode}
            isPlaying={isPlaybackRunning}
            isLoading={playbackLoading}
            error={playbackError}
            timezone={timezone}
            startMs={playbackWindowStartMs}
            endMs={playbackWindowEndMs}
            cursorMs={playbackCursorMs ?? playbackWindowStartMs}
            speed={playbackSpeed}
            buckets={playbackBuckets}
            totalThreats={totalPlaybackThreats}
            onStartPlayback={handleStartPlayback}
            onTogglePlay={() => setIsPlaybackRunning((previous) => !previous)}
            onSeek={handleSeek}
            onSeekRelative={handleSeekRelative}
            onSpeedChange={setPlaybackSpeed}
          />
        )}

        {isPlaybackMode && (
          <PlaybackTimelinePanel
            containerClassName="absolute inset-x-4 bottom-[8.25rem] z-[700] xl:hidden"
            containerStyle={{ height: `${playbackOverlayHeight}px` }}
            isPlaybackMode={isPlaybackMode}
            isPlaying={isPlaybackRunning}
            isLoading={playbackLoading}
            error={playbackError}
            timezone={timezone}
            startMs={playbackWindowStartMs}
            endMs={playbackWindowEndMs}
            cursorMs={playbackCursorMs ?? playbackWindowStartMs}
            speed={playbackSpeed}
            buckets={playbackBuckets}
            totalThreats={totalPlaybackThreats}
            onStartPlayback={handleStartPlayback}
            onTogglePlay={() => setIsPlaybackRunning((previous) => !previous)}
            onSeek={handleSeek}
            onSeekRelative={handleSeekRelative}
            onSpeedChange={setPlaybackSpeed}
          />
        )}

        <div className="absolute inset-x-4 bottom-4 z-[600] xl:hidden">
          <LiveAlerts onAlertClick={handleLiveAlertClick} />
        </div>
      </div>
    </div>
  );
}