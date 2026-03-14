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

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '',
    city: '', state: '', postalCode: '', country: 'New Zealand', notes: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const client = generateClient<Schema>();
        const { data } = await client.models.Client.get({ id: params.id });
        if (data) {
          setFormData({
            name: data.name || '', email: data.email || '', phone: data.phone || '',
            address: data.address || '', city: data.city || '', state: data.state || '',
            postalCode: data.postalCode || '', country: data.country || 'New Zealand', notes: data.notes || ''
          });
        }
      } catch (error) {
        console.error('Error loading client:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const client = generateClient<Schema>();
      await client.models.Client.update({ id: params.id, ...formData });
      router.push('/clients');
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className={t.textMuted}>Loading client...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/clients" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>

        <div className={t.card}>
          <h1 className={t.heading}>Edit Client</h1>
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
                {saving ? 'Saving...' : 'Update Client'}
              </button>
              <Link href="/clients" className={t.btnSecondary}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
