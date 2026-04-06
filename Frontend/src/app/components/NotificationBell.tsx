import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ThreatLog } from '../types/api';

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
}

export function NotificationBell({ liveThreats = [] }: NotificationBellProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set()); // Use ref to track seen IDs without triggering re-renders
  
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (liveThreats.length === 0) return;

    // First time this runs — mark all existing threats as seen silently
    if (notifications.length === 0) {
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
      return; // stop here — no toasts on initial load
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
        setToasts((prev) => [...prev, newNotification]);

        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== threat.alert_id));
        }, 5000);
      }
    });
  }, [liveThreats]); // Only depend on liveThreats to avoid re-render loops

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
          className="relative p-2 rounded-lg transition-all duration-200"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-cyan)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
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
              className="absolute right-0 top-full mt-2 z-[260] rounded-lg shadow-lg overflow-hidden"
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                width: '320px',
                maxHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span
                  className="uppercase tracking-wider"
                  style={{
                    fontSize: '0.865rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-3 border-b transition-colors cursor-pointer group"
                    style={{
                      background: notification.isRead ? '#FFFFFF' : '#EFF6FF',
                      borderColor: 'var(--border-color)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F0F9FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notification.isRead ? '#FFFFFF' : '#EFF6FF';
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
                ))}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 border-t"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <button
                  onClick={() => {
                    setShowPanel(false);
                    navigate('/threats');
                  }}
                  className="w-full py-2 rounded transition-all duration-200"
                  style={{
                    background: 'var(--accent-cyan)',
                    color: '#FFFFFF',
                    fontSize: '1.00625rem',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#0369A1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent-cyan)';
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
            top: '80px',
            right: '20px',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                background: '#FFFFFF',
                width: '320px',
                borderLeft: `4px solid ${getSeverityColor(toast.severity)}`,
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                padding: '12px',
                animation: 'slideInToast 0.3s ease-out',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
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
        @keyframes slideInToast {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
