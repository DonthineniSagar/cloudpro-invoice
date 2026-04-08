'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { calculateGST, calculateTotal } from '@/lib/gst-calculations';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { invoiceSchema, validate, FormErrors } from '@/lib/validation';
import { getInvoiceCount, getBillingPeriodStart, checkLimit } from '@/lib/usage';
import type { LimitStatus } from '@/lib/usage';
import type { PlanTier } from '@/lib/subscription';
import { isSubscriptionActive } from '@/lib/subscription';
import LimitReachedPrompt from '@/components/LimitReachedPrompt';

type LineItem = {
  id: string; description: string; wbs: string;
  quantity: number; unitPrice: number; amount: number;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [clients, setClients] = useState<unknown[]>([]);
  const [companyProfile, setCompanyProfile] = useState<Record<string, unknown> | null>(null);
  const [selectedClient, setSelectedClient] = useState<Record<string, unknown> | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [invoiceLimit, setInvoiceLimit] = useState<LimitStatus | null>(null);
  const [planName, setPlanName] = useState<string>('');
  const [clientDetails, setClientDetails] = useState({ name: '', email: '', address: '' });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', wbs: '', quantity: 1, unitPrice: 0, amount: 0 }
  ]);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: (() => { const d = new Date(); d.setDate(20); return d.toISOString().split('T')[0]; })(),
    notes: '', paymentTerms: `Due by 20th of the month`
  });

  useEffect(() => {
    const load = async () => {
      try {
        const client = generateClient<Schema>();
        const [clientsRes, profileRes] = await Promise.all([
          client.models.Client.list(),
          client.models.CompanyProfile.list()
        ]);
        setClients(clientsRes.data);
        const profile = profileRes.data?.[0];
        if (profile) setCompanyProfile(profile as unknown as Record<string, unknown>);

        // Invoice limit check
        const plan = (profile?.subscriptionPlan as PlanTier) || null;
        const status = profile?.subscriptionStatus as string | null;
        const effectivePlan = status === 'TRIALING' ? 'BUSINESS_PRO' as PlanTier : plan;
        setPlanName(effectivePlan ? effectivePlan.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Business Pro', 'Business Pro') : '');

        if (effectivePlan && isSubscriptionActive(status as import('@/lib/subscription').SubscriptionStatus | null)) {
          const periodStart = getBillingPeriodStart(
            (profile?.subscriptionCurrentPeriodEnd as string) || null,
            (profile?.subscriptionInterval as 'MONTHLY' | 'ANNUAL') || null
          );
          const count = await getInvoiceCount(client, periodStart);
          const limit = checkLimit('invoices', count, effectivePlan);
          setInvoiceLimit(limit);
        } else {
          // No active subscription — block with 0/0
          setInvoiceLimit({ allowed: false, current: 0, max: 0, label: '0 / 0' });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setUsageLoading(false);
      }
    };
    load();
    const now = new Date();
    const num = `INV-${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
    setFormData(prev => ({ ...prev, invoiceNumber: num }));
  }, []);

  const handleClientSelect = (clientId: string) => {
    const c = clients.find((c: unknown) => (c as Record<string, unknown>).id === clientId) as Record<string, unknown> | undefined;
    setSelectedClient(c || null);
    if (c) {
      setClientDetails({
        name: (c.name as string) || '', email: (c.email as string) || '',
        address: [c.address, c.city, c.state, c.postalCode, c.country].filter(Boolean).join(', ')
      });
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), description: '', wbs: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') updated.amount = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = calculateGST(subtotal);
  const total = calculateTotal(subtotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(invoiceSchema, {
      invoiceNumber: formData.invoiceNumber,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      clientId: selectedClient?.id || '',
      lineItems: lineItems.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
    if (!result.success) { setErrors(result.errors); toast.error('Please fix the errors below'); return; }
    setErrors({});
    setSaving(true);
    try {
      const client = generateClient<Schema>();
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      const { data: invoice } = await client.models.Invoice.create({
        invoiceNumber: formData.invoiceNumber, clientName: clientDetails.name,
        clientEmail: clientDetails.email, clientAddress: clientDetails.address,
        issueDate: new Date(formData.issueDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        notes: formData.notes, paymentTerms: formData.paymentTerms,
        subtotal, gstRate: 15, gstAmount, total, currency: 'NZD',
        status: 'DRAFT' as const, userId: user.userId, clientId: selectedClient.id,
        companyName: companyProfile?.companyName || '', companyEmail: companyProfile?.companyEmail || '',
        companyPhone: companyProfile?.companyPhone || '',
        companyAddress: [companyProfile?.companyAddress, companyProfile?.companyCity, companyProfile?.companyState, companyProfile?.companyPostalCode, companyProfile?.companyCountry].filter(Boolean).join(', '),
        gstNumber: companyProfile?.gstNumber || '', bankAccount: companyProfile?.bankAccount || ''
      });
      if (invoice) {
        for (const item of lineItems) {
          await client.models.InvoiceItem.create({
            description: item.description, wbs: item.wbs, quantity: item.quantity,
            unitPrice: item.unitPrice, amount: item.amount, invoiceId: invoice.id
          });
        }
      }
      router.push('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {usageLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className={dark ? 'text-slate-400' : 'text-gray-500'}>Loading...</div>
          </div>
        ) : invoiceLimit && !invoiceLimit.allowed ? (
          <LimitReachedPrompt
            resource="Invoice"
            current={invoiceLimit.current}
            max={invoiceLimit.max}
            planName={planName || 'current'}
            backHref="/invoices"
            backLabel="Back to Invoices"
            upgradeMessage="Upgrade to create unlimited invoices."
          />
        ) : (
        <div className={t.card}>
          <h1 className={t.heading}>Create Invoice</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={t.label}>Invoice Number</label>
                <input type="text" required value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className={t.input} />
              </div>
              <div>
                <label className={t.label}>Issue Date</label>
                <input type="date" required value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  style={dark ? { colorScheme: 'dark' } : {}} className={t.input} />
              </div>
              <div>
                <label className={t.label}>Due Date</label>
                <input type="date" required value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  style={dark ? { colorScheme: 'dark' } : {}} className={`${t.input} ${errors.dueDate ? 'border-red-500' : ''}`} />
                {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
              </div>
            </div>

            <div>
              <label className={t.label}>Client *</label>
              <select required value={selectedClient?.id || ''}
                onChange={(e) => handleClientSelect(e.target.value)} className={`${t.input} ${errors.clientId ? 'border-red-500' : ''}`}>
                <option value="">Select a client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.email && `(${c.email})`}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
            </div>

            {selectedClient && (
              <div className={dark ? 'bg-black border-2 border-purple-500/40 p-4 rounded-lg space-y-3' : 'bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3'}>
                <h4 className={dark ? 'font-medium text-white' : 'font-medium text-gray-900'}>Bill To:</h4>
                <div>
                  <label className={t.label}>Client Name</label>
                  <input type="text" value={clientDetails.name}
                    onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })} className={t.input} />
                </div>
                <div>
                  <label className={t.label}>Email</label>
                  <input type="email" value={clientDetails.email}
                    onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })} className={t.input} />
                </div>
                <div>
                  <label className={t.label}>Address</label>
                  <textarea rows={2} value={clientDetails.address}
                    onChange={(e) => setClientDetails({ ...clientDetails, address: e.target.value })} className={t.input} />
                </div>
              </div>
            )}

            {companyProfile && (
              <div className={dark ? 'bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg' : 'bg-indigo-50 p-4 rounded-lg'}>
                <h4 className={dark ? 'font-medium text-white mb-3' : 'font-medium text-gray-900 mb-3'}>From:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${t.textMuted}`}>Company Name</label>
                    <div className={dark ? 'bg-black px-3 py-2 rounded border border-purple-500/30 text-sm text-white' : 'bg-white px-3 py-2 rounded border border-indigo-200 text-sm text-gray-900'}>
                      {companyProfile.companyName}
                    </div>
                  </div>
                  {companyProfile.companyEmail && <div>
                    <label className={`block text-xs font-medium mb-1 ${t.textMuted}`}>Email</label>
                    <div className={dark ? 'bg-black px-3 py-2 rounded border border-purple-500/30 text-sm text-white' : 'bg-white px-3 py-2 rounded border border-indigo-200 text-sm text-gray-900'}>
                      {companyProfile.companyEmail}
                    </div>
                  </div>}
                  {companyProfile.gstNumber && <div>
                    <label className={`block text-xs font-medium mb-1 ${t.textMuted}`}>GST Number</label>
                    <div className={dark ? 'bg-black px-3 py-2 rounded border border-purple-500/30 text-sm text-white' : 'bg-white px-3 py-2 rounded border border-indigo-200 text-sm text-gray-900'}>
                      {companyProfile.gstNumber}
                    </div>
                  </div>}
                  {companyProfile.bankAccount && <div>
                    <label className={`block text-xs font-medium mb-1 ${t.textMuted}`}>Bank Account</label>
                    <div className={dark ? 'bg-black px-3 py-2 rounded border border-purple-500/30 text-sm text-white' : 'bg-white px-3 py-2 rounded border border-indigo-200 text-sm text-gray-900'}>
                      {companyProfile.bankAccount}
                    </div>
                  </div>}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className={t.sectionTitle}>Line Items</h3>
                <button type="button" onClick={addLineItem}
                  className={dark ? 'text-purple-400 hover:text-purple-300 flex items-center gap-2' : 'text-indigo-600 hover:text-indigo-700 flex items-center gap-2'}>
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start">
                    <div className="sm:col-span-4">
                      <label className="sm:hidden text-xs text-gray-500 mb-1 block">Description</label>
                      <input type="text" placeholder="Description" required value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} className={t.input} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="sm:hidden text-xs text-gray-500 mb-1 block">WBS</label>
                      <input type="text" placeholder="WBS" value={item.wbs}
                        onChange={(e) => updateLineItem(item.id, 'wbs', e.target.value)} className={t.input} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:contents">
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-gray-500 mb-1 block">Qty</label>
                        <input type="number" placeholder="Qty" required min="0" step="0.01" value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className={t.input} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-gray-500 mb-1 block">Rate</label>
                        <input type="number" placeholder="Rate" required min="0" step="0.01" value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className={t.input} />
                      </div>
                      <div className="flex items-end sm:items-center justify-between sm:col-span-2">
                        <span className={dark ? 'text-white font-medium' : 'text-gray-900 font-medium'}>${item.amount.toFixed(2)}</span>
                        {lineItems.length > 1 && (
                          <button type="button" onClick={() => removeLineItem(item.id)}
                            className="text-red-400 hover:text-red-300 ml-2"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={dark ? 'border-t border-purple-500/20 pt-6' : 'border-t border-gray-200 pt-6'}>
              <div className="max-w-sm ml-auto space-y-2">
                <div className={`flex justify-between ${t.text}`}><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                <div className={`flex justify-between ${t.text}`}><span>GST (15%):</span><span>${gstAmount.toFixed(2)}</span></div>
                <div className={`flex justify-between text-xl font-bold pt-2 ${dark ? 'text-white border-t border-purple-500/20' : 'text-gray-900 border-t border-gray-200'}`}>
                  <span>Total:</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className={t.label}>Notes</label>
              <textarea rows={3} value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={t.input} />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className={`flex-1 ${t.btnPrimary}`}>
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
              <Link href="/dashboard" className={t.btnSecondary}>Cancel</Link>
            </div>
          </form>
        </div>
        )}
      </div>
    </AppLayout>
  );
}
