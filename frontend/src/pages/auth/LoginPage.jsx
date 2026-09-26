import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ login_id: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid Login Id or Password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
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
          <h1 style={{ fontSize: '1.625rem', marginBottom: 4 }}>Welcome back</h1>
          <p className="text-muted text-sm">Sign in to your Invenza account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label required" htmlFor="login_id">Login ID</label>
            <input
              id="login_id"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="your_login_id"
              value={form.login_id}
              onChange={(e) => setForm({ ...form, login_id: e.target.value })}
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: '0.875rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  padding: 0, display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'hsla(0,80%,60%,0.1)',
              border: '1px solid hsla(0,80%,60%,0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? <div className="spinner" /> : <><LogIn size={18} /> Sign In</>}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <Link to="/forgot-password">Forgot password?</Link>
            <span style={{ margin: '0 var(--space-2)' }}>·</span>
            <Link to="/signup">Create account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
