'use client';
import MyBizLogo from '@/components/MyBizLogo';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Chrome, Loader2, Eye, EyeOff } from 'lucide-react';
import { signupSchema, validate } from '@/lib/validation';
import CompanyProfileStep from '@/components/CompanyProfileStep';

type Step = 'register' | 'verification' | 'company-profile';

export default function SignupPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const { signUp, signInWithEmail, signInWithGoogle, needsCompanyProfile, clearNeedsCompanyProfile, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // View state
  const [step, setStep] = useState<Step>('register');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'register' | 'google' | 'verify' | null>(null);

  // Track when verification + sign-in completes so we can react to needsCompanyProfile
  const [verificationComplete, setVerificationComplete] = useState(false);

  // 8.6: After verification + sign-in, auth context updates needsCompanyProfile asynchronously.
  // Wait for auth context to finish loading before making the routing decision.
  useEffect(() => {
    if (!verificationComplete) return;
    if (authLoading) return; // Wait for auth context to finish loading

    if (needsCompanyProfile) {
      setStep('company-profile');
    } else {
      router.push('/dashboard');
    }
  }, [verificationComplete, needsCompanyProfile, authLoading, router]);

  // 8.5: Registration with Zod validation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = validate(signupSchema, { firstName, lastName, email, password, confirmPassword });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setLoading(true);
    setLoadingAction('register');

    try {
      await signUp(email, password, firstName, lastName);
      setStep('verification');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('UsernameExistsException')) {
        setError('An account with this email already exists. Please sign in.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }


  // 8.6: Verification handler — check needsCompanyProfile after sign-in
  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoadingAction('verify');

    try {
      await confirmSignUp({ username: email, confirmationCode: verificationCode });
      await signInWithEmail(email, password);

      // 8.6: Signal that verification is done — the useEffect will check
      // needsCompanyProfile once auth context finishes updating.
      setVerificationComplete(true);
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

  // 8.3: Google sign-up
  async function handleGoogleSignUp() {
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

  // 8.7: Company profile handlers
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
      {/* 8.7: Company profile step */}
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
              : 'bg-white border-2 border-indigo-600'
          }`}
        >
          {/* 8.2: Brand logo and tagline */}
          <div className="text-center">
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              <MyBizLogo dark={dark} />
            </h1>
            <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
              Professional invoicing. Ridiculously fast.
            </p>
          </div>

          {step === 'register' && (
            <>
              <div>
                <h2 className={`text-xl font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  Create account
                </h2>
                <p className={`mt-1 text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Start invoicing in minutes
                </p>
              </div>

              {/* 8.8: Error alert with ARIA */}
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
                  <p className="font-medium mb-1">Signup failed</p>
                  <p>{error}</p>
                </div>
              )}

              {/* 8.3: Google sign-up button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                Google sign-up creates a separate account from email/password registration.
              </p>

              {/* 8.4: Visual divider */}
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

              {/* 8.5: Registration form with Zod validation */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setFieldErrors((prev) => ({ ...prev, firstName: '' })); }}
                      className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                        fieldErrors.firstName
                          ? 'border-red-500'
                          : dark
                            ? 'border-slate-700'
                            : 'border-gray-300'
                      } ${
                        dark
                          ? 'bg-slate-800 text-white placeholder:text-slate-500'
                          : 'bg-white text-gray-900 placeholder:text-gray-400'
                      }`}
                      placeholder="John"
                      aria-invalid={!!fieldErrors.firstName}
                      aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                    />
                    {fieldErrors.firstName && (
                      <p id="firstName-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setFieldErrors((prev) => ({ ...prev, lastName: '' })); }}
                      className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                        fieldErrors.lastName
                          ? 'border-red-500'
                          : dark
                            ? 'border-slate-700'
                            : 'border-gray-300'
                      } ${
                        dark
                          ? 'bg-slate-800 text-white placeholder:text-slate-500'
                          : 'bg-white text-gray-900 placeholder:text-gray-400'
                      }`}
                      placeholder="Doe"
                      aria-invalid={!!fieldErrors.lastName}
                      aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                    />
                    {fieldErrors.lastName && (
                      <p id="lastName-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

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
                    className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                      fieldErrors.email
                        ? 'border-red-500'
                        : dark
                          ? 'border-slate-700'
                          : 'border-gray-300'
                    } ${
                      dark
                        ? 'bg-slate-800 text-white placeholder:text-slate-500'
                        : 'bg-white text-gray-900 placeholder:text-gray-400'
                    }`}
                    placeholder="you@example.com"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  />
                  {fieldErrors.email && (
                    <p id="email-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })); }}
                      className={`mt-1 block w-full px-4 py-3 pr-12 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                        fieldErrors.password
                          ? 'border-red-500'
                          : dark
                            ? 'border-slate-700'
                            : 'border-gray-300'
                      } ${
                        dark
                          ? 'bg-slate-800 text-white placeholder:text-slate-500'
                          : 'bg-white text-gray-900 placeholder:text-gray-400'
                      }`}
                      placeholder="At least 8 characters"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
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
                    <p id="password-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
                      className={`mt-1 block w-full px-4 py-3 pr-12 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                        fieldErrors.confirmPassword
                          ? 'border-red-500'
                          : dark
                            ? 'border-slate-700'
                            : 'border-gray-300'
                      } ${
                        dark
                          ? 'bg-slate-800 text-white placeholder:text-slate-500'
                          : 'bg-white text-gray-900 placeholder:text-gray-400'
                      }`}
                      placeholder="Re-enter your password"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 ${dark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p id="confirmPassword-error" role="alert" aria-live="assertive" className="mt-1 text-sm text-red-500">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* 8.9: Loading state with descriptive text */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {loadingAction === 'register' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
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

              {/* 8.8: Error alert with ARIA */}
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
                    className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                      dark
                        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                </div>

                {/* 8.9: Loading state with descriptive text */}
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
                    'Verify & Continue'
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
                  onClick={() => { setStep('register'); setError(''); }}
                  className={`w-full text-sm min-h-[44px] ${dark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Back to signup
                </button>
              </form>
            </>
          )}

          {/* Sign in link — always visible */}
          <p className={`text-center text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className={`font-medium ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}