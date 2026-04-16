'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { canAccessRoute, isSubscriptionActive } from '@/lib/subscription';
import type { PlanTier, SubscriptionStatus } from '@/lib/subscription';
import UpgradePrompt from '@/components/UpgradePrompt';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

interface FeatureGateProps {
  featureName: string;
  requiredPlan: string;
  children: React.ReactNode;
}

export default function FeatureGate({ featureName, requiredPlan, children }: FeatureGateProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSubscription() {
      try {
        const { data: profiles } = await client.models.CompanyProfile.list();
        const profile = profiles?.[0];
        if (!cancelled && profile) {
          setPlan((profile.subscriptionPlan as PlanTier) || null);
          setStatus((profile.subscriptionStatus as SubscriptionStatus) || null);
        }
      } catch (err) {
        console.error('FeatureGate: failed to load subscription:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSubscription();
    return () => { cancelled = true; };
  }, [user?.id]);

  // While loading, render children (same as AppLayout — show content until we know)
  if (loading) return <>{children}</>;

  // No subscription data at all → fallback, show everything
  if (!plan && !status) return <>{children}</>;

  // Inactive subscription → show everything (same as AppLayout fallback)
  if (!isSubscriptionActive(status)) return <>{children}</>;

  const effectivePlan: PlanTier = status === 'TRIALING' ? 'BUSINESS_PRO' : (plan || 'STARTER');

  if (!canAccessRoute(effectivePlan, pathname)) {
    return <UpgradePrompt feature={featureName} requiredPlan={requiredPlan} />;
  }

  return <>{children}</>;
}
