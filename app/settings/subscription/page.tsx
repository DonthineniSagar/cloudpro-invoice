'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { tc } from '@/lib/theme-classes';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { PLANS } from '@/lib/plans';
import type { PlanTier, SubscriptionStatus } from '@/lib/subscription';
import Link from 'next/link';
import { CreditCard, Calendar, Clock, Loader2 } from 'lucide-react';

const client = generateClient<Schema>();

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  BUSINESS: 'Business',
  BUSINESS_PRO: 'Business Pro',
};

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; classes: string; darkClasses: string }> = {
  TRIALING: {
    label: 'Trial',
    classes: 'bg-purple-100 text-purple-700',
    darkClasses: 'bg-purple-900/30 text-purple-400 border border-purple-500/30',
  },
  ACTIVE: {
    label: 'Active',
    classes: 'bg-green-100 text-green-700',
    darkClasses: 'bg-green-900/30 text-green-400 border border-green-500/30',
  },
  PAST_DUE: {
    label: 'Past Due',
    classes: 'bg-amber-100 text-amber-700',
    darkClasses: 'bg-amber-900/30 text-amber-400 border border-amber-500/30',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-700',
    darkClasses: 'bg-red-900/30 text-red-400 border border-red-500/30',
  },
  EXPIRED: {
    label: 'Expired',
    classes: 'bg-gray-100 text-gray-600',
    darkClasses: 'bg-slate-800 text-slate-400 border border-slate-700',
  },
};

interface SubscriptionData {
  subscriptionPlan: PlanTier | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionInterval: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionCurrentPeriodEnd: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDaysRemaining(dateStr: string): number {
  return Math.max(0, Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const t = tc(theme);
  const dark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [sub, setSub] = useState<SubscriptionData>({
    subscriptionPlan: null,
    subscriptionStatus: null,
    subscriptionInterval: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialStartDate: null,
    trialEndDate: null,
    subscriptionCurrentPeriodEnd: null,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await client.models.CompanyProfile.list();
        if (data && data.length > 0) {
          const p = data[0];
          setSub({
            subscriptionPlan: (p.subscriptionPlan as PlanTier) || null,
            subscriptionStatus: (p.subscriptionStatus as SubscriptionStatus) || null,
            subscriptionInterval: (p.subscriptionInterval as string) || null,
            stripeCustomerId: p.stripeCustomerId || null,
            stripeSubscriptionId: p.stripeSubscriptionId || null,
            trialStartDate: p.trialStartDate || null,
            trialEndDate: p.trialEndDate || null,
            subscriptionCurrentPeriodEnd: p.subscriptionCurrentPeriodEnd || null,
          });
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
        toast.error('Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleManageBilling() {
    if (!sub.stripeCustomerId) return;
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: sub.stripeCustomerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create portal session');
      window.location.href = data.url;
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error('Failed to open billing portal. Please try again.');
      setBillingLoading(false);
    }
  }

  // Find the plan from PLANS array
  const currentPlan = sub.subscriptionPlan
    ? PLANS.find(p => p.tier === sub.subscriptionPlan) || null
    : null;

  // Determine price to display
  const price = currentPlan
    ? sub.subscriptionInterval === 'ANNUAL'
      ? (currentPlan.annualPrice ?? null)
      : currentPlan.fullPrice
    : null;

  const priceLabel = price !== null
    ? `$${price.toFixed(2)} NZD${sub.subscriptionInterval === 'ANNUAL' ? '/year' : '/month'}`
    : null;

  if (loading) {
    const pulseClass = dark ? 'animate-pulse rounded bg-purple-500/10' : 'animate-pulse rounded bg-gray-200';
    return (
      <div className="max-w-3xl mx-auto">
        <div className={t.card}>
          <div className={`${pulseClass} h-8 w-48 mb-6`} />
          <div className="space-y-6">
            <div className={`${pulseClass} h-20 w-full`} />
            <div className={`${pulseClass} h-20 w-full`} />
            <div className={`${pulseClass} h-12 w-40`} />
          </div>
        </div>
      </div>
    );
  }

  // No subscription at all
  if (!sub.subscriptionPlan) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className={t.card}>
          <h2 className={t.heading}>Subscription</h2>
          <div className={`text-center py-8 ${t.textMuted}`}>
            <CreditCard className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
            <p className={`text-lg font-medium mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>No active subscription</p>
            <p className={`mb-6 ${t.textMuted}`}>Choose a plan to get started with MyBiz</p>
            <Link href="/pricing" className={t.btnPrimary}>
              Choose a Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = sub.subscriptionStatus ? STATUS_BADGE[sub.subscriptionStatus] : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className={t.card}>
        <h2 className={t.heading}>Subscription</h2>

        <div className="space-y-6">
          {/* Current Plan */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-slate-900 border border-purple-500/20' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <CreditCard className={`w-5 h-5 ${dark ? 'text-purple-400' : 'text-indigo-500'}`} />
              <div>
                <p className={`text-sm ${t.textMuted}`}>Current Plan</p>
                <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {PLAN_LABELS[sub.subscriptionPlan] || sub.subscriptionPlan}
                </p>
              </div>
            </div>
            {statusBadge && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${dark ? statusBadge.darkClasses : statusBadge.classes}`}>
                {statusBadge.label}
              </span>
            )}
          </div>

          {/* Billing Cycle */}
          {sub.subscriptionInterval && (
            <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-slate-900 border border-purple-500/20' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${dark ? 'text-purple-400' : 'text-indigo-500'}`} />
                <div>
                  <p className={`text-sm ${t.textMuted}`}>Billing Cycle</p>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {sub.subscriptionInterval === 'ANNUAL' ? 'Annual' : 'Monthly'}
                    {priceLabel && <span className={`ml-2 text-sm ${t.textMuted}`}>({priceLabel})</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Past Due — prominent payment update CTA */}
          {sub.subscriptionStatus === 'PAST_DUE' && (
            <div className={`p-4 rounded-lg ${dark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium mb-1 ${dark ? 'text-red-300' : 'text-red-800'}`}>
                Payment failed{priceLabel ? ` — ${priceLabel} due` : ''}
              </p>
              <p className={`text-sm mb-3 ${dark ? 'text-red-400/80' : 'text-red-600'}`}>
                Update your payment method to avoid losing access.
              </p>
              {sub.stripeCustomerId && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    dark
                      ? 'bg-red-600 hover:bg-red-500 text-white disabled:opacity-50'
                      : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
                  }`}
                >
                  {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {billingLoading ? 'Loading...' : 'Update Payment Method'}
                </button>
              )}
            </div>
          )}

          {/* Trial End / Next Payment */}
          {sub.subscriptionStatus === 'TRIALING' && sub.trialEndDate && (
            <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-slate-900 border border-purple-500/20' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${dark ? 'text-purple-400' : 'text-indigo-500'}`} />
                <div>
                  <p className={`text-sm ${t.textMuted}`}>Trial Ends</p>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(sub.trialEndDate)}
                  </p>
                  <p className={`text-sm ${t.textMuted}`}>
                    {getDaysRemaining(sub.trialEndDate)} day{getDaysRemaining(sub.trialEndDate) !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              </div>
            </div>
          )}

          {sub.subscriptionStatus === 'ACTIVE' && sub.subscriptionCurrentPeriodEnd && (
            <div className={`flex items-center justify-between p-4 rounded-lg ${dark ? 'bg-slate-900 border border-purple-500/20' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${dark ? 'text-purple-400' : 'text-indigo-500'}`} />
                <div>
                  <p className={`text-sm ${t.textMuted}`}>Next Payment</p>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(sub.subscriptionCurrentPeriodEnd)}
                    {priceLabel && <span className={`ml-2 text-sm ${t.textMuted}`}>— {priceLabel}</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {sub.stripeCustomerId && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={billingLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dark
                    ? 'bg-purple-900/30 border border-purple-500/40 text-purple-400 hover:bg-purple-900/50 disabled:opacity-50'
                    : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50'
                }`}
              >
                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {billingLoading ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
            {(sub.subscriptionStatus === 'ACTIVE' || sub.subscriptionStatus === 'TRIALING') && (
              <Link
                href="/pricing"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dark
                    ? 'border border-purple-500/40 text-slate-300 hover:border-purple-500 hover:text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Change Plan
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
