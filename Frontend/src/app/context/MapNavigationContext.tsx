import { createContext, useContext, useState, ReactNode } from 'react';

export interface ZoomTarget {
  sensorId: string;
  lat: number;
  lng: number;
  zoomLevel?: number;
}

interface MapNavigationContextType {
  zoomTarget: ZoomTarget | null;
  setZoomTarget: (target: ZoomTarget | null) => void;
}

const MapNavigationContext = createContext<MapNavigationContextType | undefined>(undefined);

export function MapNavigationProvider({ children }: { children: ReactNode }) {
  const [zoomTarget, setZoomTarget] = useState<ZoomTarget | null>(null);

  return (
    <MapNavigationContext.Provider value={{ zoomTarget, setZoomTarget }}>
      {children}
    </MapNavigationContext.Provider>
  );
}

export function useMapNavigation() {
  const context = useContext(MapNavigationContext);
  if (!context) {
    throw new Error('useMapNavigation must be used within MapNavigationProvider');
  }
  return context;
}
