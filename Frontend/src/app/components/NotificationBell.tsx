import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ThreatLog } from '../types/api';
import { useActiveTab } from '../context/ActiveTabContext';

interface Notification {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: string;
  isRead: boolean;
}

interface NotificationBellProps {
  liveThreats?: ThreatLog[];
  enableToasts?: boolean;
  clearOnMarkAllRead?: boolean;
}

export function NotificationBell({
  liveThreats = [],
  enableToasts = true,
  clearOnMarkAllRead = false,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const { setActiveTab } = useActiveTab();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set()); // Use ref to track seen IDs without triggering re-renders
  const hasInitializedRef = useRef(false);
  const bellAlertTimeoutRef = useRef<number | null>(null);
  
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const triggerBellAlert = () => {
    setIsAlerting(true);

    if (bellAlertTimeoutRef.current !== null) {
      window.clearTimeout(bellAlertTimeoutRef.current);
    }

    bellAlertTimeoutRef.current = window.setTimeout(() => {
      setIsAlerting(false);
      bellAlertTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (bellAlertTimeoutRef.current !== null) {
        window.clearTimeout(bellAlertTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (liveThreats.length === 0) return;

    // First run only: seed existing threats silently so only later threats appear as new.
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      liveThreats.forEach((t) => seenIdsRef.current.add(t.alert_id));
      
      const initialNotifications: Notification[] = liveThreats.slice(0, 10).map((t) => ({
        id: t.alert_id,
        type: t.threat_type,
        description: `${t.threat_type} detected by ${t.sensor_id}`,
        timestamp: t.timestamp,
        severity: t.severity,
        isRead: true,
      }));
      setNotifications(initialNotifications);
      return;
    }

    // After init — only process genuinely new threats
    liveThreats.forEach((threat) => {
      if (!seenIdsRef.current.has(threat.alert_id)) {
        seenIdsRef.current.add(threat.alert_id);

        const newNotification: Notification = {
          id: threat.alert_id,
          type: threat.threat_type,
          description: `${threat.threat_type} detected by ${threat.sensor_id}`,
          timestamp: threat.timestamp,
          severity: threat.severity,
          isRead: false,
        };

        setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
        triggerBellAlert();
        if (enableToasts) {
          setToasts((prev) => [...prev, newNotification]);

          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== threat.alert_id));
          }, 5000);
        }
      }
    });
  }, [liveThreats, enableToasts]); // Only depend on liveThreats to avoid re-render loops

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'critical':
        return '#DC2626';
      case 'med':
      case 'medium':
        return '#D97706';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const markAllAsRead = () => {
    if (clearOnMarkAllRead) {
      setNotifications([]);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <>
      {/* Bell Icon with Badge */}
      <div
        className="fixed z-[300]"
        style={{ top: '20px', right: '20px' }}
      >
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 rounded-2xl transition-all duration-200 shadow-sm"
          style={{
            background: isAlerting ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.95)',
            border: isAlerting ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(226,232,240,0.9)',
            color: isAlerting ? '#B91C1C' : 'var(--accent-cyan)',
            animation: isAlerting ? 'bellBlink 0.8s ease-in-out infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            if (isAlerting) return;
            e.currentTarget.style.background = 'rgba(14,165,233,0.08)';
            e.currentTarget.style.borderColor = 'rgba(14,165,233,0.35)';
          }}
          onMouseLeave={(e) => {
            if (isAlerting) return;
            e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
            e.currentTarget.style.borderColor = 'rgba(226,232,240,0.9)';
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <div
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                minWidth: '18px',
                height: '18px',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0 4px',
              }}
            >
              {unreadCount}
            </div>
          )}
        </button>

        {/* Notification Panel Dropdown */}
        {showPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[250]"
              onClick={() => setShowPanel(false)}
            />
            
            {/* Panel */}
            <div
              className="absolute right-0 top-full mt-2 z-[260] rounded-3xl shadow-lg overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(226,232,240,0.9)',
                width: '340px',
                maxHeight: '520px',
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(14px)',
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'rgba(226,232,240,0.9)' }}
              >
                <span
                  className="uppercase tracking-wider"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.2em',
                  }}
                >
                  NOTIFICATIONS
                </span>
                <button
                  onClick={markAllAsRead}
                  className="transition-colors"
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Mark all as read
                </button>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div
                    className="px-4 py-8 text-center"
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-4 py-4 border-b transition-colors cursor-pointer group"
                      style={{
                        background: notification.isRead ? 'rgba(255,255,255,0.92)' : 'rgba(239,246,255,0.95)',
                        borderColor: 'rgba(226,232,240,0.9)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(240,249,255,0.95)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = notification.isRead ? 'rgba(255,255,255,0.92)' : 'rgba(239,246,255,0.95)';
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {/* Severity Dot */}
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ background: getSeverityColor(notification.severity) }}
                        />
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="mb-1"
                            style={{
                              fontSize: '1.00625rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {notification.type}
                          </div>
                          <div
                            className="mb-1"
                            style={{
                              fontSize: '0.865rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {notification.description}
                          </div>
                          <div
                            style={{
                              fontSize: '0.71875rem',
                              color: '#9CA3AF',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {notification.timestamp?.split(',')[1]?.trim() || notification.timestamp || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Close Button */}
                        <button
                          onClick={() => {
                            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                          }}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            cursor: 'pointer',
                            color: '#9CA3AF'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#1E293B';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#9CA3AF';
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-4 border-t"
                style={{ borderColor: 'rgba(226,232,240,0.9)' }}
              >
                <button
                  onClick={() => {
                    setShowPanel(false);
                    setActiveTab('logs');
                    navigate('/threats');
                  }}
                  className="w-full py-2.5 rounded-full transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 14px 28px rgba(14,165,233,0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  View All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast Notifications using Portal */}
      {createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: 'rgba(255,255,255,0.97)',
                width: '340px',
                borderLeft: `4px solid ${getSeverityColor(toast.severity)}`,
                borderRadius: '18px',
                boxShadow: '0 18px 34px rgba(15, 23, 42, 0.12)',
                padding: '14px',
                animation: 'slideInToast 0.3s ease-out',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
                border: '1px solid rgba(226,232,240,0.9)',
                backdropFilter: 'blur(12px)',
                pointerEvents: 'auto',
              }}
            >
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                  {toast.type} Detected
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>
                  {toast.description}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  {toast.timestamp}
                </div>
              </div>

              {/* Close Button - Smaller */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#CBD5E1', 
                  fontSize: '16px', 
                  lineHeight: '1',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: '18px',
                  height: '18px',
                  borderRadius: '3px',
                  transition: 'all 0.2s ease',
                  marginTop: '-2px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#CBD5E1';
                }}
                title="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes bellBlink {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 0 8px rgba(220, 38, 38, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
          }
        }

        @keyframes slideInToast {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
