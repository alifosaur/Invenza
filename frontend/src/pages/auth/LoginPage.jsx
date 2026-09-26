import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, Shield, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Client-side rate limiter ─────────────────────────────────────────────
   Mirrors backend thresholds so the UI locks out BEFORE hitting the server.
   State persisted in sessionStorage so page refresh doesn't bypass it.
*/
const RL_KEY = 'invenza_login_rl';

const LOCKOUT_TIERS = [
  { after: 3, seconds: 30 },
  { after: 5, seconds: 300 },
  { after: 10, seconds: 1800 },
];

function getRLState() {
  try {
    return JSON.parse(sessionStorage.getItem(RL_KEY) || '{"attempts":0,"lockedUntil":0}');
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function setRLState(state) {
  sessionStorage.setItem(RL_KEY, JSON.stringify(state));
}

function recordFailure() {
  const s = getRLState();
  s.attempts += 1;
  const tier = [...LOCKOUT_TIERS].reverse().find((t) => s.attempts >= t.after);
  if (tier) s.lockedUntil = Date.now() + tier.seconds * 1000;
  setRLState(s);
  return s;
}

function recordSuccess() {
  sessionStorage.removeItem(RL_KEY);
}

function getRemainingLock() {
  const s = getRLState();
  const ms = s.lockedUntil - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

function getAttemptsLeft() {
  const s = getRLState();
  const next = LOCKOUT_TIERS.find((t) => t.after > s.attempts);
  return next ? next.after - s.attempts : null;
}

/* ── Password strength indicator ─────────────────────────────────────────── */
function strengthOf(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[a-z]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
}

const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

/* ── Shared input component ───────────────────────────────────────────────── */
function Field({ id, label, type = 'text', value, onChange, placeholder, error, required, autoFocus, right, disabled }) {
  return (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`} htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          className={`form-input ${error ? 'error' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete={type === 'password' ? 'current-password' : id === 'login_id' ? 'username' : 'off'}
          style={right ? { paddingRight: '2.75rem' } : undefined}
        />
        {right}
      </div>
      {error && <span className="form-error" style={{ fontSize: '0.8125rem', color: 'var(--color-error)', marginTop: 4 }}>{error}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const timerRef = useRef(null);

  const [form, setForm] = useState({ login_id: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockRemaining, setLockRemaining] = useState(getRemainingLock());
  const [attemptsLeft, setAttemptsLeft] = useState(getAttemptsLeft());
  const [shake, setShake] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (lockRemaining <= 0) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      const rem = getRemainingLock();
      setLockRemaining(rem);
      if (rem <= 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lockRemaining]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side lockout gate
    const rem = getRemainingLock();
    if (rem > 0) {
      setLockRemaining(rem);
      return;
    }

    setLoading(true);
    try {
      await login(form);
      recordSuccess();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid Login Id or Password';
      const status = err.response?.status;

      if (status === 429) {
        // Server told us we're locked; sync client state
        const waitMatch = msg.match(/(\d+) seconds/);
        if (waitMatch) setLockRemaining(parseInt(waitMatch[1]));
        setError(msg);
      } else {
        const rl = recordFailure();
        setAttemptsLeft(getAttemptsLeft());
        setLockRemaining(getRemainingLock());
        setError(msg);
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockRemaining > 0;
  const formatTime = (s) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  return (
    <div className="auth-bg">
      <div
        className="auth-card"
        style={{
          animation: shake ? 'shakeX 0.5s ease' : undefined,
        }}
      >
        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--gradient-brand)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            boxShadow: '0 8px 32px hsla(231,100%,65%,0.45)',
            fontSize: '1.5rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.02em',
          }}>Iz</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>Welcome back</h1>
          <p className="text-muted text-sm">Sign in to your Invenza account</p>
        </div>

        {/* ── Lockout banner ── */}
        {isLocked && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            background: 'hsla(0,80%,60%,0.1)',
            border: '1px solid hsla(0,80%,60%,0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
          }}>
            <Clock size={18} color="var(--color-error)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-error)' }}>
                Account temporarily locked
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Too many failed attempts. Retry in <strong style={{ color: 'var(--color-error)' }}>{formatTime(lockRemaining)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Field
            id="login_id"
            label="Login ID"
            value={form.login_id}
            onChange={(e) => setForm({ ...form, login_id: e.target.value })}
            placeholder="your_login_id"
            required
            autoFocus
            disabled={isLocked || loading}
            error={error && !isLocked ? ' ' : ''}
          />

          <Field
            id="password"
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            required
            disabled={isLocked || loading}
            error={null}
            right={
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '0.875rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 0, display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />

          {/* Error message */}
          {error && !isLocked && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'hsla(0,80%,60%,0.1)',
              border: '1px solid hsla(0,80%,60%,0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: '0.875rem',
              animation: 'fadeIn 0.2s ease',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                {error}
                {attemptsLeft !== null && (
                  <div style={{ marginTop: 4, fontSize: '0.8rem', opacity: 0.8 }}>
                    ⚠ {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left before lockout
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isLocked || loading}
            style={{ justifyContent: 'center', marginTop: 'var(--space-1)' }}
          >
            {loading ? (
              <div className="spinner" />
            ) : isLocked ? (
              <><Clock size={17} /> Locked ({formatTime(lockRemaining)})</>
            ) : (
              <><LogIn size={17} /> Sign In</>
            )}
          </button>

          {/* Links */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'var(--space-3)', fontSize: '0.875rem',
          }}>
            <Link
              to="/forgot-password"
              style={{ color: 'var(--text-muted)', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
            >
              Forgot password?
            </Link>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <Link to="/signup" style={{ color: 'var(--brand-primary-light)', fontWeight: 500 }}>
              Create account
            </Link>
          </div>
        </form>

        {/* ── Security note ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 'var(--space-6)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem', color: 'var(--text-disabled)',
        }}>
          <Shield size={12} style={{ flexShrink: 0 }} />
          Protected by rate limiting · JWT auth · bcrypt encryption
        </div>
      </div>

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Named exports so the file doubles as a module for SignupPage
   and ForgotPasswordPage to import shared atoms if needed
═══════════════════════════════════════════════════════════════ */
export { Field, strengthOf, STRENGTH_COLORS, STRENGTH_LABELS };
