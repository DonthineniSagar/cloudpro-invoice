'use client';

import { useState } from 'react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function mapCognitoError(err: unknown): string {
    const message = err instanceof Error ? err.message : '';
    const name = err instanceof Error ? err.name : '';

    if (name === 'UserNotFoundException' || message.includes('UserNotFoundException')) {
      return 'No account found with this email.';
    }
    if (name === 'LimitExceededException' || message.includes('LimitExceededException') ||
        name === 'TooManyRequestsException' || message.includes('TooManyRequestsException')) {
      return 'Too many attempts. Please try again later.';
    }
    if (name === 'CodeMismatchException' || message.includes('CodeMismatchException')) {
      return 'Invalid verification code. Please check and try again.';
    }
    if (name === 'ExpiredCodeException' || message.includes('ExpiredCodeException')) {
      return 'Verification code expired. Please request a new one.';
    }
    return 'Something went wrong. Please try again.';
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await resetPassword({ username: email });
      setStep('code');
    } catch (err: unknown) {
      setError(mapCognitoError(err));
    } finally { setLoading(false); }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      setError(mapCognitoError(err));
    } finally { setLoading(false); }
  }

  if (success) {
    return (
      <main className={`min-h-screen flex items-center justify-center px-4 ${dark ? 'bg-black' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-xl text-center ${
          dark
            ? 'bg-slate-900 border border-purple-500/30'
            : 'bg-white shadow-sm border border-gray-200'
        }`}>
          {/* Brand logo */}
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
              <span style={{fontFamily: "'Lobster', cursive"}}><span className="text-indigo-400">My</span>Biz</span>
            </h1>
            <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
              Professional invoicing. Ridiculously fast.
            </p>
          </div>

          <div className="text-4xl mb-4">✅</div>
          <h2 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Password Reset</h2>
          <p className={`mb-6 ${dark ? 'text-slate-300' : 'text-gray-600'}`}>Your password has been updated successfully.</p>
          <Link
            href="/auth/login"
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors min-h-[44px] leading-[44px]"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen flex items-center justify-center px-4 ${dark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full space-y-6 p-8 rounded-xl ${
        dark
          ? 'bg-slate-900 border border-purple-500/30'
          : 'bg-white shadow-sm border border-gray-200'
      }`}>
        {/* Brand logo */}
        <div className="text-center">
          <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            <span style={{fontFamily: "'Lobster', cursive"}}><span className="text-indigo-400">My</span>Biz</span>
          </h1>
          <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Professional invoicing. Ridiculously fast.
          </p>
        </div>

        <div>
          <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Reset Password</h2>
          <p className={`mt-2 ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
            {step === 'email' ? 'Enter your email to receive a reset code' : `Enter the code sent to ${email}`}
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
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                  dark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="code" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>Verification Code</label>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                  dark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
              />
            </div>
            <div>
              <label htmlFor="newPassword" className={`block text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>New Password</label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className={`mt-1 block w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent border ${
                  dark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); }}
              className={`w-full text-sm min-h-[44px] ${dark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Use a different email
            </button>
          </form>
        )}

        <Link
          href="/auth/login"
          className={`block text-center text-sm ${dark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
