import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { User, Mail, Shield, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const roleLabel = user.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff';
  const roleColor = user.role === 'inventory_manager' ? 'hsl(231,100%,65%)' : 'hsl(168,85%,48%)';

  const fields = [
    { icon: User, label: 'Login ID', value: user.login_id, mono: true },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Shield, label: 'Role', value: roleLabel, color: roleColor },
    { icon: Calendar, label: 'Member Since', value: format(new Date(user.created_at), 'dd MMM yyyy') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success('Password updated successfully');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Account details and preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: 560 }}>
        {/* Avatar card */}
        <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--bg-card)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 80,
            background: 'var(--gradient-brand)', opacity: 0.12,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <div style={{
              width: 72, height: 72,
              background: 'var(--gradient-brand)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 8px 24px hsla(231,100%,65%,0.35)',
              flexShrink: 0,
            }}>
              {user.login_id[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.375rem', marginBottom: 4 }}>{user.login_id}</h2>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 12px', borderRadius: 'var(--radius-full)',
                background: `${roleColor}18`,
                border: `1px solid ${roleColor}30`,
                color: roleColor, fontSize: '0.8125rem', fontWeight: 600,
              }}>
                <Shield size={12} /> {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Account Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {fields.map(({ icon: Icon, label, value, mono, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{
                    fontWeight: 500,
                    color: color || 'var(--text-primary)',
                    fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                  }}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password card */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Security
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label required">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                required
              />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <div className="spinner" /> : <><CheckCircle size={16} /> Update Password</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
