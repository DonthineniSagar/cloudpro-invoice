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
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [generateConfirm, setGenerateConfirm] = useState<{ item: any; sendEmail: boolean } | null>(null);

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
    try {
      const client = generateClient<Schema>();
      await client.models.RecurringInvoice.delete({ id });
      setItems(prev => prev.filter(i => i.id !== id));
      setDeleteConfirm(null);
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const generateNow = async (item: any, sendEmail = false) => {
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

      if (sendEmail && item.clientEmail && profile) {
        try {
          const { generateInvoicePDF } = await import('@/lib/generate-pdf');
          const lineItemsForPdf = lineItems.map((li: any) => ({
            description: li.description, wbs: li.wbs,
            quantity: li.quantity, unitPrice: li.unitPrice, amount: li.amount,
          }));
          const invoicePdfData = {
            invoiceNumber: num, issueDate, dueDate,
            status: 'DRAFT', clientName: item.clientName,
            clientEmail: item.clientEmail, clientAddress: item.clientAddress || '',
            companyName: profile.companyName || '', companyEmail: profile.companyEmail || '',
            companyAddress: [profile.companyAddress, profile.companyCity, profile.companyState, profile.companyPostalCode, profile.companyCountry].filter(Boolean).join(', '),
            gstNumber: profile.gstNumber || '', bankAccount: profile.bankAccount || '',
            subtotal, gstRate: 15, gstAmount, total, currency: item.currency || 'NZD',
            paymentTerms: item.paymentTerms || '', notes: item.notes || '',
            lineItems: lineItemsForPdf,
          };
          const doc = generateInvoicePDF(invoicePdfData, 'modern', {});
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          await client.mutations.sendInvoiceEmail({
            to: item.clientEmail, subject: `Invoice ${num} from ${profile.companyName || ''}`,
            body: `Hi ${item.clientName},\n\nPlease find invoice ${num} attached.\n\nThanks,\n${profile.companyName || ''}`,
            pdfBase64, fileName: `${num}.pdf`,
            fromName: profile.companyName || undefined,
          });
          await client.models.Invoice.update({ id: invoice!.id, status: 'SENT' as const });
          toast.success(`Invoice ${num} created and sent to ${item.clientEmail}`);
        } catch {
          toast.success(`Invoice ${num} created (email failed — send manually)`);
        }
      } else {
        toast.success(`Draft invoice ${num} created`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate invoice');
    } finally { setGenerating(null); setGenerateConfirm(null); }
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
                    <button onClick={() => setGenerateConfirm({ item, sendEmail: !!item.clientEmail })} disabled={!item.active || generating === item.id}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ${dark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'} disabled:opacity-50`}>
                      {generating === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Generate Now
                    </button>
                    <button onClick={() => toggleActive(item)}
                      className={`p-2 rounded-lg ${dark ? 'text-slate-400 hover:text-white hover:bg-purple-500/20' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                      {item.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setDeleteConfirm(item.id)}
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

      {/* Generate confirmation with send-email option */}
      {generateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setGenerateConfirm(null)} />
          <div className={`relative w-full max-w-sm rounded-xl p-6 shadow-xl ${dark ? 'bg-gray-900 border border-purple-500/30' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Generate invoice</h3>
            <p className={`text-sm mb-4 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
              Create a draft invoice for {generateConfirm.item.clientName}.
            </p>
            {generateConfirm.item.clientEmail && (
              <label className="flex items-center gap-3 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateConfirm.sendEmail}
                  onChange={e => setGenerateConfirm({ ...generateConfirm, sendEmail: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className={`text-sm ${dark ? 'text-slate-200' : 'text-gray-700'}`}>
                  Send to client immediately ({generateConfirm.item.clientEmail})
                </span>
              </label>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setGenerateConfirm(null)} className={`px-4 py-2 text-sm rounded-lg ${dark ? 'text-slate-300 hover:bg-gray-800' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                Cancel
              </button>
              <button
                onClick={() => generateNow(generateConfirm.item, generateConfirm.sendEmail)}
                className={`px-4 py-2 text-sm rounded-lg font-medium ${dark ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete recurring invoice?"
        description="This will permanently remove the recurring schedule. Already-generated invoices will not be affected."
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && deleteItem(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        dark={dark}
      />
    </AppLayout>
  );
}
