import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSensors } from '../context/SensorContext';
import { useWebSocket } from '../context/WebSocketContext';
import { ThreatLog } from '../types/api';

export function ThreatMap() {
  const { sensorList } = useSensors();
  const { liveThreats } = useWebSocket();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const activeWindowMs = 2 * 60 * 1000;

  const latestThreatBySensor = useMemo(() => {
    const threatMap = new Map<string, ThreatLog>();

    liveThreats.forEach((threat) => {
      const existing = threatMap.get(threat.sensor_id);
      if (!existing || new Date(threat.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        threatMap.set(threat.sensor_id, threat);
      }
    });

    return threatMap;
  }, [liveThreats]);

  const mapStats = useMemo(() => {
    const counts = {
      active: 0,
      threat: 0,
      offline: 0,
      error: 0,
    };

    const now = Date.now();

    sensorList.forEach((sensor) => {
      const latestThreat = latestThreatBySensor.get(sensor.sensor_id);
      const recentThreat = latestThreat ? now - new Date(latestThreat.timestamp).getTime() <= activeWindowMs : false;

      if (sensor.status?.toLowerCase() === 'error') {
        counts.error += 1;
      } else if (sensor.status?.toLowerCase() === 'inactive') {
        counts.offline += 1;
      } else if (recentThreat) {
        counts.threat += 1;
      } else {
        counts.active += 1;
      }
    });

    return counts;
  }, [sensorList, latestThreatBySensor]);

  const getSensorColor = (status: string, hasRecentThreat: boolean) => {
    if (hasRecentThreat) {
      return '#DC2626';
    }

    switch (status?.toLowerCase()) {
      case 'active':
        return '#16A34A';
      case 'error':
        return '#DC2626';
      case 'inactive':
      default:
        return '#64748B';
    }
  };

  const defaultCenter = useMemo<[number, number]>(() => {
    if (sensorList.length === 0) {
      return [15.8856, 74.52];
    }

    const avgLat = sensorList.reduce((sum, sensor) => sum + sensor.lat, 0) / sensorList.length;
    const avgLng = sensorList.reduce((sum, sensor) => sum + sensor.lng, 0) / sensorList.length;
    return [avgLat, avgLng];
  }, [sensorList]);

  const buildDisplayedPosition = (sensor: { sensor_id: string; lat: number; lng: number }, duplicatesIndex: number) => {
    if (duplicatesIndex === 0) {
      return [sensor.lat, sensor.lng] as [number, number];
    }

    const offsetDistance = 0.00035 + duplicatesIndex * 0.00012;
    const angle = (duplicatesIndex * 137.5 * Math.PI) / 180;

    return [
      sensor.lat + Math.sin(angle) * offsetDistance,
      sensor.lng + Math.cos(angle) * offsetDistance,
    ] as [number, number];
  };

  const formatRelativeTime = (timestamp: string) => {
    const deltaSeconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (deltaSeconds < 60) {
      return `${Math.max(deltaSeconds, 1)}s ago`;
    }

    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) {
      return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    return `${deltaHours}h ago`;
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      preferCanvas: true,
    }).setView(defaultCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [defaultCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = markersRef.current;

    if (!map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    const validSensors = sensorList.filter((sensor) => Number.isFinite(sensor.lat) && Number.isFinite(sensor.lng));

    if (validSensors.length === 0) {
      map.setView(defaultCenter, 12);
      return;
    }

    const bounds = L.latLngBounds([]);
    const coordinateGroups = new Map<string, number>();

    validSensors.forEach((sensor) => {
      const key = `${sensor.lat.toFixed(6)},${sensor.lng.toFixed(6)}`;
      const count = coordinateGroups.get(key) ?? 0;
      coordinateGroups.set(key, count + 1);
    });

    const seenCoordinates = new Map<string, number>();

    validSensors.forEach((sensor) => {
      const latestThreat = latestThreatBySensor.get(sensor.sensor_id);
      const hasRecentThreat = Boolean(latestThreat && Date.now() - new Date(latestThreat.timestamp).getTime() <= activeWindowMs);
      const color = getSensorColor(sensor.status, hasRecentThreat);
      const key = `${sensor.lat.toFixed(6)},${sensor.lng.toFixed(6)}`;
      const duplicateIndex = seenCoordinates.get(key) ?? 0;
      seenCoordinates.set(key, duplicateIndex + 1);
      const displayPosition = buildDisplayedPosition(sensor, duplicateIndex);
      const isDuplicateCluster = (coordinateGroups.get(key) ?? 0) > 1;
      const sensorStateLabel = hasRecentThreat
        ? 'UNDER THREAT'
        : sensor.status?.toUpperCase() || 'UNKNOWN';

      const icon = L.divIcon({
        className: 'sensor-map-icon',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; gap:5px; transform: translateY(-2px);">
            <div style="
              min-width: 38px;
              height: 38px;
              padding: 0 10px;
              border-radius: 9999px;
              background: ${hasRecentThreat ? 'rgba(255,255,255,0.98)' : '#fff'};
              border: 3px solid ${color};
              color: ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 15px;
              font-weight: 700;
              box-shadow: ${hasRecentThreat ? '0 0 0 6px rgba(220, 38, 38, 0.14), 0 12px 28px rgba(15, 23, 42, 0.18)' : '0 8px 24px rgba(15, 23, 42, 0.16)'};
            ">${sensor.sensor_type?.toLowerCase() === 'radar' ? '◉' : '⌖'}</div>
            <div style="
              background: ${hasRecentThreat ? 'rgba(220,38,38,0.95)' : 'rgba(255,255,255,0.96)'};
              color: ${hasRecentThreat ? '#fff' : '#0f172a'};
              border: 1px solid ${hasRecentThreat ? 'rgba(220,38,38,0.35)' : 'rgba(148,163,184,0.45)'};
              border-radius: 9999px;
              padding: 2px 8px;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(15,23,42,0.12);
            ">${sensor.sensor_id}${isDuplicateCluster ? ` • ${duplicateIndex + 1}` : ''}</div>
            <div style="
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.14em;
              color: ${color};
            ">${sensorStateLabel}</div>
          </div>
        `,
        iconSize: [88, 62],
        iconAnchor: [44, 48],
        popupAnchor: [0, -38],
      });

      const marker = L.marker(displayPosition, { icon });

      marker.bindPopup(
        `
          <div style="min-width: 240px; font-family: var(--font-mono); color: #0f172a;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 8px;">
              <div style="font-size: 16px; font-weight: 700;">${sensor.sensor_id}</div>
              <div style="padding: 3px 8px; border-radius: 9999px; background: ${hasRecentThreat ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)'}; color: ${color}; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;">${sensorStateLabel}</div>
            </div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Type:</strong> ${sensor.sensor_type}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Location:</strong> ${sensor.location || 'Unknown'}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Status:</strong> ${sensor.status?.toUpperCase() || 'UNKNOWN'}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Coverage:</strong> ${sensor.coverage_radius_m} m</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Last alert:</strong> ${latestThreat ? formatRelativeTime(latestThreat.timestamp) : 'No recent activity'}</div>
            ${latestThreat ? `<div style="font-size: 13px;"><strong>Threat:</strong> ${latestThreat.threat_type} · ${latestThreat.severity.toUpperCase()}</div>` : ''}
          </div>
        `,
        { closeButton: true, autoClose: false, closeOnClick: false }
      );

      marker.bindTooltip(`${sensor.sensor_id} · ${sensor.sensor_type.toUpperCase()}`, {
        permanent: true,
        direction: 'top',
        offset: [0, -18],
        className: 'sensor-id-tooltip',
        opacity: 1,
      });

      marker.addTo(layerGroup);

      L.circle(displayPosition, {
        radius: Math.max(sensor.coverage_radius_m || 50, 25),
        color,
        weight: 1.5,
        opacity: hasRecentThreat ? 0.55 : 0.35,
        fillColor: color,
        fillOpacity: hasRecentThreat ? 0.18 : 0.08,
      }).addTo(layerGroup);

      bounds.extend(displayPosition);
    });

    if (validSensors.length === 1) {
      map.setView([validSensors[0].lat, validSensors[0].lng], 15);
      return;
    }

    map.fitBounds(bounds.pad(0.25), {
      animate: true,
      duration: 0.35,
      maxZoom: 16,
    });
  }, [sensorList, defaultCenter]);

  return (
    <div
      className="relative h-full overflow-hidden rounded-3xl border shadow-sm"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.98))',
        borderColor: 'rgba(226,232,240,0.9)',
      }}
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      <div
        className="absolute right-4 top-4 z-[500] grid gap-2 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md"
        style={{
          background: 'rgba(255,255,255,0.94)',
          borderColor: 'rgba(226,232,240,0.9)',
        }}
      >
        {[
          { label: 'Active', value: mapStats.active, tone: '#16A34A' },
          { label: 'Threat', value: mapStats.threat, tone: '#DC2626' },
          { label: 'Offline', value: mapStats.offline, tone: '#64748B' },
          { label: 'Error', value: mapStats.error, tone: '#DC2626' },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.tone }} />
              {item.label}
            </div>
            <strong style={{ color: 'var(--text-primary)' }}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}