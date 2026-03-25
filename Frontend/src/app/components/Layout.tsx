import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { 
  Menu, 
  LayoutDashboard, 
  AlertTriangle, 
  Radio, 
  BarChart3, 
  User,
  Shield
} from 'lucide-react';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full transition-all duration-300 ease-in-out z-50"
        style={{
          width: sidebarOpen ? '220px' : '60px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Hamburger Menu - Top of Sidebar */}
          <div className="flex justify-center py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded transition-all duration-200"
              style={{ color: 'var(--accent-cyan)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(2, 132, 199, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Menu size={24} />
            </button>
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
                  className="flex items-center gap-3 px-4 py-3 transition-all duration-200 relative group"
                  style={{
                    color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--accent-cyan)';
                      e.currentTarget.style.background = '#F0F9FF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {active && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ background: 'var(--accent-cyan)' }}
                    />
                  )}
                  <Icon size={20} />
                  {sidebarOpen && (
                    <span className="font-ui" style={{ fontSize: '1.00625rem', fontWeight: 500 }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile Icon - Bottom of Sidebar */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            {sidebarOpen ? (
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 transition-all duration-200 rounded p-2"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F9FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <User size={20} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div 
                    className="font-medium truncate" 
                    style={{ fontSize: '1.00625rem', color: 'var(--text-primary)' }}
                  >
                    Admin User
                  </div>
                  <div 
                    className="truncate" 
                    style={{ fontSize: '0.865rem', color: 'var(--text-secondary)' }}
                  >
                    Security Operator
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex justify-center transition-all duration-200 rounded p-2"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F9FF';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.color = 'var(--accent-cyan)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) {
                    (icon as SVGElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <User size={24} style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="flex-1 transition-all duration-300 flex flex-col"
        style={{
          marginLeft: sidebarOpen ? '220px' : '60px',
        }}
      >
        {/* Header */}
        <header
          className="h-16 flex items-center px-6 border-b sticky top-0 z-40 transition-shadow duration-200"
          style={{
            background: 'var(--bg-sidebar)',
            borderColor: 'var(--border-color)',
            boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <Shield size={28} style={{ color: 'var(--accent-cyan)' }} />
            <h1
              className="font-heading uppercase tracking-wide"
              style={{
                fontSize: '1.58125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
              }}
            >
              Real Time Threat Detection System
            </h1>
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