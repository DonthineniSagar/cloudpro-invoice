'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.message || '';
      const errorName = err?.name || '';
      
      if (errorMessage.includes('not confirmed') || errorName === 'UserNotConfirmedException') {
        setNeedsVerification(true);
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
    }
  }

  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: verificationCode });
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.message?.includes('CodeMismatchException')) {
        setError('Invalid verification code. Please check and try again.');
      } else if (err?.message?.includes('ExpiredCodeException')) {
        setError('Verification code expired. Please request a new one.');
      } else {
        setError('Failed to verify account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError('');
    setLoading(true);
    try {
      await resendSignUpCode({ username: email });
      setError('');
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {needsVerification ? 'Verify your email' : 'Sign in'}
          </h2>
          <p className="mt-2 text-gray-600">
            {needsVerification 
              ? `We sent a verification code to ${email}` 
              : 'Welcome back to CloudPro Invoice'}
          </p>
        </div>

        {needsVerification ? (
          <form onSubmit={handleVerification} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                <p className="font-medium mb-1">Verification failed</p>
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify and Sign In'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
            >
              Resend verification code
            </button>

            <button
              type="button"
              onClick={() => setNeedsVerification(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                <p className="font-medium mb-1">Sign in failed</p>
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
