import { useMemo, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { 
  Menu, 
  LayoutDashboard, 
  AlertTriangle, 
  Radio, 
  BarChart3, 
  User,
  Shield,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useActiveTab } from '../context/ActiveTabContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { connectionStatus } = useWebSocket();
  const { activeTab, setActiveTab } = useActiveTab();

  // Reset activeTab when leaving the Threats page
  useEffect(() => {
    if (!location.pathname.startsWith('/threats')) {
      setActiveTab(null);
    }
  }, [location.pathname, setActiveTab]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Track header scroll for shadow effect
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrolled(target.scrollTop > 0);
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/threats', label: 'Threats', icon: AlertTriangle },
    { path: '/sensors', label: 'Sensors', icon: Radio },
    { path: '/visualization', label: 'Visualization', icon: BarChart3 },
  ];

  const currentPage = useMemo(() => {
    const match = navItems.find((item) => isActive(item.path));
    return match?.label ?? 'Profile';
  }, [location.pathname]);

  const statusMeta = {
    connecting: {
      label: 'Connecting',
      tone: '#D97706',
      bg: 'rgba(217, 119, 6, 0.12)',
      icon: Activity,
    },
    connected: {
      label: 'Live',
      tone: '#16A34A',
      bg: 'rgba(22, 163, 74, 0.12)',
      icon: Wifi,
    },
    disconnected: {
      label: 'Offline',
      tone: '#DC2626',
      bg: 'rgba(220, 38, 38, 0.12)',
      icon: WifiOff,
    },
  }[connectionStatus];

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'var(--bg-primary)',
      }}
    >
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full transition-all duration-300 ease-in-out z-50"
        style={{
          width: sidebarOpen ? '248px' : '72px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '12px 0 40px rgba(15, 23, 42, 0.16)',
        }}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.24), rgba(59,130,246,0.18))' }}
                >
                  <Shield size={20} style={{ color: '#E0F2FE' }} />
                </div>
                {sidebarOpen && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold tracking-[0.18em] uppercase" style={{ color: '#F8FAFC' }}>
                      Sentinel Grid
                    </div>
                    <div className="truncate text-xs" style={{ color: 'rgba(226,232,240,0.72)' }}>
                      Real-time threat operations
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 transition-colors"
                style={{ color: '#E2E8F0' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Menu size={20} />
              </button>
            </div>

            {sidebarOpen && (
              <div
                className="mt-4 rounded-xl border px-3 py-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="text-[0.68rem] uppercase tracking-[0.22em]" style={{ color: 'rgba(226,232,240,0.6)' }}>
                  System Status
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium" style={{ color: '#F8FAFC' }}>
                  <statusMeta.icon size={16} color={statusMeta.tone} />
                  {statusMeta.label}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="mx-3 mb-2 flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 relative group"
                  style={{
                    color: active ? '#0F172A' : 'rgba(226,232,240,0.82)',
                    background: active ? 'rgba(255,255,255,0.92)' : 'transparent',
                    boxShadow: active ? '0 10px 24px rgba(15, 23, 42, 0.22)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = '#F8FAFC';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'rgba(226,232,240,0.82)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {active && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                      style={{ background: '#0EA5E9' }}
                    />
                  )}
                  <Icon size={18} />
                  {sidebarOpen && (
                    <span className="font-ui" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile Icon - Bottom of Sidebar */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {sidebarOpen ? (
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 transition-all duration-200 rounded-xl p-2"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(14,165,233,0.18)' }}
                >
                  <User size={20} style={{ color: '#E0F2FE' }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div 
                    className="font-medium truncate" 
                    style={{ fontSize: '0.95rem', color: '#F8FAFC' }}
                  >
                    Admin User
                  </div>
                  <div 
                    className="truncate" 
                    style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}
                  >
                    Security Operator
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex justify-center transition-all duration-200 rounded-xl p-2"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.color = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.color = 'rgba(226,232,240,0.82)';
                  }
                }}
              >
                <User size={24} style={{ color: 'rgba(226,232,240,0.82)', transition: 'color 0.2s' }} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="flex-1 transition-all duration-300 flex flex-col"
        style={{
          marginLeft: sidebarOpen ? '248px' : '72px',
        }}
      >
        {/* Header */}
        <header
          className="h-20 flex items-center px-6 border-b sticky top-0 z-40 transition-shadow duration-200"
          style={{
            background: 'rgba(255,255,255,0.76)',
            borderColor: 'rgba(226,232,240,0.9)',
            boxShadow: scrolled ? '0 8px 30px rgba(15, 23, 42, 0.08)' : 'none',
            backdropFilter: 'blur(14px)',
            paddingRight: '75px',
          }}
        >
          <div className="flex w-full items-center justify-start gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Shield size={24} style={{ color: 'var(--accent-cyan)' }} />
                <h1
                  className="font-heading"
                  style={{
                    fontSize: '1.55rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Real-time Threat Detection
                </h1>
              </div>
            </div>

            {activeTab !== 'logs' && (
              <div
                className="flex items-center gap-3 rounded-full border px-4 py-2 ml-auto"
                style={{
                  background: statusMeta.bg,
                  borderColor: 'rgba(226,232,240,0.9)',
                  color: statusMeta.tone,
                }}
              >
                <statusMeta.icon size={16} />
                <span className="text-sm font-semibold">{statusMeta.label}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto" onScroll={handleScroll}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}