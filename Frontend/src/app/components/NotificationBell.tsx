import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { threats } from '../data/mockData';
import { useNavigate } from 'react-router';

interface Notification {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: 'High' | 'Medium' | 'Low';
  isRead: boolean;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Initialize with some notifications
  useEffect(() => {
    const initialNotifications: Notification[] = threats.slice(0, 10).map((t, idx) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      timestamp: t.timestamp,
      severity: t.severity,
      isRead: idx > 2, // First 3 are unread
    }));
    setNotifications(initialNotifications);
  }, []);

  // Simulate new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const randomThreat = threats[Math.floor(Math.random() * threats.length)];
      const newNotification: Notification = {
        id: `N-${Date.now()}`,
        type: randomThreat.type,
        description: randomThreat.description,
        timestamp: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        severity: randomThreat.severity,
        isRead: false,
      };

      // Add to notifications list
      setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);

      // Show toast
      setToasts((prev) => [...prev, newNotification]);

      // Auto-dismiss toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newNotification.id));
      }, 4000);
    }, 15000); // New notification every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#D97706';
      case 'Low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
                    className="px-4 py-3 border-b transition-colors cursor-pointer"
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
                          {notification.timestamp.split(',')[1]?.trim() || notification.timestamp}
                        </div>
                      </div>
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

      {/* Toast Notifications */}
      <div
        className="fixed z-[300] flex flex-col gap-2"
        style={{ top: '80px', right: '20px' }}
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="animate-in slide-in-from-right duration-300"
            style={{
              background: '#FFFFFF',
              width: '300px',
              borderLeft: `4px solid ${getSeverityColor(toast.severity)}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '12px 16px',
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div
                  className="mb-1"
                  style={{
                    fontSize: '1.00625rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {toast.type}
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontSize: '0.865rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {toast.description}
                </div>
                <div
                  style={{
                    fontSize: '0.71875rem',
                    color: '#9CA3AF',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {toast.timestamp.split(',')[1]?.trim() || toast.timestamp}
                </div>
              </div>
              
              {/* Close button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
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
