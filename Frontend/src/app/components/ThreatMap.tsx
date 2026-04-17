import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
// @ts-ignore - side-effect CSS import is resolved by bundler at runtime.
import 'leaflet/dist/leaflet.css';
import { useSensors } from '../context/SensorContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useMapNavigation } from '../context/MapNavigationContext';
import { ThreatLog } from '../types/api';

type ThreatMapProps = {
  playbackMode?: boolean;
  playbackCursorMs?: number | null;
  playbackThreats?: ThreatLog[];
  playbackDotWindowMs?: number;
};

export function ThreatMap({
  playbackMode = false,
  playbackCursorMs = null,
  playbackThreats = [],
  playbackDotWindowMs = 60 * 1000,
}: ThreatMapProps) {
  const { sensorList } = useSensors();
  const { liveThreats } = useWebSocket();
  const { zoomTarget, setZoomTarget, selectedThreat } = useMapNavigation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sensorLayerRef = useRef<L.LayerGroup | null>(null);
  const initialMapCenterRef = useRef<[number, number]>([15.8856, 74.52]);
  const sensorListRef = useRef(sensorList); // Keep sensor list in ref to avoid dependency triggers

  // Update sensor ref whenever sensorList changes (but don't trigger threat re-render)
  useEffect(() => {
    sensorListRef.current = sensorList;
  }, [sensorList]);
  const threatLayerRef = useRef<L.LayerGroup | null>(null);
  const lastSensorLayoutKeyRef = useRef<string>('');
  const activeWindowMs = 2 * 60 * 1000;
  const threatPointWindowMs = 8 * 1000;
  const threatFutureToleranceMs = 15 * 1000;
  const effectiveThreats = playbackMode ? playbackThreats : liveThreats;
  const referenceTimeMs = playbackMode && playbackCursorMs !== null ? playbackCursorMs : Date.now();

  const latestThreatBySensor = useMemo(() => {
    const threatMap = new Map<string, ThreatLog>();

    effectiveThreats.forEach((threat) => {
      const existing = threatMap.get(threat.sensor_id);
      if (!existing || new Date(threat.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        threatMap.set(threat.sensor_id, threat);
      }
    });

    return threatMap;
  }, [effectiveThreats]);

  const mapStats = useMemo(() => {
    const counts = {
      active: 0,
      threat: 0,
      offline: 0,
      error: 0,
    };

    sensorList.forEach((sensor) => {
      const latestThreat = latestThreatBySensor.get(sensor.sensor_id);
      const recentThreat = latestThreat
        ? referenceTimeMs - new Date(latestThreat.timestamp).getTime() <= activeWindowMs
        : false;

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
  }, [sensorList, latestThreatBySensor, referenceTimeMs]);

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

  const getThreatColor = (severity: string): string => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#DC2626'; // Red
      case 'med':
      case 'medium':
        return '#EA580C'; // Orange
      case 'low':
        return '#16A34A'; // Green
      default:
        return '#DC2626'; // Default to red
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

  useEffect(() => {
    if (sensorList.length === 0) {
      return;
    }

    const avgLat = sensorList.reduce((sum, sensor) => sum + sensor.lat, 0) / sensorList.length;
    const avgLng = sensorList.reduce((sum, sensor) => sum + sensor.lng, 0) / sensorList.length;
    initialMapCenterRef.current = [avgLat, avgLng];
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

  const formatRelativeTime = (timestamp: string, referenceMs: number) => {
    const deltaSeconds = Math.round((referenceMs - new Date(timestamp).getTime()) / 1000);
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

  const destinationFromSensor = (
    sensorLat: number,
    sensorLng: number,
    rangeM: number,
    bearingDeg: number
  ): [number, number] => {
    const earthRadiusM = 6378137;
    const sensorLatRad = (sensorLat * Math.PI) / 180;
    const bearingRad = (bearingDeg * Math.PI) / 180;

    const northM = rangeM * Math.cos(bearingRad);
    const eastM = rangeM * Math.sin(bearingRad);

    const dLatDeg = (northM / earthRadiusM) * (180 / Math.PI);
    const dLngDeg = (eastM / (earthRadiusM * Math.max(Math.cos(sensorLatRad), 1e-8))) * (180 / Math.PI);
    return [sensorLat + dLatDeg, sensorLng + dLngDeg];
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      preferCanvas: true,
      maxZoom: 22,
    }).setView(initialMapCenterRef.current, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 22,
      maxNativeZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    sensorLayerRef.current = L.layerGroup().addTo(map);
    threatLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      sensorLayerRef.current = null;
      threatLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = sensorLayerRef.current;

    if (!map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    const validSensors = sensorList.filter((sensor) => Number.isFinite(sensor.lat) && Number.isFinite(sensor.lng));

    if (validSensors.length === 0) {
      lastSensorLayoutKeyRef.current = '';
      map.setView(defaultCenter, 12);
      return;
    }

    const sensorLayoutKey = validSensors
      .map((sensor) => `${sensor.sensor_id}:${sensor.lat.toFixed(6)}:${sensor.lng.toFixed(6)}`)
      .sort()
      .join('|');
    const shouldAutoFrame = sensorLayoutKey !== lastSensorLayoutKeyRef.current;

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
      const hasRecentThreat = Boolean(
        latestThreat && referenceTimeMs - new Date(latestThreat.timestamp).getTime() <= activeWindowMs
      );
      const color = getSensorColor(sensor.status, hasRecentThreat);
      const key = `${sensor.lat.toFixed(6)},${sensor.lng.toFixed(6)}`;
      const duplicateIndex = seenCoordinates.get(key) ?? 0;
      seenCoordinates.set(key, duplicateIndex + 1);
      const displayPosition = buildDisplayedPosition(sensor, duplicateIndex);
      const isDuplicateCluster = (coordinateGroups.get(key) ?? 0) > 1;
      const sensorStateLabel = hasRecentThreat
        ? 'UNDER THREAT'
        : sensor.status?.toUpperCase() || 'UNKNOWN';
      const encodedSensorId = encodeURIComponent(sensor.sensor_id);

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
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Coverage:</strong> ${sensor.coverage_radius_m} m</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Last alert:</strong> ${latestThreat ? formatRelativeTime(latestThreat.timestamp, referenceTimeMs) : 'No recent activity'}</div>
            ${latestThreat ? `<div style="font-size: 13px;"><strong>Threat:</strong> ${latestThreat.threat_type} · ${latestThreat.severity.toUpperCase()}</div>` : ''}
            <div style="margin-top: 12px;">
              <a
                href="/threats?sensor_id=${encodedSensorId}"
                style="
                  display: inline-block;
                  text-decoration: none;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 0.04em;
                  color: #0369A1;
                  background: rgba(2, 132, 199, 0.1);
                  border: 1px solid rgba(2, 132, 199, 0.24);
                  border-radius: 9999px;
                  padding: 6px 10px;
                "
              >Show threat history</a>
            </div>
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

    if (!shouldAutoFrame) {
      return;
    }

    lastSensorLayoutKeyRef.current = sensorLayoutKey;

    if (validSensors.length === 1) {
      map.setView([validSensors[0].lat, validSensors[0].lng], 18);
      return;
    }

    map.fitBounds(bounds.pad(0.25), {
      animate: true,
      duration: 0.35,
      maxZoom: 16,
    });
  }, [sensorList, defaultCenter, latestThreatBySensor, referenceTimeMs]);

  // Render threat points on the map
  useEffect(() => {
    const threatLayer = threatLayerRef.current;
    if (!threatLayer) {
      return;
    }

    threatLayer.clearLayers();

    // Show only the most recent threat
    if (effectiveThreats.length === 0 && !selectedThreat) {
      return;
    }

    const frameReferenceMs = playbackMode && playbackCursorMs !== null ? playbackCursorMs : Date.now();
    const frameWindowMs = playbackMode ? playbackDotWindowMs : threatPointWindowMs;

    // If a threat is selected, only show that threat; otherwise show recent threats
    const threatsToDisplay = selectedThreat
      ? [selectedThreat]
      : effectiveThreats.filter((threat) => {
          const threatTimeMs = new Date(threat.timestamp).getTime();
          const ageMs = frameReferenceMs - threatTimeMs;

          if (playbackMode) {
            return ageMs >= 0 && ageMs <= frameWindowMs;
          }

          return ageMs >= -threatFutureToleranceMs && ageMs <= frameWindowMs;
        });

    const sensorById = new Map(sensorListRef.current.map((sensor) => [sensor.sensor_id, sensor]));

    threatsToDisplay.forEach((threat) => {
      const ageMs = Math.max(0, frameReferenceMs - new Date(threat.timestamp).getTime());
      const normalizedAge = selectedThreat ? 0 : Math.min(1, Math.max(0, ageMs / frameWindowMs));
      const fillOpacity = selectedThreat ? 0.95 : 0.95 - normalizedAge * 0.75;
      const strokeOpacity = selectedThreat ? 1.0 : 0.85 - normalizedAge * 0.65;
      const radius = selectedThreat ? 8 : 5 - normalizedAge * 2.2;
      
      // Get color based on threat severity
      const severityColor = getThreatColor(threat.severity);
      const fillColor = severityColor;
      const strokeColor = selectedThreat
        ? severityColor
        : `rgba(127, 29, 29, ${Math.max(0.2, strokeOpacity).toFixed(3)})`;

      const latFromPayload = threat.object_lat;
      const lngFromPayload = threat.object_lng;
      let point: [number, number] | null = null;

      if (
        typeof latFromPayload === 'number' &&
        Number.isFinite(latFromPayload) &&
        typeof lngFromPayload === 'number' &&
        Number.isFinite(lngFromPayload)
      ) {
        point = [latFromPayload, lngFromPayload];
      } else {
        const sensor = sensorById.get(threat.sensor_id);
        const rangeM = Number(threat.object_range_m);
        const bearingDeg = Number(threat.object_bearing_deg);

        if (
          sensor &&
          Number.isFinite(rangeM) &&
          Number.isFinite(bearingDeg)
        ) {
          point = destinationFromSensor(sensor.lat, sensor.lng, rangeM, bearingDeg);
        } else if (sensor) {
          point = [sensor.lat, sensor.lng];
        }
      }

      if (!point) {
        return;
      }

      L.circleMarker(point, {
        radius: Math.max(2.5, radius),
        color: strokeColor,
        weight: selectedThreat ? 3 : 1,
        fillColor: fillColor,
        fillOpacity: Math.max(0.15, fillOpacity),
      }).addTo(threatLayer);
    });
  }, [
    effectiveThreats,
    playbackCursorMs,
    playbackDotWindowMs,
    playbackMode,
    selectedThreat,
    threatFutureToleranceMs,
    threatPointWindowMs,
  ]);

  // Handle zoom to specific sensor
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomTarget) {
      return;
    }

    // Zoom to the target sensor with a default zoom level of 16
    const zoomLevel = zoomTarget.zoomLevel || 16;
    map.setView([zoomTarget.lat, zoomTarget.lng], zoomLevel, {
      animate: true,
      duration: 0.6,
    });

    // Clear the zoom target after zooming
    setTimeout(() => {
      setZoomTarget(null);
    }, 700);
  }, [zoomTarget, setZoomTarget]);

  // Handle zooming to selected threat
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedThreat) {
      return;
    }

    // Get threat location
    const threatLat = Number(selectedThreat.object_lat);
    const threatLng = Number(selectedThreat.object_lng);
    const sensor = sensorListRef.current.find(s => s.sensor_id === selectedThreat.sensor_id);

    let lat: number;
    let lng: number;

    if (Number.isFinite(threatLat) && Number.isFinite(threatLng)) {
      lat = threatLat;
      lng = threatLng;
    } else if (sensor) {
      lat = sensor.lat;
      lng = sensor.lng;
    } else {
      return;
    }

    // Zoom to threat location with zoom level 17
    map.setView([lat, lng], 17, {
      animate: true,
      duration: 0.6,
    });
  }, [selectedThreat]);

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