'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import type { SubscriptionStatus } from '@/lib/subscription';
import MyBizLogo from '@/components/MyBizLogo';

interface SubscriptionGateProps {
  status: SubscriptionStatus | null;
  stripeCustomerId: string | null;
  dark: boolean;
}

function getContent(status: SubscriptionStatus | null) {
  if (status === 'CANCELLED') {
    return {
      heading: 'Subscription cancelled',
      body: 'Your subscription was cancelled. Reactivate a plan to continue using MyBiz.',
      cta: 'Reactivate Plan',
    };
  }
  if (status === 'EXPIRED') {
    return {
      heading: 'Subscription expired',
      body: 'Your subscription has expired. Renew to regain full access to MyBiz.',
      cta: 'Renew Plan',
    };
  }
  return {
    heading: 'Choose a plan to get started',
    body: 'Pick a plan to unlock MyBiz and start managing your business finances.',
    cta: 'View Plans',
  };
}

export default function SubscriptionGate({ status, stripeCustomerId, dark }: SubscriptionGateProps) {
  const { signOut } = useAuth();
  const { heading, body, cta } = getContent(status);

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div className={`w-full max-w-md rounded-2xl border p-10 text-center shadow-lg ${
        dark
          ? 'bg-gray-900 border-purple-500/30'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-center mb-4">
          <MyBizLogo dark={dark} />
        </div>

        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-6 ${
          dark ? 'bg-purple-900/40' : 'bg-indigo-50'
        }`}>
          <Lock className={`w-7 h-7 ${dark ? 'text-purple-400' : 'text-indigo-600'}`} />
        </div>

        <h1 className={`text-xl font-semibold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>
          {heading}
        </h1>
        <p className={`text-sm mb-8 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
          {body}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${
              dark
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {cta}
          </Link>

          {stripeCustomerId && (
            <Link
              href="/settings/subscription"
              className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
                dark
                  ? 'border border-purple-500/40 text-purple-300 hover:bg-purple-900/20'
                  : 'border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              Manage Billing
            </Link>
          )}

          <button
            onClick={() => signOut()}
            className={`text-sm mt-2 ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
