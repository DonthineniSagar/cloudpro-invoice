'use client';

import Link from 'next/link';
import { CreditCard, Clock, CheckCircle } from 'lucide-react';
import type { PlanTier, SubscriptionStatus } from '@/lib/subscription';

interface BillingStatusProps {
  plan: PlanTier | null;
  status: SubscriptionStatus | null;
  trialEndDate: string | null;
  dark: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  BUSINESS: 'Business',
  BUSINESS_PRO: 'Business Pro',
};

function daysRemaining(dateStr: string): number {
  return Math.max(0, Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
}

export default function BillingStatus({ plan, status, trialEndDate, dark }: BillingStatusProps) {
  const base = dark
    ? 'flex items-start gap-3 p-4 rounded-lg border'
    : 'flex items-start gap-3 p-4 rounded-lg border';

  if (status === 'TRIALING' && trialEndDate) {
    const days = daysRemaining(trialEndDate);
    return (
      <div className={`${base} ${dark ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
        <Clock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
            Free trial active{plan ? ` — ${PLAN_LABELS[plan] ?? plan}` : ''}
          </p>
          <p className={`text-xs mt-0.5 ${dark ? 'text-amber-400/80' : 'text-amber-700'}`}>
            {days} day{days !== 1 ? 's' : ''} remaining
          </p>
          <Link
            href="/pricing"
            className={`inline-block text-xs mt-1 font-medium underline underline-offset-2 ${dark ? 'text-amber-300 hover:text-amber-100' : 'text-amber-900 hover:text-amber-700'}`}
          >
            Choose a plan before trial ends →
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'ACTIVE' && plan) {
    return (
      <div className={`${base} ${dark ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
        <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${dark ? 'text-green-400' : 'text-green-600'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${dark ? 'text-green-300' : 'text-green-800'}`}>
            {PLAN_LABELS[plan] ?? plan} — Active
          </p>
          <Link
            href="/settings/subscription"
            className={`inline-block text-xs mt-1 font-medium underline underline-offset-2 ${dark ? 'text-green-400 hover:text-green-200' : 'text-green-800 hover:text-green-600'}`}
          >
            Manage subscription →
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'PAST_DUE') {
    return (
      <div className={`${base} ${dark ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
        <CreditCard className={`w-5 h-5 mt-0.5 flex-shrink-0 ${dark ? 'text-red-400' : 'text-red-600'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${dark ? 'text-red-300' : 'text-red-800'}`}>Payment overdue</p>
          <Link
            href="/settings/subscription"
            className={`inline-block text-xs mt-1 font-medium underline underline-offset-2 ${dark ? 'text-red-400 hover:text-red-200' : 'text-red-800 hover:text-red-600'}`}
          >
            Update payment method →
          </Link>
        </div>
      </div>
    );
  }

  // No subscription or expired/cancelled
  return (
    <div className={`${base} ${dark ? 'bg-slate-900 border-purple-500/20' : 'bg-gray-50 border-gray-200'}`}>
      <CreditCard className={`w-5 h-5 mt-0.5 flex-shrink-0 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>No active subscription</p>
        <Link
          href="/pricing"
          className={`inline-block text-xs mt-1 font-medium underline underline-offset-2 ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-500'}`}
        >
          View plans →
        </Link>
      </div>
    </div>
  );
}
