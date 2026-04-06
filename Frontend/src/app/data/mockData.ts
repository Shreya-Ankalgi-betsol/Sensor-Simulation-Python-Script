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
  threat: string;
  sensorId: string;
  sensorType: 'Radar' | 'Lidar';
  location: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
}

export interface LiveAlert extends Threat {
  isNew?: boolean;
}