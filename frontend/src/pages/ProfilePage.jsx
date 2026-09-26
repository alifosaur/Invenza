import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabel = user.role === 'inventory_manager' ? 'Inventory Manager' : 'Warehouse Staff';
  const roleColor = user.role === 'inventory_manager' ? 'hsl(231,100%,65%)' : 'hsl(168,85%,48%)';

  const fields = [
    { icon: User, label: 'Login ID', value: user.login_id, mono: true },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Shield, label: 'Role', value: roleLabel, color: roleColor },
    { icon: Calendar, label: 'Member Since', value: format(new Date(user.created_at), 'dd MMM yyyy') },
  ];

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
        <div className="card">
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
      </div>
    </div>
  );
}
