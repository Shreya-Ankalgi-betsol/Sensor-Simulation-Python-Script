import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NotificationBell } from '../components/NotificationBell';

export function Profile() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: 'admin@threatwatch.io',
    password: '••••••••',
  });

  const handleSaveChanges = () => {
    // Save changes logic here
    console.log('Saved:', formData);
  };

  const handleLogout = () => {
    // Logout logic here
    console.log('Logged out');
    setIsLogoutModalOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Notification Bell */}
      <NotificationBell />

      <div
        className="w-full max-w-[480px] rounded-xl p-10"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Breadcrumb */}
        <div
          className="mb-4"
          style={{
            fontSize: '0.865rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Dashboard / Profile
        </div>

        {/* Page Title */}
        <h1
          className="font-heading mb-8"
          style={{
            fontSize: '2.01875rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          PROFILE
        </h1>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div
            className="w-18 h-18 rounded-full flex items-center justify-center"
            style={{
              width: '72px',
              height: '72px',
              background: 'var(--bg-hover)',
              border: '3px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              fontSize: '1.725rem',
              fontWeight: 700,
            }}
          >
            AU
          </div>
        </div>

        {/* Username/Email Field */}
        <div className="mb-4">
          <Label
            htmlFor="username"
            className="uppercase mb-2 block"
            style={{
              fontSize: '0.865rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            USERNAME / EMAIL
          </Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              padding: '0.71875rem 0.865rem',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          />
        </div>

        {/* Password Field */}
        <div className="mb-6">
          <Label
            htmlFor="password"
            className="uppercase mb-2 block"
            style={{
              fontSize: '0.865rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            PASSWORD
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                padding: '0.71875rem 2.875rem 0.71875rem 0.865rem',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Save Changes Button */}
        <button
          onClick={handleSaveChanges}
          className="w-full py-3 rounded-lg mb-6 transition-all duration-200"
          style={{
            background: 'var(--accent-cyan)',
            color: '#FFFFFF',
            fontSize: '1.00625rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0369A1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-cyan)';
          }}
        >
          SAVE CHANGES
        </button>

        {/* Divider */}
        <div
          className="h-px mb-6"
          style={{ background: 'var(--border-color)' }}
        />

        {/* Logout Button */}
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
          style={{
            border: '1px solid var(--danger-red)',
            color: 'var(--danger-red)',
            background: 'transparent',
            fontSize: '1.00625rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={18} />
          LOGOUT
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--danger-red)',
            borderRadius: '12px',
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="font-heading"
              style={{
                fontSize: '1.725rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              LOGOUT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to logout?
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: '1.00625rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.color = 'var(--accent-cyan)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded transition-all duration-200"
                style={{
                  fontSize: '1.00625rem',
                  fontWeight: 600,
                  background: 'var(--danger-red)',
                  color: '#FFFFFF',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#B91C1C';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--danger-red)';
                }}
              >
                LOGOUT
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}