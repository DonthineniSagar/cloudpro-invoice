'use client';

import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-gray-600">Password reset coming soon</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg text-sm">
          <p className="font-medium mb-1">Feature in development</p>
          <p>Password reset functionality will be available soon. Please contact support if you need immediate assistance.</p>
        </div>

        <Link 
          href="/auth/login"
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
