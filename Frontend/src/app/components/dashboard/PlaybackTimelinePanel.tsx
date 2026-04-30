import type { ComponentProps, CSSProperties } from 'react';
import { ThreatPlaybackTimeline } from '../ThreatPlaybackTimeline';
import './dashboard.css';

type PlaybackTimelinePanelProps = ComponentProps<typeof ThreatPlaybackTimeline> & {
  containerClassName?: string;
  containerStyle?: CSSProperties;
};

export function PlaybackTimelinePanel({
  containerClassName,
  containerStyle,
  ...timelineProps
}: PlaybackTimelinePanelProps) {
  return (
    <div className={containerClassName ?? ''} style={containerStyle}>
      <div className="dashboard-playback-panel h-full border-t px-3">
        <ThreatPlaybackTimeline {...timelineProps} />
      </div>
    </div>
  );
}
