import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSensors } from '../context/SensorContext';

export function ThreatMap() {
  const { sensorList } = useSensors();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const getSensorColor = (status: string) => {
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
      const color = getSensorColor(sensor.status);
      const key = `${sensor.lat.toFixed(6)},${sensor.lng.toFixed(6)}`;
      const duplicateIndex = seenCoordinates.get(key) ?? 0;
      seenCoordinates.set(key, duplicateIndex + 1);
      const displayPosition = buildDisplayedPosition(sensor, duplicateIndex);
      const isDuplicateCluster = (coordinateGroups.get(key) ?? 0) > 1;

      const icon = L.divIcon({
        className: 'sensor-map-icon',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px; transform: translateY(-2px);">
            <div style="
              min-width: 34px;
              height: 34px;
              padding: 0 8px;
              border-radius: 9999px;
              background: #fff;
              border: 3px solid ${color};
              color: ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 700;
              box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
            ">${sensor.sensor_type?.toLowerCase() === 'radar' ? '◉' : '⌖'}</div>
            <div style="
              background: rgba(255,255,255,0.96);
              color: #0f172a;
              border: 1px solid rgba(148,163,184,0.45);
              border-radius: 9999px;
              padding: 2px 8px;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(15,23,42,0.12);
            ">${sensor.sensor_id}${isDuplicateCluster ? ` • ${duplicateIndex + 1}` : ''}</div>
          </div>
        `,
        iconSize: [80, 54],
        iconAnchor: [40, 42],
        popupAnchor: [0, -34],
      });

      const marker = L.marker(displayPosition, { icon });

      marker.bindPopup(
        `
          <div style="min-width: 220px; font-family: var(--font-mono); color: #0f172a;">
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${sensor.sensor_id}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Type:</strong> ${sensor.sensor_type}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Location:</strong> ${sensor.location || 'Unknown'}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Status:</strong> ${sensor.status?.toUpperCase() || 'UNKNOWN'}</div>
            <div style="font-size: 13px;"><strong>Coverage:</strong> ${sensor.coverage_radius_m} m</div>
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
        opacity: 0.35,
        fillColor: color,
        fillOpacity: 0.08,
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
      className="relative h-full overflow-hidden rounded-lg"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div ref={mapContainerRef} className="h-full w-full" />

      <div
        className="absolute left-4 top-4 z-[500] rounded-lg border px-4 py-3 shadow-lg"
        style={{
          background: 'rgba(255,255,255,0.94)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.865rem' }}>Sensors from DB</div>
        <div style={{ fontSize: '1.29375rem', fontWeight: 700 }}>
          {sensorList.length} {sensorList.length === 1 ? 'Sensor' : 'Sensors'}
        </div>
      </div>
    </div>
  );
}