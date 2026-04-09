'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Fingerprint, Chrome, Loader2, Eye, EyeOff } from 'lucide-react';
import { loginSchema, totpSchema, validate } from '@/lib/validation';
import CompanyProfileStep from '@/components/CompanyProfileStep';

type Step = 'credentials' | 'totp' | 'verification' | 'company-profile';

export default function LoginPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const {
    user,
    loading: authLoading,
    signInWithEmail,
    signInWithGoogle,
    signInWithPasskey,
    confirmTotpCode,
    needsCompanyProfile,
    clearNeedsCompanyProfile,
  } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // View state
  const [step, setStep] = useState<Step>('credentials');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'email' | 'google' | 'passkey' | 'totp' | 'verify' | null>(null);

  // WebAuthn detection
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  // TOTP failure tracking
  const [totpFailures, setTotpFailures] = useState(0);
  const [totpDisabledUntil, setTotpDisabledUntil] = useState<number | null>(null);

  // Track when a sign-in action completes so we can check needsCompanyProfile
  const [signInComplete, setSignInComplete] = useState(false);

  // Refs
  const totpInputRef = useRef<HTMLInputElement>(null);

  // 7.3: WebAuthn feature detection
  useEffect(() => {
    async function detectWebAuthn() {
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setWebAuthnSupported(available);
        } catch {
          setWebAuthnSupported(false);
        }
      }
    }
    detectWebAuthn();
  }, []);

  // 7.13: Listen for Google sign-in redirect failures
  useEffect(() => {
    const hubListenerCancel = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect_failure') {
        setError('Google sign-in failed. Please try again or use another method.');
        toast.error('Google sign-in failed');
      }
    });
    return () => hubListenerCancel();
  }, [toast]);

  // FIX 1: Watch for user + needsCompanyProfile for Google redirect case
  // After Google redirect, Hub listener in auth-context sets user, then needsCompanyProfile updates.
  // Also handles the signInComplete flag for email/passkey/totp/verification flows.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    // For Google redirect: user is set by Hub listener, check needsCompanyProfile
    // For email/passkey/totp/verification: signInComplete is set after successful sign-in
    if (signInComplete || step === 'credentials') {
      if (needsCompanyProfile) {
        setStep('company-profile');
      } else if (signInComplete) {
        router.push('/dashboard');
      }
    }
  }, [user, needsCompanyProfile, authLoading, signInComplete, step, router]);

  // Auto-focus TOTP input when step changes
  useEffect(() => {
    if (step === 'totp' && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [step]);

  // TOTP disable timer
  useEffect(() => {
    if (totpDisabledUntil === null) return;
    const remaining = totpDisabledUntil - Date.now();
    if (remaining <= 0) {
      setTotpDisabledUntil(null);
      return;
    }
    const timer = setTimeout(() => setTotpDisabledUntil(null), remaining);
    return () => clearTimeout(timer);
  }, [totpDisabledUntil]);

  const isTotpDisabled = totpDisabledUntil !== null && Date.now() < totpDisabledUntil;

  // Helper to handle post-sign-in routing with needsCompanyProfile check
  function completeSignIn() {
    setSignInComplete(true);
  }

  // 7.7 + 7.9: Email/password sign-in with Zod validation
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate with loginSchema
    const validation = validate(loginSchema, { email, password });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);
    setLoadingAction('email');

    try {
      const result = await signInWithEmail(email, password);

      if (result.nextStep === 'TOTP_REQUIRED') {
        setStep('totp');
        setTotpCode('');
        setTotpFailures(0);
        setTotpDisabledUntil(null);
        return;
      }

      if (result.nextStep === 'CONFIRM_SIGN_UP') {
        setStep('verification');
        setError('');
        try {
          await resendSignUpCode({ username: email });
        } catch (resendErr) {
          console.error('Failed to resend code:', resendErr);
        }
        return;
      }

      completeSignIn();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      const errorName = err instanceof Error ? err.name : '';

      if (errorMessage.includes('not confirmed') || errorName === 'UserNotConfirmedException') {
        setStep('verification');
        setError('');
        try {
          await resendSignUpCode({ username: email });
        } catch (resendErr) {
          console.error('Failed to resend code:', resendErr);
        }
        return;
      } else if (errorMessage.includes('UserNotFoundException') || errorMessage.includes('NotAuthorizedException')) {
        setError('Incorrect email or password. Please try again or sign up if you don\'t have an account.');
      } else if (errorMessage.includes('TooManyRequestsException')) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError('Unable to sign in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  // 7.8: TOTP verification
  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validation = validate(totpSchema, { code: totpCode });
    if (!validation.success) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setLoadingAction('totp');

    try {
      await confirmTotpCode(totpCode);
      completeSignIn();
    } catch {
      const failures = totpFailures + 1;
      setTotpFailures(failures);
      setTotpCode('');

      if (failures >= 3) {
        setError('Too many failed attempts. Please wait 30 seconds before trying again, or contact support.');
        setTotpDisabledUntil(Date.now() + 30000);
      } else {
        setError('Invalid code. Please check your authenticator app and try again.');
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  // Verification step handler
  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoadingAction('verify');

    try {
      await confirmSignUp({ username: email, confirmationCode: verificationCode });
      await signInWithEmail(email, password);
      completeSignIn();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('CodeMismatchException')) {
        setError('Invalid verification code. Please check and try again.');
      } else if (errMsg.includes('ExpiredCodeException')) {
        setError('Verification code expired. Please request a new one.');
      } else {
        setError('Failed to verify account. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  async function handleResendCode() {
    setError('');
    setLoading(true);
    try {
      await resendSignUpCode({ username: email });
      toast.success('Verification code sent');
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // 7.4: Passkey sign-in
  async function handlePasskeySignIn() {
    setError('');
    setLoading(true);
    setLoadingAction('passkey');

    try {
      await signInWithPasskey();
      completeSignIn();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      // 7.12: Handle passkey errors
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('not found') || errorMessage.includes('No credential')) {
        setError('No passkey found for this device. Sign in with email and password, then register a passkey in Settings.');
      } else {
        setError('Passkey authentication failed. Please try another sign-in method.');
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }

  // 7.5: Google sign-in
  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    setLoadingAction('google');

    try {
      await signInWithGoogle();
    } catch {
      setError('Unable to connect to Google. Please try again.');
      setLoading(false);
      setLoadingAction(null);
    }
  }

  // Company profile handlers
  function handleCompanyProfileComplete() {
    clearNeedsCompanyProfile();
    router.push('/dashboard');
  }

  function handleCompanyProfileSkip() {
    clearNeedsCompanyProfile();
    router.push('/dashboard');
  }

  return (
    <main className={`min-h-screen flex items-center justify-center px-4 ${dark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Company profile step */}
      {step === 'company-profile' ? (
        <CompanyProfileStep
          onComplete={handleCompanyProfileComplete}
          onSkip={handleCompanyProfileSkip}
        />
      ) : (
      <div
        className={`max-w-md w-full space-y-8 p-8 rounded-xl ${
          dark
            ? 'bg-slate-900 border border-purple-500/30'
            : 'bg-white shadow-sm border border-gray-200'
        }`}
      >
        {/* 7.2: Brand logo and tagline */}
        <div className="text-center">
          <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            ☁ CloudPro Invoice
          </h1>
          <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Professional invoicing. Ridiculously fast.
          </p>
        </div>

        {step === 'credentials' && (
          <>
            <div>
              <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                Sign in
              </h2>
              <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                Welcome back to CloudPro Invoice
              </p>
            </div>

            {/* 7.10: Error alert with ARIA */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className={`p-4 rounded-lg text-sm ${
                  dark
                    ? 'bg-red-900/30 border border-red-500/30 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                <p className="font-medium mb-1">Sign in failed</p>
                <p>{error}</p>
              </div>
            )}

            {/* 7.4: Passkey button — conditional on WebAuthn support */}
            {webAuthnSupported && (
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 font-medium py-3 rounded-lg transition-colors min-h-[44px] disabled:opacity-50 ${
                  dark
                    ? 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {loadingAction === 'passkey' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Sign in with Passkey
                  </>
                )}
              </button>
            )}

            {/* 7.5: Google sign-in button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 font-medium py-3 rounded-lg transition-colors min-h-[44px] disabled:opacity-50 ${
                dark
                  ? 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {loadingAction === 'google' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Chrome className="w-5 h-5" />
                  Continue with Google
                </>
              )}
            </button>

            <p className={`text-xs text-center mt-2 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
              Google sign-in creates a separate account. If you already have an email/password account, sign in with your password instead.
            </p>

            {/* 7.6: Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${dark ? 'border-slate-700' : 'border-gray-300'}`} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${dark ? 'bg-slate-900 text-slate-400' : 'bg-white text-gray-500'}`}>
                  or
                </span>
              </div>
            </div>

            {/* Email/password form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })); }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    dark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                  } border`}
                  placeholder="you@example.com"
                />
                {fieldErrors.email && (
                  <p id="email-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className={`text-sm ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={`mt-1 block w-full px-4 py-3 pr-12 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      dark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                    } border`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 ${dark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              {/* 7.11: Sign in button with loading state */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loadingAction === 'email' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </>
        )}

        {/* 7.8: TOTP step */}
        {step === 'totp' && (
          <>
            <div>
              <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                Two-factor authentication
              </h2>
              <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className={`p-4 rounded-lg text-sm ${
                  dark
                    ? 'bg-red-900/30 border border-red-500/30 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div>
                <label htmlFor="totp-code" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Verification code
                </label>
                <input
                  ref={totpInputRef}
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTotpCode(val);
                  }}
                  disabled={isTotpDisabled}
                  placeholder="000000"
                  className={`mt-1 block w-full px-4 py-3 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    dark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                  } border ${isTotpDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              <button
                type="submit"
                disabled={loading || isTotpDisabled || totpCode.length !== 6}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loadingAction === 'totp' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError('');
                  setTotpCode('');
                  setTotpFailures(0);
                  setTotpDisabledUntil(null);
                }}
                className={`w-full text-sm min-h-[44px] ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
              >
                Back to sign in
              </button>
            </form>
          </>
        )}

        {/* Verification step */}
        {step === 'verification' && (
          <>
            <div>
              <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                Verify your email
              </h2>
              <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                We sent a verification code to {email}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className={`p-4 rounded-lg text-sm ${
                  dark
                    ? 'bg-red-900/30 border border-red-500/30 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                <p className="font-medium mb-1">Verification failed</p>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label htmlFor="verification-code" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Verification Code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    dark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                  } border`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loadingAction === 'verify' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify and Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className={`w-full text-sm min-h-[44px] disabled:opacity-50 ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
              >
                Resend verification code
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); }}
                className={`w-full text-sm min-h-[44px] ${dark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Back to sign in
              </button>
            </form>
          </>
        )}

        {/* Sign up link — always visible */}
        <p className={`text-center text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className={`font-medium ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
          >
            Sign up
          </Link>
        </p>
      </div>
      )}
    </main>
  );
}
