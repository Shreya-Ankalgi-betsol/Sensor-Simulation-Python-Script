import type { CSSProperties } from 'react';
import './dashboard.css';

type ModeToggleProps = {
  isPlaybackMode: boolean;
  playbackLoading: boolean;
  onToggle: (mode: 'live' | 'playback') => void | Promise<void>;
  containerClassName?: string;
  containerStyle?: CSSProperties;
};

export function ModeToggle({
  isPlaybackMode,
  playbackLoading,
  onToggle,
  containerClassName,
  containerStyle,
}: ModeToggleProps) {
  return (
    <div className={containerClassName ?? ''} style={containerStyle}>
      <div className="dashboard-mode-toggle relative inline-grid grid-cols-2 items-center rounded-full border p-1 shadow-lg backdrop-blur-md">
        <span
          className="dashboard-mode-toggle__indicator pointer-events-none absolute bottom-1 left-1 top-1 rounded-full transition-all duration-300 ease-out"
          style={{
            transform: isPlaybackMode ? 'translateX(100%)' : 'translateX(0)',
            background: isPlaybackMode ? 'rgba(2,132,199,0.14)' : 'rgba(22,163,74,0.14)',
          }}
        />
        <button
          type="button"
          onClick={() => void onToggle('live')}
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
          onClick={() => void onToggle('playback')}
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
  );
}
