'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Upload, X, Eye, FileText, Lock } from 'lucide-react';
import Link from 'next/link';
import { uploadData } from 'aws-amplify/storage';
import AppLayout from '@/components/AppLayout';

const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { getFY, currentFY, isPreviousFYOpen, isFYClosed, fyShort } from '@/lib/fy-utils';

// IRD NZ deductible expense categories (IR3/IR4 aligned)
const CATEGORIES = [
  'Advertising & Marketing',
  'Communication (Phone & Internet)',
  'Depreciation',
  'Entertainment (50% deductible)',
  'General & Administrative',
  'Insurance',
  'Interest & Bank Fees',
  'Legal & Accounting',
  'Motor Vehicle',
  'Office Expenses',
  'Rent & Rates',
  'Repairs & Maintenance',
  'Software & Subscriptions',
  'Subcontractors',
  'Travel & Accommodation',
  'Other',
];

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState(false);
  const [originalStatus, setOriginalStatus] = useState('PENDING');
  const [createdAt, setCreatedAt] = useState('');
  const [formData, setFormData] = useState({
    description: '', category: 'Other', amount: '',
    gstClaimable: true, gstOverride: '', date: '', notes: '', status: 'PENDING',
    classification: '' as string, businessPercent: '100', source: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const client = generateClient<Schema>();
        const { data } = await client.models.Expense.get({ id: params.id });
        if (data) {
          setFormData({
            description: data.description || '', category: data.category || 'Other',
            amount: data.amount?.toString() || '', gstClaimable: data.gstClaimable ?? true,
            gstOverride: data.gstAmount != null ? data.gstAmount.toString() : '',
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
            notes: data.notes || '', status: data.status || 'PENDING',
            classification: (data as any).classification || '',
            businessPercent: (data as any).businessPercent?.toString() || '100',
            source: (data as any).source || '',
          });
          if (data.receiptUrl) {
            setExistingReceipt(data.receiptUrl);
            try {
              const { getUrl } = await import('aws-amplify/storage');
              const { url } = await getUrl({ path: data.receiptUrl });
              setReceiptPreviewUrl(url.toString());
            } catch {}
          }
          setOriginalStatus(data.status || 'PENDING');
          if (data.createdAt) setCreatedAt(data.createdAt);
        }
      } catch (error) {
        console.error('Error loading expense:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const amount = parseFloat(formData.amount) || 0;
  const gstOverride = formData.gstOverride !== '' ? parseFloat(formData.gstOverride) : null;
  const gstAmount = !formData.gstClaimable ? 0 : gstOverride != null ? gstOverride : Math.round(amount * 3 / 23 * 100) / 100;
  const amountExGst = amount - gstAmount;

  // FY cutoff logic
  const expenseFY = formData.date ? getFY(formData.date) : currentFY();
  const isLocked = isFYClosed(expenseFY);
  const isPrevFYAndOpen = formData.date ? (expenseFY < currentFY() && isPreviousFYOpen()) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Block save if FY is closed
    if (isLocked) {
      toast.error(`${fyShort(expenseFY)} is closed — cutoff was May 15`);
      return;
    }
    setSaving(true);
    try {
      let receiptUrl = existingReceipt;
      if (receiptFile) {
        const key = `receipts/${Date.now()}-${receiptFile.name}`;
        const uploadResult = await uploadData({ path: ({identityId}) => `receipts/${identityId}/${Date.now()}-${receiptFile.name}`, data: receiptFile, options: { contentType: receiptFile.type } }).result;
        receiptUrl = uploadResult.path;
      }
      const client = generateClient<Schema>();
      // If approved expense is edited, reset to PENDING for re-approval
      const newStatus = originalStatus === 'APPROVED' ? 'PENDING' : formData.status;
      await client.models.Expense.update({
        id: params.id, description: formData.description, category: formData.category,
        amount, amountExGst, gstAmount, gstClaimable: formData.gstClaimable,
        date: new Date(formData.date).toISOString(), notes: formData.notes,
        status: newStatus as any,
        ...(formData.classification && { classification: formData.classification as any }),
        ...(formData.classification === 'partial' && { businessPercent: parseInt(formData.businessPercent) || 100 }),
        ...(receiptUrl && { receiptUrl }),
      });
      router.push('/expenses');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    try {
      const client = generateClient<Schema>();
      await client.models.Expense.delete({ id: params.id });
      router.push('/expenses');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  if (loading) {
    return <AppLayout><div className="min-h-screen flex items-center justify-center">
      <div className={t.textMuted}>Loading expense...</div>
    </div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/expenses" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Expenses
        </Link>

        <div className={t.card}>
          {/* FY Lock Banner */}
          {isLocked && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 ${dark ? 'bg-red-900/20 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">🔒 {fyShort(expenseFY)} is closed. This expense is read-only.</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h1 className={dark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-900'}>Edit Expense</h1>
            {!isLocked && originalStatus !== 'APPROVED' && (
              <button onClick={handleDelete} className={`${t.btnDanger} ${t.btnSm}`}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={t.label}>Description *</label>
              <input type="text" required value={formData.description}
                disabled={isLocked}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={t.input} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={t.label}>Category</label>
                <select value={formData.category}
                  disabled={isLocked}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={t.input}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={t.label}>Date *</label>
                <input type="date" required value={formData.date}
                  disabled={isLocked}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={dark ? { colorScheme: 'dark' } : {}} className={t.input} />
                {formData.date && expenseFY < currentFY() && (
                  <p className={`text-xs mt-1 ${isLocked ? 'text-red-500' : isPrevFYAndOpen ? 'text-amber-500' : 'text-red-500'}`}>
                    {isLocked
                      ? `✕ ${fyShort(expenseFY)} is closed — cutoff was May 15`
                      : isPrevFYAndOpen
                        ? `⚠ This falls in ${fyShort(expenseFY)} (previous year) — open until May 15`
                        : `✕ ${fyShort(expenseFY)} is closed — cutoff was May 15`}
                  </p>
                )}
              </div>
              <div>
                <label className={t.label}>Status</label>
                <div className={`px-4 py-3 rounded-lg text-sm ${dark ? 'bg-gray-800 border border-purple-500/20' : 'bg-gray-100 border-2 border-indigo-600'}`}>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    formData.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    formData.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{formData.status}</span>
                  {originalStatus === 'APPROVED' && <span className={`text-xs ml-2 ${t.textMuted}`}>Will reset to PENDING on save</span>}
                </div>
              </div>
              {createdAt && (
              <div>
                <label className={t.label}>Created</label>
                <div className={`px-4 py-3 rounded-lg text-sm ${dark ? 'bg-gray-800 border border-purple-500/20 text-gray-300' : 'bg-gray-100 border-2 border-indigo-600 text-gray-600'}`}>
                  {new Date(createdAt).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              )}
            </div>

            {formData.source === 'bank_import' && (
              <div>
                <label className={t.label}>Classification</label>
                <div className="flex gap-2">
                  {(['business', 'personal', 'partial'] as const).map(c => (
                    <button key={c} type="button" disabled={isLocked} onClick={() => setFormData({ ...formData, classification: c, ...(c === 'partial' ? { businessPercent: formData.businessPercent || '50' } : {}) })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize ${formData.classification === c
                        ? c === 'business' ? 'bg-green-600 text-white' : c === 'personal' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                        : dark ? 'bg-gray-800 text-slate-400 border border-gray-700' : 'bg-gray-100 text-gray-600 border-2 border-indigo-600'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                {formData.classification === 'partial' && (
                  <div className="mt-3">
                    <label className={t.label}>Business %</label>
                    <input type="number" min="1" max="99" value={formData.businessPercent}
                      disabled={isLocked}
                      onChange={(e) => setFormData({ ...formData, businessPercent: e.target.value })}
                      className={t.input + ' w-24'} />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={t.label}>Amount (incl. GST) *</label>
                <input type="number" required min="0" step="0.01" value={formData.amount}
                  disabled={isLocked}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={t.input} />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input type="checkbox" id="gstClaimable" checked={formData.gstClaimable}
                  disabled={isLocked}
                  onChange={(e) => setFormData({ ...formData, gstClaimable: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <label htmlFor="gstClaimable" className={dark ? 'text-slate-300' : 'text-gray-700'}>GST Claimable</label>
              </div>
            </div>

            {amount > 0 && (
              <div className={dark ? 'bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg' : 'bg-indigo-50 p-4 rounded-lg'}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className={t.textMuted}>Amount ex GST</p>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${amountExGst.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={t.textMuted}>GST ({formData.gstClaimable ? '15%' : 'N/A'})</p>
                    {formData.gstClaimable ? (
                      <input type="number" min="0" step="0.01" value={formData.gstOverride}
                        disabled={isLocked}
                        onChange={(e) => setFormData({ ...formData, gstOverride: e.target.value })}
                        placeholder={(amount * 3 / 23).toFixed(2)}
                        className={`w-full font-medium mt-0.5 px-2 py-1 rounded text-sm ${dark ? 'bg-gray-800 border border-purple-500/30 text-white' : 'bg-white border border-indigo-200 text-gray-900'}`} />
                    ) : (
                      <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>$0.00</p>
                    )}
                  </div>
                  <div>
                    <p className={t.textMuted}>Total</p>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={t.label}>Receipt</label>
              {isLocked ? (
                existingReceipt && receiptPreviewUrl ? (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${dark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-3">
                      {isPdfUrl(receiptPreviewUrl) ? (
                        <div onClick={() => setViewingReceipt(true)}
                          className="w-10 h-10 rounded flex items-center justify-center bg-red-50 border-2 border-indigo-600 cursor-zoom-in hover:opacity-80">
                          <FileText className="w-5 h-5 text-red-500" />
                        </div>
                      ) : (
                        <img src={receiptPreviewUrl} alt="Receipt" className="w-10 h-10 rounded object-cover cursor-zoom-in hover:opacity-80"
                          onClick={() => setViewingReceipt(true)} />
                      )}
                      <span className={`text-sm ${dark ? 'text-green-400' : 'text-green-700'}`}>✓ Receipt attached</span>
                    </div>
                    <button type="button" onClick={() => setViewingReceipt(true)}
                      className={`text-sm flex items-center gap-1 ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                ) : (
                  <p className={`text-sm ${t.textMuted}`}>No receipt attached</p>
                )
              ) : receiptFile ? (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${dark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <span className={`text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{receiptFile.name}</span>
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-red-400 hover:text-red-300 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : existingReceipt ? (
                <div>
                  <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${dark ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-3">
                      {receiptPreviewUrl && (
                        isPdfUrl(receiptPreviewUrl) ? (
                          <div onClick={() => setViewingReceipt(true)}
                            className="w-10 h-10 rounded flex items-center justify-center bg-red-50 border-2 border-indigo-600 cursor-zoom-in hover:opacity-80">
                            <FileText className="w-5 h-5 text-red-500" />
                          </div>
                        ) : (
                        <img src={receiptPreviewUrl} alt="Receipt" className="w-10 h-10 rounded object-cover cursor-zoom-in hover:opacity-80"
                          onClick={() => setViewingReceipt(true)} />
                        )
                      )}
                      <span className={`text-sm ${dark ? 'text-green-400' : 'text-green-700'}`}>✓ Receipt attached</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {receiptPreviewUrl && (
                        <button type="button" onClick={() => setViewingReceipt(true)}
                          className={`text-sm flex items-center gap-1 ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                          <Eye className="w-4 h-4" /> View
                        </button>
                      )}
                      <label className={`text-sm cursor-pointer ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                        Replace
                        <input type="file" accept="image/*,.pdf" className="hidden"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer ${dark ? 'border-2 border-dashed border-purple-500/40 hover:border-purple-500 text-slate-400' : 'border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-500'}`}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload receipt image</span>
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            <div>
              <label className={t.label}>Notes</label>
              <textarea rows={3} value={formData.notes}
                disabled={isLocked}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={t.input} />
            </div>

            {!isLocked && (
              <div className="flex gap-4">
                <button type="submit" disabled={saving} className={`flex-1 ${t.btnPrimary}`}>
                  {saving ? 'Saving...' : 'Update Expense'}
                </button>
                <Link href="/expenses" className={t.btnGhost}>Cancel</Link>
              </div>
            )}
            {isLocked && (
              <div className="flex gap-4">
                <Link href="/expenses" className={`flex-1 text-center ${t.btnSecondary}`}>Back to Expenses</Link>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      {viewingReceipt && receiptPreviewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingReceipt(false)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button onClick={() => setViewingReceipt(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm">
              ✕ Close
            </button>
            {isPdfUrl(receiptPreviewUrl) ? (
              <iframe src={receiptPreviewUrl} className="w-[90vw] max-w-3xl h-[85vh] rounded-lg bg-white" />
            ) : (
              <img src={receiptPreviewUrl} alt="Receipt" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
