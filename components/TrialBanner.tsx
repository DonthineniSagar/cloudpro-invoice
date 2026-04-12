'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Clock } from 'lucide-react';
import type { SubscriptionStatus } from '@/lib/subscription';

interface TrialBannerProps {
  status: SubscriptionStatus | null;
  trialEndDate: string | null;
  dark: boolean;
}

export default function TrialBanner({ status, trialEndDate, dark }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Trial banner
  if (status === 'TRIALING' && trialEndDate) {
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));

    return (
      <div className={`px-4 py-3 flex items-center justify-between gap-4 text-sm ${
        dark
          ? 'bg-amber-900/30 border-b border-amber-500/30 text-amber-200'
          : 'bg-amber-50 border-b border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            You have {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial.
          </span>
          <Link
            href="/pricing"
            className={`font-medium underline underline-offset-2 whitespace-nowrap ${
              dark ? 'text-amber-300 hover:text-amber-100' : 'text-amber-900 hover:text-amber-700'
            }`}
          >
            Choose a plan
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            dark ? 'hover:bg-amber-800/50' : 'hover:bg-amber-100'
          }`}
          aria-label="Dismiss trial banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Past-due banner
  if (status === 'PAST_DUE') {
    return (
      <div className={`px-4 py-3 flex items-center justify-between gap-4 text-sm ${
        dark
          ? 'bg-red-900/30 border-b border-red-500/30 text-red-200'
          : 'bg-red-50 border-b border-red-200 text-red-800'
      }`}>
        <span>
          Your payment failed. Please update your payment method or contact{' '}
          <a href="mailto:info@cloudpro-dgital.co.nz" className="font-medium underline underline-offset-2">
            support
          </a>.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            dark ? 'hover:bg-red-800/50' : 'hover:bg-red-100'
          }`}
          aria-label="Dismiss payment banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expired / Cancelled banner
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return (
      <div className={`px-4 py-3 flex items-center justify-between gap-4 text-sm ${
        dark
          ? 'bg-slate-800 border-b border-slate-700 text-slate-300'
          : 'bg-gray-100 border-b border-gray-200 text-gray-700'
      }`}>
        <span>
          Your subscription has ended.{' '}
          <Link
            href="/pricing"
            className={`font-medium underline underline-offset-2 ${
              dark ? 'text-purple-400 hover:text-purple-300' : 'text-primary-600 hover:text-primary-700'
            }`}
          >
            Choose a plan
          </Link>{' '}
          to continue using CloudPro Books.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            dark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'
          }`}
          aria-label="Dismiss subscription banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
