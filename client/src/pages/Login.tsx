import { useState } from 'react';
import { Compass, Mail, Key, ArrowRight, CheckCircle } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

interface LoginProps {
  onLogin: (user: { id: number; email: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (res.ok) {
        setStep('otp');
        if (data.devCode) setDevCode(data.devCode);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code: otp })
      });

      const data = await res.json();
      
      if (res.ok) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setLoading(true);
    setError('');

    try {
      const optionsRes = await fetch('/api/auth/passkey/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email || undefined })
      });

      const options = await optionsRes.json();
      const credential = await startAuthentication(options);

      const verifyRes = await fetch('/api/auth/passkey/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credential)
      });

      const data = await verifyRes.json();

      if (verifyRes.ok) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Passkey authentication failed');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError('Passkey not available or not supported');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cgu-light flex items-center justify-center p-4 bauhaus-geometric">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-cgu-red rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-cgu-dark">
            <Compass className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-cgu-dark mb-2">AI for Humanity Compass</h1>
          <p className="text-cgu-dark/70">Claremont Graduate University</p>
          <p className="text-sm text-cgu-dark/50 mt-1">Center for Information Systems & Technology</p>
        </div>

        <div className="bauhaus-card p-8 animate-fade-in">
          {step === 'email' ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-cgu-dark mb-2 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cgu-dark/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bauhaus-input w-full pl-11 pr-4 py-3"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-traffic-red/10 border-2 border-traffic-red text-traffic-red px-4 py-2 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bauhaus-btn w-full bg-cgu-red text-white py-3 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : 'Send OTP'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-cgu-dark/20"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-cgu-dark/60 uppercase tracking-wide">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading}
                className="bauhaus-btn w-full bg-white text-cgu-dark py-3 flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                Sign in with Passkey
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-cgu-green mx-auto mb-2" />
                <p className="text-sm text-cgu-dark/70">
                  We sent a code to <strong>{email}</strong>
                </p>
              </div>

              {devCode && (
                <div className="bg-bauhaus-yellow/20 border-2 border-bauhaus-yellow px-4 py-2 text-sm">
                  <strong>Development Mode:</strong> Your OTP is <code className="font-mono bg-white px-2 py-1">{devCode}</code>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-cgu-dark mb-2 uppercase tracking-wide">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bauhaus-input w-full px-4 py-3 text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="bg-traffic-red/10 border-2 border-traffic-red text-traffic-red px-4 py-2 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="bauhaus-btn w-full bg-cgu-red text-white py-3 flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError(''); setDevCode(''); }}
                className="w-full text-center text-sm text-cgu-dark/60 hover:text-cgu-red"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-cgu-dark/50">
            AI for Humanity Lab • Dr. Itamar Shabtai
          </p>
        </div>
      </div>
    </div>
  );
}
