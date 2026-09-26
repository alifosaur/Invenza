import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import {
  Mail, KeyRound, Lock, ArrowLeft,
  CheckCircle, RotateCcw, Eye, EyeOff, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── OTP Rate limiting for requests ──────────────────────────────────────── */
const OTP_RL_KEY = 'invenza_otp_rl';

function getOtpRL() {
  try { return JSON.parse(sessionStorage.getItem(OTP_RL_KEY) || '{"count":0,"until":0}'); }
  catch { return { count: 0, until: 0 }; }
}

function canRequestOtp() {
  const s = getOtpRL();
  return s.until < Date.now();
}

function recordOtpRequest() {
  const s = getOtpRL();
  s.count += 1;
  // Progressive cooldowns: 1st=30s, 2nd=60s, 3rd+=120s
  const cooldown = s.count === 1 ? 30 : s.count === 2 ? 60 : 120;
  s.until = Date.now() + cooldown * 1000;
  sessionStorage.setItem(OTP_RL_KEY, JSON.stringify(s));
  return cooldown;
}

/* ── Password rules re-check ──────────────────────────────────────────────── */
const PW_RULES = [
  { id: 'len',   label: 'At least 8 characters',     test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter',       test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter',       test: (p) => /[a-z]/.test(p) },
  { id: 'spec',  label: 'One special character',      test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const STEPS = { EMAIL: 'email', OTP: 'otp', RESET: 'reset', SUCCESS: 'success' };

/* ── Step indicator ───────────────────────────────────────────────────────── */
function StepDots({ current }) {
  const steps = [STEPS.EMAIL, STEPS.OTP, STEPS.RESET];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 'var(--space-6)' }}>
      {steps.map((s, i) => {
        const idx = steps.indexOf(current);
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} style={{
            width: active ? 24 : 8, height: 8,
            borderRadius: 4,
            background: done || active ? 'var(--brand-primary)' : 'var(--bg-elevated)',
            border: active ? 'none' : '1px solid var(--border-default)',
            transition: 'all 0.3s ease',
          }} />
        );
      })}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState('');
  const [passwords, setPasswords] = useState({ new_password: '', re_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [showRePw, setShowRePw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [resendCooldown]);

  // OTP box handlers
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const otpString = otp.join('');
  const allOtpFilled = otpString.length === 6;
  const allPwRulesPass = PW_RULES.every(({ test }) => test(passwords.new_password));

  /* ── Step 1: Request OTP ── */
  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (!canRequestOtp()) {
      const s = getOtpRL();
      const wait = Math.ceil((s.until - Date.now()) / 1000);
      setError(`Please wait ${wait}s before requesting another OTP.`);
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.requestOtp(email);
      const cooldown = recordOtpRequest();
      setResendCooldown(cooldown);
      if (data.dev_code) {
        setDevCode(data.dev_code);
        // Auto-fill OTP boxes in dev mode
        setOtp(data.dev_code.split(''));
      }
      if (step !== STEPS.OTP) {
        toast.success('OTP sent to your email');
        setStep(STEPS.OTP);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        toast.success('New OTP sent!');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP. Try again.';
      if (err.response?.status === 429) {
        const wait = parseInt(msg.match(/(\d+) seconds/)?.[1] || 60);
        setResendCooldown(wait);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOtp({ email, code: otpString });
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
      // Shake animation
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3: Reset password ── */
  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!allPwRulesPass) { setError('Password does not meet requirements'); return; }
    if (passwords.new_password !== passwords.re_password) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code: otpString, ...passwords });
      setStep(STEPS.SUCCESS);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        {/* Back link */}
        {step !== STEPS.SUCCESS && (
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.875rem', color: 'var(--text-muted)',
              marginBottom: 'var(--space-5)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={15} /> Back to login
          </Link>
        )}

        {step !== STEPS.SUCCESS && <StepDots current={step} />}

        {/* ─── STEP 1: Email ─────────────────────────────────── */}
        {step === STEPS.EMAIL && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                background: 'hsla(231,100%,65%,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-4)',
              }}>
                <Mail size={22} color="var(--brand-primary-light)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Forgot password?</h1>
              <p className="text-muted text-sm">Enter your registered email and we'll send a one-time code</p>
            </div>
            <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="fp_email">Email Address</label>
                <input
                  id="fp_email"
                  type="email"
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  required
                  autoFocus
                  autoComplete="email"
                />
                {error && <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>{error}</span>}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
                style={{ justifyContent: 'center' }}
              >
                {loading ? <div className="spinner" /> : <><Mail size={16} /> Send OTP</>}
              </button>
            </form>
          </>
        )}

        {/* ─── STEP 2: OTP ───────────────────────────────────── */}
        {step === STEPS.OTP && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                background: 'hsla(168,85%,48%,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-4)',
              }}>
                <KeyRound size={22} color="var(--brand-accent)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Enter verification code</h1>
              <p className="text-muted text-sm">
                Sent to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>
                {devCode && (
                  <span style={{
                    marginLeft: 8, padding: '2px 8px', borderRadius: 4,
                    background: 'hsla(38,95%,55%,0.15)', color: 'var(--color-warning)',
                    fontSize: '0.75rem', fontWeight: 600,
                  }}>DEV: {devCode}</span>
                )}
              </p>
            </div>

            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* OTP boxes */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }} onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    style={{
                      width: 52, height: 58,
                      textAlign: 'center',
                      fontSize: '1.5rem', fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      background: digit ? 'hsla(231,100%,65%,0.08)' : 'var(--bg-elevated)',
                      border: `2px solid ${digit ? 'var(--brand-primary)' : error ? 'var(--color-error)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                      caretColor: 'var(--brand-primary)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--brand-primary)')}
                    onBlur={(e) => !digit && (e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--border-default)')}
                  />
                ))}
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--color-error)', fontSize: '0.875rem', textAlign: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || !allOtpFilled}
                style={{ justifyContent: 'center' }}
              >
                {loading ? <div className="spinner" /> : <><KeyRound size={16} /> Verify Code</>}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Didn't receive it?{' '}
                {resendCooldown > 0 ? (
                  <span style={{ color: 'var(--text-disabled)' }}>
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={requestOtp}
                    disabled={loading}
                    style={{ padding: '2px 8px', fontSize: '0.875rem', color: 'var(--brand-primary-light)' }}
                  >
                    <RotateCcw size={13} /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        {/* ─── STEP 3: New Password ───────────────────────────── */}
        {step === STEPS.RESET && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                background: 'hsla(271,90%,65%,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-4)',
              }}>
                <Lock size={22} color="var(--brand-secondary)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Set new password</h1>
              <p className="text-muted text-sm">Choose a strong, unique password</p>
            </div>

            <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="new_password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new_password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Strong password…"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    required
                    autoFocus
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} tabIndex={-1} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {/* Rules checklist */}
                {passwords.new_password && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {PW_RULES.map(({ id, label, test }) => {
                      const ok = test(passwords.new_password);
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                          <span style={{ color: ok ? 'var(--color-success)' : 'var(--text-disabled)' }}>{ok ? '✓' : '○'}</span>
                          <span style={{ color: ok ? 'var(--color-success)' : 'var(--text-muted)' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label required" htmlFor="re_password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="re_password"
                    type={showRePw ? 'text' : 'password'}
                    className={`form-input ${passwords.re_password && passwords.new_password !== passwords.re_password ? 'error' : ''}`}
                    placeholder="Re-enter new password"
                    value={passwords.re_password}
                    onChange={(e) => setPasswords({ ...passwords, re_password: e.target.value })}
                    required
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button" onClick={() => setShowRePw((s) => !s)} tabIndex={-1} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    {showRePw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {passwords.re_password && passwords.new_password !== passwords.re_password && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>Passwords do not match</span>
                )}
              </div>

              {error && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><Lock size={16} /> Reset Password</>}
              </button>
            </form>
          </>
        )}

        {/* ─── STEP 4: Success ────────────────────────────────── */}
        {step === STEPS.SUCCESS && (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <div style={{
              width: 72, height: 72,
              background: 'hsla(152,70%,48%,0.15)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-5)',
              animation: 'pulse-glow 2s infinite',
            }}>
              <CheckCircle size={36} color="var(--color-success)" />
            </div>
            <h2 style={{ fontSize: '1.625rem', marginBottom: 8 }}>Password reset!</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-8)' }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={() => navigate('/login')}
              style={{ justifyContent: 'center' }}
            >
              <ArrowLeft size={16} /> Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
