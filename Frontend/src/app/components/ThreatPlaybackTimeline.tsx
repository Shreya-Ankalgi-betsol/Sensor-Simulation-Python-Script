import { Loader2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import HeadlessUIDropdown from './HeadlessUIDropdown';

export type PlaybackBucket = {
  bucketStartMs: number;
  count: number;
};

type ThreatPlaybackTimelineProps = {
  isPlaybackMode: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  timezone: string;
  startMs: number;
  endMs: number;
  cursorMs: number;
  speed: number;
  buckets: PlaybackBucket[];
  totalThreats: number;
  onStartPlayback: () => void;
  onTogglePlay: () => void;
  onSeek: (nextMs: number) => void;
  onSeekRelative: (deltaMs: number) => void;
  onSpeedChange: (speed: number) => void;
};

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const SPEED_DROPDOWN_OPTIONS = SPEED_OPTIONS.map((option) => ({
  value: String(option),
  label: `${option}x`,
}));

const formatTimelineHourLabel = (timestampMs: number, timezone: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    timeZone: timezone,
  }).format(new Date(timestampMs));

const buildTimelineTicks = (startMs: number, endMs: number) => {
  const ticks: number[] = [];
  const cursor = new Date(startMs);
  cursor.setMinutes(0, 0, 0);

  if (cursor.getTime() < startMs) {
    cursor.setHours(cursor.getHours() + 1);
  }

  while (cursor.getTime() <= endMs) {
    ticks.push(cursor.getTime());
    cursor.setHours(cursor.getHours() + 2);
  }

  return ticks;
};

export function ThreatPlaybackTimeline({
  isPlaybackMode,
  isPlaying,
  isLoading,
  error,
  timezone,
  startMs,
  endMs,
  cursorMs,
  speed,
  buckets,
  totalThreats,
  onStartPlayback,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onSpeedChange,
}: ThreatPlaybackTimelineProps) {
  const clampedCursor = Math.min(endMs, Math.max(startMs, cursorMs));
  const progressRatio = endMs > startMs ? (clampedCursor - startMs) / (endMs - startMs) : 0;
  const timelineTicks = buildTimelineTicks(startMs, endMs);
  const displayTicks = timelineTicks.length > 0 ? timelineTicks : [startMs, endMs];
  const labelRangeMs = Math.max(1, endMs - startMs);

  return (
    <div className="h-full w-full px-0">
      <style>
        {`
          .playback-slider {
            -webkit-appearance: none;
            appearance: none;
            height: 3px;
            border-radius: 9999px;
            background: #D5E5F4;
            outline: none;
          }
          .playback-slider::-webkit-slider-runnable-track {
            height: 3px;
            border-radius: 9999px;
            background: linear-gradient(to right, #0EA5E9 var(--progress), #D5E5F4 var(--progress));
          }
          .playback-slider::-moz-range-track {
            height: 3px;
            border-radius: 9999px;
            background: #D5E5F4;
          }
          .playback-slider::-moz-range-progress {
            height: 3px;
            border-radius: 9999px;
            background: #0EA5E9;
          }
          .playback-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            background: #0EA5E9;
            border: 2px solid #FFFFFF;
            margin-top: -4.5px;
            cursor: pointer;
            box-shadow: 0 1px 6px rgba(2, 132, 199, 0.4);
          }
          .playback-slider::-moz-range-thumb {
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            background: #0EA5E9;
            border: 2px solid #FFFFFF;
            cursor: pointer;
            box-shadow: 0 1px 6px rgba(2, 132, 199, 0.4);
          }
        `}
      </style>

      <div className="flex h-full items-center gap-2.5 px-0">
        <div className="min-w-[122px]">
          <div className="text-[0.75rem]" style={{ color: '#5F7992' }}>
            Last 12 Hours
          </div>

          {isPlaybackMode ? (
            <div className="mt-1.5 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSeekRelative(-15 * 60 * 1000)}
                className="inline-flex h-7 w-7 items-center justify-center rounded transition"
                style={{ color: '#5F7992' }}
                title="Back 15 minutes"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #0EA5E9 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 6px 12px rgba(2, 132, 199, 0.3)',
                }}
                title={isPlaying ? 'Pause playback' : 'Play playback'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => onSeekRelative(15 * 60 * 1000)}
                className="inline-flex h-7 w-7 items-center justify-center rounded transition"
                style={{ color: '#5F7992' }}
                title="Forward 15 minutes"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={onStartPlayback}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-[0.8rem] font-semibold transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(180deg, #0EA5E9 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 6px 12px rgba(2, 132, 199, 0.28)',
                }}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Start Playback
              </button>
              {error && <span className="text-[0.72rem] text-red-600">{error}</span>}
            </div>
          )}
        </div>

        {isPlaybackMode ? (
          <>
            <div className="min-w-0 flex-1">
              <div
                className="relative mb-0.5 h-4 font-heading text-[0.5rem] leading-none tracking-[0.04em]"
                style={{
                  color: '#5F7992',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                }}
              >
                {displayTicks.map((tickMs) => (
                  <span
                    key={tickMs}
                    className="absolute top-0 truncate whitespace-nowrap"
                    style={{
                      left: `${((tickMs - startMs) / labelRangeMs) * 100}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {formatTimelineHourLabel(tickMs, timezone)}
                  </span>
                ))}
                <span
                  className="absolute right-0 top-0 whitespace-nowrap"
                  style={{
                    transform: 'translateX(16px)',
                    color: '#0369A1',
                    fontWeight: 700,
                  }}
                >
                  Now
                </span>
              </div>
              <input
                type="range"
                min={startMs}
                max={endMs}
                step={1000}
                value={clampedCursor}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="playback-slider w-full"
                style={{ ['--progress' as string]: `${progressRatio * 100}%` }}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5" style={{ marginTop: '8px' }}>
              <span
                className="rounded-full border px-2 py-0.5 text-[0.66rem] font-semibold"
                style={{
                  background: 'rgba(14,165,233,0.14)',
                  color: '#0369A1',
                  borderColor: 'rgba(14,165,233,0.32)',
                }}
              >
                {totalThreats} threats
              </span>
              <div className="w-[92px]">
                <HeadlessUIDropdown
                  value={String(speed)}
                  onChange={(value) => onSpeedChange(Number(value))}
                  options={SPEED_DROPDOWN_OPTIONS}
                  placeholder="Speed"
                  compact
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
