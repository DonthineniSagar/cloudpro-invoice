'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import AppLayout from '@/components/AppLayout';
import { PLANS } from '@/lib/plans';
import { Check, Minus, Loader2 } from 'lucide-react';
import type { PlanTier } from '@/lib/subscription';

const client = generateClient<Schema>();

export default function PricingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const dark = theme === 'dark';
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [companyProfileId, setCompanyProfileId] = useState<string | null>(null);
  const [hasExistingTrial, setHasExistingTrial] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: profiles } = await client.models.CompanyProfile.list();
        const profile = profiles?.[0];
        if (profile) {
          setCurrentPlan(profile.subscriptionPlan || null);
          setCompanyProfileId(profile.id);
          setHasExistingTrial(!!profile.trialStartDate);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    if (user?.id) load();
    else setLoading(false);
  }, [user?.id]);

  async function handleSelectPlan(plan: typeof PLANS[0]) {
    if (!user?.id) return;
    if (!companyProfileId) {
      toast.error('Please set up your company profile before choosing a plan.');
      return;
    }
    setLoadingPlan(plan.tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.monthlyPriceId,
          planName: plan.tier,
          interval: 'monthly',
          userId: user.id,
          userEmail: user.email,
          companyProfileId,
          hasExistingTrial,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to start checkout. Please try again.');
      setLoadingPlan(null);
    }
  }

  function getButtonLabel(planTier: string): string {
    if (!currentPlan) return 'Start Free Trial';
    if (currentPlan === planTier) return 'Current Plan';
    const tiers = ['STARTER', 'BUSINESS'];
    return tiers.indexOf(planTier) > tiers.indexOf(currentPlan) ? 'Upgrade' : 'Downgrade';
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!loading && !companyProfileId && (
          <div className={`mb-8 p-4 rounded-lg flex items-center justify-between gap-4 ${
            dark ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
          }`}>
            <p className={`text-sm ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
              Set up your company profile before choosing a plan.
            </p>
            <a href="/settings/company"
              className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors">
              Set Up Profile
            </a>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            Choose your plan
          </h1>
          <p className={`mt-2 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
            {currentPlan ? 'Upgrade or change your plan anytime.' : 'Start with a 14-day free trial. No credit card required.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {PLANS.map((plan) => {
            const buttonLabel = getButtonLabel(plan.tier);
            const isCurrentPlan = currentPlan === plan.tier;
            const isLoading = loadingPlan === plan.tier;

            return (
              <div key={plan.tier}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlighted
                    ? dark ? 'border-purple-500 bg-gray-800 shadow-lg shadow-purple-500/10' : 'border-primary-500 bg-white shadow-lg shadow-primary-500/10'
                    : dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full bg-primary-600 text-white">
                    Most Popular
                  </span>
                )}
                {plan.discount && (
                  <span className={`absolute -top-3 right-4 px-3 py-1 text-xs font-semibold rounded-full ${
                    dark ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700'
                  }`}>
                    {plan.discount}
                  </span>
                )}
                <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`text-lg line-through ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ${plan.displayPrice.toFixed(2)}
                  </span>
                  <span className={`text-4xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                    ${(plan.monthlyPrice / 1.15).toFixed(2)}
                  </span>
                  <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>+GST/mo</span>
                </div>
                <p className={`mt-1 text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ${plan.monthlyPrice.toFixed(2)} NZD/mo incl. GST
                </p>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.name} className="flex items-start gap-2 text-sm">
                      {f.included === false
                        ? <Minus className={`w-4 h-4 mt-0.5 flex-shrink-0 ${dark ? 'text-gray-600' : 'text-gray-300'}`} />
                        : <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-primary-500' : dark ? 'text-purple-400' : 'text-success-500'}`} />}
                      <span className={f.included === false ? (dark ? 'text-gray-600' : 'text-gray-400') : (dark ? 'text-gray-300' : 'text-gray-700')}>
                        {typeof f.included === 'string' ? `${f.name} (${f.included})` : f.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan || isLoading || loading}
                  className={`mt-8 block w-full text-center px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isCurrentPlan
                      ? dark ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : plan.highlighted
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : dark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : buttonLabel}
                </button>
              </div>
            );
          })}
        </div>

        <p className={`mt-8 text-center text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          All prices in NZD. GST (15%) applies.
        </p>
      </div>
    </AppLayout>
  );
}
