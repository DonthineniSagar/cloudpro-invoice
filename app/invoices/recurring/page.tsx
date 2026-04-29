/**
 * Recurring Invoices List — manage recurring billing templates.
 * Supports pause/resume, manual "Generate Now" (creates draft invoice),
 * and auto-advances nextDate based on frequency after each generation.
 */'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Plus, RefreshCw, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';

const freqLabel: Record<string, string> = {
  WEEKLY: 'Weekly', FORTNIGHTLY: 'Fortnightly', MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly', ANNUALLY: 'Annually',
};

function advanceDate(date: string, freq: string): string {
  const d = new Date(date);
  switch (freq) {
    case 'WEEKLY': d.setDate(d.getDate() + 7); break;
    case 'FORTNIGHTLY': d.setDate(d.getDate() + 14); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break;
    case 'ANNUALLY': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export default function RecurringInvoicesPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const client = generateClient<Schema>();
      const { listAll } = await import('@/lib/list-all');
      const data = await listAll(client.models.RecurringInvoice);
      setItems(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleActive = async (item: any) => {
    try {
      const client = generateClient<Schema>();
      await client.models.RecurringInvoice.update({ id: item.id, active: !item.active });
      setItems(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
      toast.success(item.active ? 'Paused' : 'Resumed');
    } catch { toast.error('Failed to update'); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this recurring invoice?')) return;
    try {
      const client = generateClient<Schema>();
      await client.models.RecurringInvoice.delete({ id });
      setItems(items.filter(i => i.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const generateNow = async (item: any) => {
    setGenerating(item.id);
    try {
      const client = generateClient<Schema>();
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      const { data: profiles } = await client.models.CompanyProfile.list();
      const profile = profiles?.[0];

      const lineItems = JSON.parse(item.lineItems || '[]');
      const subtotal = lineItems.reduce((s: number, li: any) => s + (li.amount || 0), 0);
      const gstAmount = Math.round(subtotal * 0.15 * 100) / 100;
      const total = subtotal + gstAmount;

      const now = new Date();
      const num = `INV-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
      const issueDate = new Date().toISOString();
      const dueDate = new Date(Date.now() + 30 * 86400000).toISOString();

      const { data: invoice } = await client.models.Invoice.create({
        invoiceNumber: num, clientName: item.clientName, clientEmail: item.clientEmail,
        issueDate, dueDate, notes: item.notes, paymentTerms: item.paymentTerms,
        subtotal, gstRate: 15, gstAmount, total, currency: item.currency || 'NZD',
        status: 'DRAFT' as const, userId: user.userId, clientId: item.clientId,
        companyName: profile?.companyName || '', companyEmail: profile?.companyEmail || '',
        companyPhone: profile?.companyPhone || '',
        companyAddress: [profile?.companyAddress, profile?.companyCity, profile?.companyState, profile?.companyPostalCode, profile?.companyCountry].filter(Boolean).join(', '),
        gstNumber: profile?.gstNumber || '', bankAccount: profile?.bankAccount || '',
      });

      if (invoice) {
        for (const li of lineItems) {
          await client.models.InvoiceItem.create({
            description: li.description, wbs: li.wbs, quantity: li.quantity,
            unitPrice: li.unitPrice, amount: li.amount, invoiceId: invoice.id,
          });
        }
      }

      // Advance next date
      const nextDate = advanceDate(item.nextDate, item.frequency);
      const ended = item.endDate && nextDate > item.endDate;
      await client.models.RecurringInvoice.update({
        id: item.id, nextDate, lastGeneratedDate: new Date().toISOString().split('T')[0],
        generatedCount: (item.generatedCount || 0) + 1,
        ...(ended ? { active: false } : {}),
      });
      setItems(items.map(i => i.id === item.id ? {
        ...i, nextDate, lastGeneratedDate: new Date().toISOString().split('T')[0],
        generatedCount: (i.generatedCount || 0) + 1, ...(ended ? { active: false } : {}),
      } : i));

      toast.success(`Draft invoice ${num} created`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate invoice');
    } finally { setGenerating(null); }
  };

  return (
    <AppLayout>
      <FeatureGate featureName="Recurring Invoices" requiredPlan="Business">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Recurring Invoices</h1>
            <p className={`mt-1 ${t.textMuted}`}>Auto-generate invoices on a schedule</p>
          </div>
          <Link href="/invoices/recurring/new"
            className={dark ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center gap-2' : 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2'}>
            <Plus className="w-5 h-5" /> New Recurring
          </Link>
        </div>

        {loading ? (
          <div className={`${t.textMuted} text-center py-12`}>Loading...</div>
        ) : items.length === 0 ? (
          <div className={dark ? 'bg-black rounded-xl border-2 border-purple-500/40 p-12 text-center' : 'bg-white rounded-xl border-2 border-indigo-600 p-12 text-center'}>
            <RefreshCw className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-slate-600' : 'text-gray-400'}`} />
            <h3 className={dark ? 'text-xl font-semibold text-white mb-2' : 'text-xl font-semibold text-gray-900 mb-2'}>No recurring invoices</h3>
            <p className={`${t.textMuted} mb-6`}>Set up recurring billing for retainer clients</p>
            <Link href="/invoices/recurring/new"
              className={dark ? 'inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg' : 'inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg'}>
              <Plus className="w-5 h-5" /> Create Recurring Invoice
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className={dark ? 'bg-black rounded-xl border-2 border-purple-500/40 p-6' : 'bg-white rounded-xl border-2 border-indigo-600 p-6'}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-lg font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{item.clientName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>{item.active ? 'Active' : 'Paused'}</span>
                    </div>
                    <div className={`text-sm mt-1 ${t.textMuted}`}>
                      {freqLabel[item.frequency] || item.frequency} · Next: {item.nextDate}
                      {item.endDate && ` · Ends: ${item.endDate}`}
                      {item.generatedCount > 0 && ` · Generated: ${item.generatedCount}`}
                    </div>
                    <div className={`text-sm mt-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
                      ${JSON.parse(item.lineItems || '[]').reduce((s: number, li: any) => s + (li.amount || 0), 0).toFixed(2)} + GST
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => generateNow(item)} disabled={!item.active || generating === item.id}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ${dark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'} disabled:opacity-50`}>
                      {generating === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Generate Now
                    </button>
                    <button onClick={() => toggleActive(item)}
                      className={`p-2 rounded-lg ${dark ? 'text-slate-400 hover:text-white hover:bg-purple-500/20' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                      {item.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className={`p-2 rounded-lg ${dark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </FeatureGate>
    </AppLayout>
  );
}
