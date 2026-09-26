import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    login_id: '', email: '', password: '', re_password: '', role: 'warehouse_staff',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await authApi.signup(form);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const errs = {};
        detail.forEach((d) => {
          const field = d.loc?.[d.loc.length - 1];
          if (field) errs[field] = d.msg;
        });
        setErrors(errs);
      } else {
        setErrors({ general: detail || 'Signup failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label required" htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        className={`form-input ${errors[name] ? 'error' : ''}`}
        placeholder={placeholder}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required
      />
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--gradient-brand)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            boxShadow: '0 8px 24px hsla(231,100%,65%,0.4)',
            fontSize: '1.375rem', fontWeight: 800, color: '#fff',
          }}>Iz</div>
          <h1 style={{ fontSize: '1.625rem', marginBottom: 4 }}>Create account</h1>
          <p className="text-muted text-sm">Join Invenza to manage your inventory</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grid-2">
            {field('login_id', 'Login ID', 'text', 'user123')}
            <div className="form-group">
              <label className="form-label required" htmlFor="role">Role</label>
              <select
                id="role"
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="inventory_manager">Inventory Manager</option>
              </select>
            </div>
          </div>

          {field('email', 'Email', 'email', 'you@example.com')}

          <div className="form-group">
            <label className="form-label required" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min 8 chars, 1 upper, 1 special"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: '0.875rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          {field('re_password', 'Confirm Password', 'password', '••••••••')}

          {errors.general && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'hsla(0,80%,60%,0.1)',
              border: '1px solid hsla(0,80%,60%,0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: '0.875rem',
            }}>
              {errors.general}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            {loading ? <div className="spinner" /> : <><UserPlus size={18} /> Create Account</>}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
