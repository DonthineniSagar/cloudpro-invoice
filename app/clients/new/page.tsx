'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { getClientCount, checkLimit } from '@/lib/usage';
import type { LimitStatus } from '@/lib/usage';
import type { PlanTier } from '@/lib/subscription';
import { isSubscriptionActive } from '@/lib/subscription';
import type { SubscriptionStatus } from '@/lib/subscription';
import LimitReachedPrompt from '@/components/LimitReachedPrompt';

export default function NewClientPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [saving, setSaving] = useState(false);
  const [usageLoading, setUsageLoading] = useState(true);
  const [clientLimit, setClientLimit] = useState<LimitStatus | null>(null);
  const [planName, setPlanName] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '',
    city: '', state: '', postalCode: '', country: 'New Zealand', notes: ''
  });

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const client = generateClient<Schema>();
        const { data: profiles } = await client.models.CompanyProfile.list();
        const profile = profiles?.[0];
        const plan = (profile?.subscriptionPlan as PlanTier) || null;
        const status = (profile?.subscriptionStatus as SubscriptionStatus) || null;
        const effectivePlan = status === 'TRIALING' ? 'BUSINESS_PRO' as PlanTier : plan;
        setPlanName(effectivePlan ? effectivePlan.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');

        if (effectivePlan && isSubscriptionActive(status)) {
          const count = await getClientCount(client);
          const limit = checkLimit('clients', count, effectivePlan);
          setClientLimit(limit);
        } else {
          setClientLimit({ allowed: false, current: 0, max: 0, label: '0 / 0' });
        }
      } catch (error) {
        console.error('Error checking client limit:', error);
      } finally {
        setUsageLoading(false);
      }
    };
    loadUsage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const client = generateClient<Schema>();
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      await client.models.Client.create({ ...formData, userId: user.userId });
      toast.success('Client created successfully');
      router.push('/clients');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/clients" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>

        {usageLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className={dark ? 'text-slate-400' : 'text-gray-500'}>Loading...</div>
          </div>
        ) : clientLimit && !clientLimit.allowed ? (
          <LimitReachedPrompt
            resource="Client"
            current={clientLimit.current}
            max={clientLimit.max}
            planName={planName || 'current'}
            backHref="/clients"
            backLabel="Back to Clients"
            upgradeMessage="Upgrade for unlimited clients."
          />
        ) : (
        <div className={t.card}>
          <h1 className={t.heading}>Add New Client</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={t.label}>Client Name *</label>
              <input type="text" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={t.input} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={t.label}>Email</label>
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={t.input} />
              </div>
              <div>
                <label className={t.label}>Phone</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={t.input} />
              </div>
            </div>

            <div>
              <label className={t.label}>Address</label>
              <input type="text" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={t.input} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={t.label}>City</label>
                <input type="text" value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={t.input} />
              </div>
              <div>
                <label className={t.label}>State/Region</label>
                <input type="text" value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className={t.input} />
              </div>
              <div>
                <label className={t.label}>Postal Code</label>
                <input type="text" value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className={t.input} />
              </div>
            </div>

            <div>
              <label className={t.label}>Country</label>
              <input type="text" value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className={t.input} />
            </div>

            <div>
              <label className={t.label}>Notes</label>
              <textarea rows={4} value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={t.input} />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className={`flex-1 ${t.btnPrimary}`}>
                {saving ? 'Saving...' : 'Save Client'}
              </button>
              <Link href="/clients" className={t.btnSecondary}>Cancel</Link>
            </div>
          </form>
        </div>
        )}
      </div>
    </AppLayout>
  );
}
