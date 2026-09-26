import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Eye, EyeOff, UserPlus, CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Password rules ───────────────────────────────────────────────────────── */
const PASSWORD_RULES = [
  { id: 'len',   label: 'At least 8 characters',     test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'spec',  label: 'One special character',      test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

function PasswordChecklist({ password, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {PASSWORD_RULES.map(({ id, label, test }) => {
        const ok = test(password);
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
            {ok
              ? <CheckCircle2 size={14} color="var(--color-success)" />
              : <XCircle size={14} color="var(--text-disabled)" />}
            <span style={{ color: ok ? 'var(--color-success)' : 'var(--text-muted)' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Login ID rules ─────────────────────────────────────────────────────── */
const LOGIN_ID_RULES = [
  { id: 'len',   label: '6–12 characters', test: (v) => v.length >= 6 && v.length <= 12 },
  { id: 'chars', label: 'Letters, numbers, or underscores only', test: (v) => /^[a-zA-Z0-9_]+$/.test(v) },
];

function InlineChecklist({ value, rules, visible }) {
  if (!visible || !value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
      {rules.map(({ id, label, test }) => {
        const ok = test(value);
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
            {ok
              ? <CheckCircle2 size={12} color="var(--color-success)" />
              : <XCircle size={12} color="var(--text-disabled)" />}
            <span style={{ color: ok ? 'var(--color-success)' : 'var(--text-muted)' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    login_id: '', email: '', password: '', re_password: '', role: 'warehouse_staff',
  });
  const [showPass, setShowPass] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [focused, setFocused] = useState('');

  // OTP step state
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  const allPasswordRulesPass = PASSWORD_RULES.every(({ test }) => test(form.password));
  const loginIdRulesPass = LOGIN_ID_RULES.every(({ test }) => test(form.login_id));
  const passwordsMatch = form.password === form.re_password;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validate = () => {
    const errs = {};
    if (!loginIdRulesPass) errs.login_id = 'Login ID must be 6–12 alphanumeric/underscore chars';
    if (!allPasswordRulesPass) errs.password = 'Password does not meet requirements';
    if (!passwordsMatch) errs.re_password = 'Passwords do not match';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email address';
    return errs;
  };

  // Step 1: Validate form and send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.requestSignupOtp(form.email);
      toast.success(`OTP sent to ${form.email}`);
      setStep('otp');
      setResendCooldown(60);
      // Focus first OTP input after render
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        if (detail.toLowerCase().includes('email')) setFieldErrors({ email: detail });
        else setServerError(detail);
      } else {
        setServerError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      await authApi.requestSignupOtp(form.email);
      toast.success('OTP resent!');
      setResendCooldown(60);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError('');
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1); // take last digit
    setOtpCode(newOtp);
    setOtpError('');
    // Auto-advance focus
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 2: Submit form with OTP
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      await authApi.signup({ ...form, otp_code: code });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setOtpError(detail);
      } else if (Array.isArray(detail)) {
        setOtpError(detail.map(d => d.msg).join(', '));
      } else {
        setOtpError('Signup failed. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const PwToggle = ({ show, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      style={{
        position: 'absolute', right: '0.875rem', top: '50%',
        transform: 'translateY(-50%)', background: 'none',
        border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', padding: 0, display: 'flex',
      }}
    >
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  // ── OTP Verification Step ───────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{
              width: 56, height: 56,
              background: 'var(--gradient-brand)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff',
            }}>
              <Mail size={28} />
            </div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>Verify your email</h1>
            <p className="text-muted text-sm">
              We've sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyAndSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* OTP Input Boxes */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }} onPaste={handleOtpPaste}>
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{
                    width: 52, height: 56,
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    border: `2px solid ${otpError ? 'var(--color-error)' : digit ? 'var(--brand-primary)' : 'var(--border-strong)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'}
                  onBlur={(e) => e.target.style.borderColor = digit ? 'var(--brand-primary)' : 'var(--border-strong)'}
                />
              ))}
            </div>

            {/* OTP Error */}
            {otpError && (
              <div style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'hsla(0,80%,60%,0.1)',
                border: '1px solid hsla(0,80%,60%,0.25)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)', fontSize: '0.875rem',
                textAlign: 'center',
              }}>{otpError}</div>
            )}

            {/* Verify button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={otpLoading || otpCode.join('').length !== 6}
              style={{ justifyContent: 'center' }}
            >
              {otpLoading ? <div className="spinner" /> : <><CheckCircle2 size={17} /> Verify & Create Account</>}
            </button>

            {/* Resend & Back */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
              <button
                type="button"
                onClick={() => { setStep('form'); setOtpCode(['', '', '', '', '', '']); setOtpError(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit', fontSize: 'inherit',
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || otpLoading}
                style={{
                  background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  color: resendCooldown > 0 ? 'var(--text-disabled)' : 'var(--brand-primary)',
                  fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 500,
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Form Step ───────────────────────────────────────────────────────
  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--gradient-brand)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            fontSize: '1.5rem', fontWeight: 800, color: '#fff',
          }}>Iz</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>Create account</h1>
          <p className="text-muted text-sm">Join Invenza to manage your inventory</p>
        </div>

        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Login ID + Role */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label required" htmlFor="login_id">Login ID</label>
              <input
                id="login_id"
                className={`form-input ${fieldErrors.login_id ? 'error' : ''}`}
                placeholder="user123"
                value={form.login_id}
                maxLength={12}
                onChange={(e) => { setForm({ ...form, login_id: e.target.value }); setFieldErrors((f) => ({ ...f, login_id: '' })); }}
                onFocus={() => setFocused('login_id')}
                onBlur={() => setFocused('')}
                required
                autoFocus
                autoComplete="username"
              />
              <InlineChecklist value={form.login_id} rules={LOGIN_ID_RULES} visible={focused === 'login_id' || !!form.login_id} />
              {fieldErrors.login_id && <span className="form-error" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>{fieldErrors.login_id}</span>}
            </div>

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

          {/* Email */}
          <div className="form-group">
            <label className="form-label required" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((f) => ({ ...f, email: '' })); }}
              required
              autoComplete="email"
            />
            {fieldErrors.email && <span className="form-error" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label required" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                placeholder="Min 8 chars, 1 upper, 1 special"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setFieldErrors((f) => ({ ...f, password: '' })); }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                required
                autoComplete="new-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <PwToggle show={showPass} onClick={() => setShowPass((s) => !s)} />
            </div>

            {/* Strength bar */}
            {form.password && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map((i) => {
                  const s = PASSWORD_RULES.filter(({ test }) => test(form.password)).length;
                  return (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= s
                        ? ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][s]
                        : 'var(--border-default)',
                      transition: 'background 0.3s ease',
                    }} />
                  );
                })}
              </div>
            )}

            <PasswordChecklist password={form.password} visible={focused === 'password' || !!form.password} />
            {fieldErrors.password && <span className="form-error" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>{fieldErrors.password}</span>}
          </div>

          {/* Re-enter Password */}
          <div className="form-group">
            <label className="form-label required" htmlFor="re_password">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="re_password"
                type={showRePass ? 'text' : 'password'}
                className={`form-input ${fieldErrors.re_password ? 'error' : form.re_password && !passwordsMatch ? 'error' : ''}`}
                placeholder="Re-enter your password"
                value={form.re_password}
                onChange={(e) => { setForm({ ...form, re_password: e.target.value }); setFieldErrors((f) => ({ ...f, re_password: '' })); }}
                required
                autoComplete="new-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <PwToggle show={showRePass} onClick={() => setShowRePass((s) => !s)} />
            </div>
            {form.re_password && !passwordsMatch && (
              <span className="form-error" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>Passwords do not match</span>
            )}
            {fieldErrors.re_password && <span className="form-error" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: 4 }}>{fieldErrors.re_password}</span>}
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'hsla(0,80%,60%,0.1)',
              border: '1px solid hsla(0,80%,60%,0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)', fontSize: '0.875rem',
            }}>{serverError}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: 'var(--space-1)' }}
          >
            {loading ? <div className="spinner" /> : <><Mail size={17} /> Send Verification OTP</>}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
