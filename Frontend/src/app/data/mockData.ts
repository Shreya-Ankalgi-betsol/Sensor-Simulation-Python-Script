export interface TickerMessage {
  text: string;
  color: string;
  icon: string;
}

export const tickerMessages: TickerMessage[] = [
  { icon: '⚠️', text: 'High-speed object detected at 120 mph', color: '#ff6b6b' },
  { icon: '🎯', text: 'Radar signature matched in database', color: '#ffd93d' },
  { icon: '📍', text: 'Lidar confirms threat location', color: '#6bcf7f' },
  { icon: '🚨', text: 'Multiple sensors converging on target', color: '#ff6b6b' },
  { icon: '✓', text: 'Threat classification: Vehicle', color: '#4dabf7' },
];