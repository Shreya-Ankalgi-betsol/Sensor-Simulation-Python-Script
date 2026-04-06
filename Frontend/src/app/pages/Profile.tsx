import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NotificationBell } from '../components/NotificationBell';
import { useWebSocket } from '../context/WebSocketContext';
import { apiGet, apiPut, APIError } from '../services/apiClient';
import { UserOut } from '../types/api';

export function Profile() {
  const navigate = useNavigate();
  const { liveThreats } = useWebSocket();
  const [user, setUser] = useState<UserOut | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const users = await apiGet<UserOut[]>('/api/v1/users');
        if (users && users.length > 0) {
          const currentUser = users[0]; // Get first user (current user)
          setUser(currentUser);
          setFormData(prev => ({
            ...prev,
            username: currentUser.username,
            email: currentUser.email,
          }));
        }
      } catch (err) {
        const message = err instanceof APIError ? err.message : 'Failed to load user data';
        setError(message);
        console.error('[Profile] Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSaveChanges = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      if (!user) return;

      await apiPut(`/api/v1/users/${user.user_id}`, {
        username: formData.username,
        email: formData.email,
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to update profile';
      setError(message);
      console.error('[Profile] Error updating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      if (!user) return;

      await apiPut(`/api/v1/users/${user.user_id}/change-password`, {
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
      });

      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof APIError ? err.message : 'Failed to change password';
      setError(message);
      console.error('[Profile] Error changing password:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    // Clear auth token and redirect to login
    localStorage.removeItem('token');
    navigate('/');
  };
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Notification Bell */}
      <NotificationBell liveThreats={liveThreats} />

      {loading ? (
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4"
            style={{ borderColor: '#0284C7' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Loading profile...
          </p>
        </div>
      ) : (
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

        {/* Error Message */}
        {error && (
          <div
            className="p-3 rounded-lg mb-6 text-sm"
            style={{
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div
            className="p-3 rounded-lg mb-6 text-sm"
            style={{
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#166534',
            }}
          >
            ✅ {successMessage}
          </div>
        )}

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
            {user ? user.username.substring(0, 2).toUpperCase() : 'AU'}
          </div>
        </div>

        {/* Username Field */}
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
            USERNAME
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

        {/* Email Field */}
        <div className="mb-6">
          <Label
            htmlFor="email"
            className="uppercase mb-2 block"
            style={{
              fontSize: '0.865rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            EMAIL
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

        {/* Save Changes Button */}
        <button
          onClick={handleSaveChanges}
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg mb-6 transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'var(--accent-cyan)',
            color: '#FFFFFF',
            fontSize: '1.00625rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) e.currentTarget.style.background = '#0369A1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-cyan)';
          }}
        >
          {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
        </button>

        {/* Divider */}
        <div
          className="h-px mb-6"
          style={{ background: 'var(--border-color)' }}
        />

        {/* Change Password Section */}
        <div className="mb-6">
          <h3
            className="font-heading mb-4"
            style={{
              fontSize: '1.00625rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            CHANGE PASSWORD
          </h3>

          {/* Old Password */}
          <div className="mb-4">
            <Label
              htmlFor="oldPassword"
              className="uppercase mb-2 block text-xs"
              style={{
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Current Password
            </Label>
            <Input
              id="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
              placeholder="Enter current password"
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

          {/* New Password */}
          <div className="mb-4">
            <Label
              htmlFor="newPassword"
              className="uppercase mb-2 block text-xs"
              style={{
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Enter new password"
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

          {/* Confirm Password */}
          <div className="mb-4">
            <Label
              htmlFor="confirmPassword"
              className="uppercase mb-2 block text-xs"
              style={{
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
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

          {/* Change Password Button */}
          <button
            onClick={handleChangePassword}
            disabled={isSubmitting || !formData.oldPassword || !formData.newPassword}
            className="w-full py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
            style={{
              background: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#15803D';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16A34A';
            }}
          >
            {isSubmitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </div>

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
            border: '1px solid #DC2626',
            color: '#DC2626',
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
      )}

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