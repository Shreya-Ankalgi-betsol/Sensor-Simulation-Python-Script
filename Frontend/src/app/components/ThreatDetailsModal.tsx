import { X, MapPin, Clock, Radio, AlertTriangle, Target, Gauge } from 'lucide-react';
import { ThreatLog } from '../types/api';

interface ThreatDetailsModalProps {
  threat: ThreatLog | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOnMap: () => void;
}

export function ThreatDetailsModal({ threat, isOpen, onClose, onViewOnMap }: ThreatDetailsModalProps) {
  if (!isOpen || !threat) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return { bg: 'rgba(220, 38, 38, 0.15)', border: '#DC2626', badge: 'bg-red-100 text-red-900' };
      case 'med':
      case 'medium':
        return { bg: 'rgba(234, 88, 12, 0.15)', border: '#EA580C', badge: 'bg-orange-100 text-orange-900' };
      case 'low':
        return { bg: 'rgba(22, 163, 74, 0.15)', border: '#16A34A', badge: 'bg-green-100 text-green-900' };
      default:
        return { bg: 'rgba(220, 38, 38, 0.15)', border: '#DC2626', badge: 'bg-red-100 text-red-900' };
    }
  };

  const severityColors = getSeverityColor(threat.severity);
  const detectionTime = new Date(threat.timestamp).toLocaleString();
  const confidencePercent = Math.round(threat.confidence * 100);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderColor: severityColors.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between border-b p-4"
          style={{ borderColor: severityColors.border }}
        >
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle size={24} style={{ color: severityColors.border }} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Threat Details
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {threat.threat_type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Close"
          >
            <X size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Severity Badge */}
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">
              Severity
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${severityColors.badge}`}>
              {threat.severity}
            </span>
          </div>

          {/* Detection Time */}
          <div className="flex items-start gap-3">
            <Clock size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                Detected At
              </p>
              <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                {detectionTime}
              </p>
            </div>
          </div>

          {/* Sensor Information */}
          <div className="flex items-start gap-3">
            <Radio size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                Detected By
              </p>
              <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                {threat.sensor_id} ({threat.sensor_type})
              </p>
            </div>
          </div>

          {/* Range */}
          {threat.object_range_m !== null && threat.object_range_m !== undefined && (
            <div className="flex items-start gap-3">
              <Gauge size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                  Range
                </p>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                  {Number(threat.object_range_m).toFixed(2)} meters
                </p>
              </div>
            </div>
          )}

          {/* Azimuth (Bearing) */}
          {threat.object_bearing_deg !== null && threat.object_bearing_deg !== undefined && (
            <div className="flex items-start gap-3">
              <Target size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                  Azimuth (Bearing)
                </p>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                  {Number(threat.object_bearing_deg).toFixed(2)}°
                </p>
              </div>
            </div>
          )}

          {/* Coordinates */}
          {threat.object_lat !== null && threat.object_lat !== undefined && threat.object_lng !== null && threat.object_lng !== undefined && (
            <div className="flex items-start gap-3">
              <MapPin size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                  Location
                </p>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                  {Number(threat.object_lat).toFixed(6)}, {Number(threat.object_lng).toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: 'var(--text-secondary)' }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium">
                Confidence
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${confidencePercent}%`,
                      backgroundColor: severityColors.border,
                    }}
                  />
                </div>
                <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold min-w-[45px]">
                  {confidencePercent}%
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {threat.track_id && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">Track ID: <span className="font-semibold">{threat.track_id}</span></p>
            </div>
          )}

          {threat.object_type && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">Object Type: <span className="font-semibold">{threat.object_type}</span></p>
            </div>
          )}

          {threat.object_state && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">Object State: <span className="font-semibold">{threat.object_state}</span></p>
            </div>
          )}

          {threat.alert_id && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-medium mb-1">Alert ID: <span className="font-semibold text-xs">{threat.alert_id}</span></p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 border-t p-4"
          style={{ borderColor: 'rgba(226,232,240,0.9)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              color: 'var(--text-primary)',
              backgroundColor: 'rgba(226,232,240,0.5)',
            }}
          >
            Close
          </button>
          <button
            onClick={onViewOnMap}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: severityColors.border }}
          >
            View on Map
          </button>
        </div>
      </div>
    </div>
  );
}
