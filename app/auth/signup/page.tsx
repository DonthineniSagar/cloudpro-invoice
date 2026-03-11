'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmSignUp } from 'aws-amplify/auth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { signUp, signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, firstName, lastName);
      setNeedsVerification(true);
    } catch (err: any) {
      if (err?.message?.includes('UsernameExistsException')) {
        setError('An account with this email already exists. Please sign in.');
      } else {
        setError('Failed to create account. Please try again.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {needsVerification ? 'Verify your email' : 'Create account'}
          </h2>
          <p className="mt-2 text-gray-600">
            {needsVerification 
              ? `We sent a verification code to ${email}` 
              : 'Start invoicing in minutes'}
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
              onClick={() => setNeedsVerification(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Back to signup
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
                <p className="font-medium mb-1">Signup failed</p>
                <p>{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
