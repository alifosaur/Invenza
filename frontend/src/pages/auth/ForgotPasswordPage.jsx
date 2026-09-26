import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = { EMAIL: 'email', OTP: 'otp', RESET: 'reset', SUCCESS: 'success' };

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [passwords, setPasswords] = useState({ new_password: '', re_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.requestOtp(email);
      toast.success('OTP sent to your email');
      setStep(STEPS.OTP);
    } catch {
      setError('Something went wrong. Try again.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.verifyOtp({ email, code: otp });
      setStep(STEPS.RESET);
    } catch {
      setError('Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.resetPassword({ email, code: otp, ...passwords });
      setStep(STEPS.SUCCESS);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          <ArrowLeft size={16} /> Back to login
        </Link>

        {step === STEPS.EMAIL && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Forgot password?</h1>
              <p className="text-muted text-sm">Enter your email to receive a one-time code</p>
            </div>
            <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><Mail size={16} /> Send OTP</>}
              </button>
            </form>
          </>
        )}

        {step === STEPS.OTP && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Enter OTP</h1>
              <p className="text-muted text-sm">We sent a 6-digit code to <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong></p>
            </div>
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="otp">6-digit OTP</label>
                <input
                  id="otp"
                  className="form-input font-mono"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  style={{ letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center' }}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading || otp.length < 6} style={{ justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><KeyRound size={16} /> Verify OTP</>}
              </button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(STEPS.EMAIL)} style={{ justifyContent: 'center' }}>
                Resend OTP
              </button>
            </form>
          </>
        )}

        {step === STEPS.RESET && (
          <>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>New password</h1>
              <p className="text-muted text-sm">Choose a strong password</p>
            </div>
            <form onSubmit={resetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="new_password">New Password</label>
                <input id="new_password" type="password" className="form-input" placeholder="Min 8 chars, 1 upper, 1 special" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="re_password">Confirm Password</label>
                <input id="re_password" type="password" className="form-input" placeholder="••••••••" value={passwords.re_password} onChange={(e) => setPasswords({ ...passwords, re_password: e.target.value })} required />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : <><Lock size={16} /> Reset Password</>}
              </button>
            </form>
          </>
        )}

        {step === STEPS.SUCCESS && (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <CheckCircle size={56} color="var(--color-success)" style={{ marginBottom: 'var(--space-4)' }} />
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Password reset!</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-6)' }}>You can now sign in with your new password.</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
