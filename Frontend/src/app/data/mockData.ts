export interface Sensor {
  id: string;
  type: 'Radar' | 'Lidar';
  status: 'Active' | 'Offline' | 'Error';
  location: string;
  lastUpdated: string;
  position: { x: number; y: number }; // Map coordinates (percentage)
  coverageRadius: number; // in percentage
}

export interface Threat {
  id: string;
  type: 'Drone' | 'Trespassing' | 'Temperature' | 'Weapon';
  sensorId: string;
  sensorType: 'Radar' | 'Lidar';
  location: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
  description: string;
}

export interface LiveAlert extends Threat {
  isNew?: boolean;
}

export const sensors: Sensor[] = [
  {
    id: 'R-001',
    type: 'Radar',
    status: 'Active',
    location: 'North Gate',
    lastUpdated: '18 Mar 2025, 14:32',
    position: { x: 50, y: 20 },
    coverageRadius: 15,
  },
  {
    id: 'R-002',
    type: 'Radar',
    status: 'Active',
    location: 'South Perimeter',
    lastUpdated: '18 Mar 2025, 14:30',
    position: { x: 50, y: 80 },
    coverageRadius: 15,
  },
  {
    id: 'R-003',
    type: 'Radar',
    status: 'Error',
    location: 'Main Entry',
    lastUpdated: '18 Mar 2025, 13:55',
    position: { x: 20, y: 50 },
    coverageRadius: 15,
  },
  {
    id: 'L-001',
    type: 'Lidar',
    status: 'Active',
    location: 'Server Room',
    lastUpdated: '18 Mar 2025, 14:31',
    position: { x: 70, y: 35 },
    coverageRadius: 12,
  },
  {
    id: 'L-002',
    type: 'Lidar',
    status: 'Active',
    location: 'East Fence',
    lastUpdated: '18 Mar 2025, 14:28',
    position: { x: 80, y: 50 },
    coverageRadius: 12,
  },
  {
    id: 'L-003',
    type: 'Lidar',
    status: 'Offline',
    location: 'West Wall',
    lastUpdated: '18 Mar 2025, 11:10',
    position: { x: 30, y: 70 },
    coverageRadius: 12,
  },
];

export const threats: Threat[] = [
  {
    id: 'T-001',
    type: 'Drone',
    sensorId: 'R-001',
    sensorType: 'Radar',
    location: 'North Gate',
    severity: 'High',
    timestamp: '18 Mar 2025, 14:32:10',
    description: 'Unidentified aerial object detected',
  },
  {
    id: 'T-002',
    type: 'Trespassing',
    sensorId: 'L-002',
    sensorType: 'Lidar',
    location: 'East Fence',
    severity: 'Medium',
    timestamp: '18 Mar 2025, 14:28:45',
    description: 'Human movement detected in restricted area',
  },
  {
    id: 'T-003',
    type: 'Weapon',
    sensorId: 'R-003',
    sensorType: 'Radar',
    location: 'Main Entry',
    severity: 'High',
    timestamp: '18 Mar 2025, 14:25:33',
    description: 'Weapon signature detected',
  },
  {
    id: 'T-004',
    type: 'Temperature',
    sensorId: 'L-001',
    sensorType: 'Lidar',
    location: 'Server Room',
    severity: 'Low',
    timestamp: '18 Mar 2025, 14:20:12',
    description: 'Temperature spike detected',
  },
  {
    id: 'T-005',
    type: 'Drone',
    sensorId: 'R-002',
    sensorType: 'Radar',
    location: 'South Perimeter',
    severity: 'High',
    timestamp: '18 Mar 2025, 14:15:55',
    description: 'Drone activity near perimeter',
  },
  {
    id: 'T-006',
    type: 'Trespassing',
    sensorId: 'L-003',
    sensorType: 'Lidar',
    location: 'West Wall',
    severity: 'Medium',
    timestamp: '18 Mar 2025, 14:10:22',
    description: 'Unauthorized access attempt',
  },
  {
    id: 'T-007',
    type: 'Drone',
    sensorId: 'R-001',
    sensorType: 'Radar',
    location: 'North Gate',
    severity: 'High',
    timestamp: '18 Mar 2025, 14:05:18',
    description: 'Multiple drones detected',
  },
  {
    id: 'T-008',
    type: 'Trespassing',
    sensorId: 'L-002',
    sensorType: 'Lidar',
    location: 'East Fence',
    severity: 'Medium',
    timestamp: '18 Mar 2025, 14:00:44',
    description: 'Perimeter breach detected',
  },
];

// Chart data
export const threatsOverTime = [
  { time: '08:00', count: 2 },
  { time: '09:00', count: 5 },
  { time: '10:00', count: 3 },
  { time: '11:00', count: 7 },
  { time: '12:00', count: 4 },
  { time: '13:00', count: 9 },
  { time: '14:00', count: 12 },
  { time: '15:00', count: 8 },
];

export const threatsByLocation = [
  { location: 'North Gate', count: 12 },
  { location: 'East Fence', count: 8 },
  { location: 'Main Entry', count: 7 },
  { location: 'Server Room', count: 5 },
  { location: 'South Perimeter', count: 9 },
  { location: 'West Wall', count: 6 },
];

export const threatTypeDistribution = [
  { name: 'Drone', value: 18, color: '#FF3B3B' },
  { name: 'Trespassing', value: 15, color: '#FF9F0A' },
  { name: 'Temperature', value: 8, color: '#FFCC00' },
  { name: 'Weapon', value: 6, color: '#CC0000' },
];

export const sensorActivityHeatmap = [
  { sensor: 'R-001', hours: [0, 2, 1, 3, 2, 4, 5, 3, 7, 6, 8, 9, 10, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { sensor: 'R-002', hours: [1, 1, 0, 2, 3, 5, 4, 6, 5, 7, 9, 8, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
  { sensor: 'R-003', hours: [0, 0, 1, 1, 2, 3, 2, 4, 3, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0] },
  { sensor: 'L-001', hours: [2, 1, 3, 2, 4, 3, 5, 6, 7, 8, 9, 10, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
  { sensor: 'L-002', hours: [1, 2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { sensor: 'L-003', hours: [0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 5, 4, 3, 2, 1, 0, 1, 0, 0] },
];

// Scrolling alert messages for ticker
export const tickerMessages = [
  { icon: '⚠', text: 'HUMAN DETECTED', color: '#FF9F0A' },
  { icon: '🔴', text: 'DRONE DETECTED', color: '#FF3B3B' },
  { icon: '✅', text: 'ALL CLEAR', color: '#30D158' },
  { icon: '🔴', text: 'WEAPON DETECTED', color: '#FF3B3B' },
  { icon: '🟡', text: 'TEMPERATURE SPIKE', color: '#FFCC00' },
];