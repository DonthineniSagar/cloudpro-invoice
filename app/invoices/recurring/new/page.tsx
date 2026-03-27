/**
 * New Recurring Invoice Form — create a billing template for a client.
 * Select client, frequency (weekly to annually), start/end dates,
 * and line items. Template is used to auto-generate draft invoices.
 */'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';

type LineItem = { id: string; description: string; wbs: string; quantity: number; unitPrice: number; amount: number };

export default function NewRecurringInvoicePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due within 30 days');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', wbs: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  useEffect(() => {
    (async () => {
      const client = generateClient<Schema>();
      const { data } = await client.models.Client.list();
      setClients(data || []);
    })();
  }, []);

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') updated.amount = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) { toast.error('Select a client'); return; }
    if (!lineItems.some(i => i.description && i.amount > 0)) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    try {
      const client = generateClient<Schema>();
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      await client.models.RecurringInvoice.create({
        clientId: selectedClient.id, clientName: selectedClient.name,
        clientEmail: selectedClient.email || '',
        frequency: frequency as any, nextDate, endDate: endDate || undefined,
        active: true, notes, paymentTerms, currency: 'NZD',
        lineItems: JSON.stringify(lineItems.filter(i => i.description)),
        userId: user.userId,
      });
      toast.success('Recurring invoice created');
      router.push('/invoices/recurring');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/invoices/recurring" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Recurring Invoices
        </Link>

        <div className={t.card}>
          <h1 className={t.heading}>New Recurring Invoice</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={t.label}>Client *</label>
              <select required value={selectedClient?.id || ''}
                onChange={(e) => setSelectedClient(clients.find(c => c.id === e.target.value))}
                className={t.input}>
                <option value="">Select a client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={t.label}>Frequency *</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={t.input}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
              <div>
                <label className={t.label}>Start Date *</label>
                <input type="date" required value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  style={dark ? { colorScheme: 'dark' } : {}} className={t.input} />
              </div>
              <div>
                <label className={t.label}>End Date (optional)</label>
                <input type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={dark ? { colorScheme: 'dark' } : {}} className={t.input} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className={t.label}>Line Items</label>
                <button type="button" onClick={() => setLineItems([...lineItems, { id: Date.now().toString(), description: '', wbs: '', quantity: 1, unitPrice: 0, amount: 0 }])}
                  className={dark ? 'text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm' : 'text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm'}>
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {lineItems.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" placeholder="Description" value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className={`col-span-4 ${t.input}`} />
                    <input type="text" placeholder="WBS" value={item.wbs}
                      onChange={(e) => updateLineItem(item.id, 'wbs', e.target.value)}
                      className={`col-span-2 ${t.input}`} />
                    <input type="number" placeholder="Qty" min="0" step="0.01" value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className={`col-span-2 ${t.input}`} />
                    <input type="number" placeholder="Rate" min="0" step="0.01" value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className={`col-span-2 ${t.input}`} />
                    <div className="col-span-2 flex items-center justify-between">
                      <span className={dark ? 'text-white text-sm' : 'text-gray-900 text-sm'}>${item.amount.toFixed(2)}</span>
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => setLineItems(lineItems.filter(i => i.id !== item.id))}
                          className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`text-right mt-3 text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                Subtotal: ${subtotal.toFixed(2)} + GST
              </div>
            </div>

            <div>
              <label className={t.label}>Notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={t.input} />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className={`flex-1 ${t.btnPrimary}`}>
                {saving ? 'Creating...' : 'Create Recurring Invoice'}
              </button>
              <Link href="/invoices/recurring" className={t.btnSecondary}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
