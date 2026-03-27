'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { uploadData } from 'aws-amplify/storage';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { expenseSchema, validate, FormErrors } from '@/lib/validation';

const CATEGORIES = ['Travel', 'Office', 'Software', 'Equipment', 'Marketing', 'Meals', 'Utilities', 'Other'];

export default function NewExpensePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    description: '', category: 'Other', amount: '',
    gstClaimable: true, date: new Date().toISOString().split('T')[0], notes: ''
  });

  const handleScanReceipt = async (file: File) => {
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const client = generateClient<Schema>();
      const { data } = await client.mutations.processReceipt({ imageBase64: base64 });
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result?.extracted) {
        const { total, date, vendor } = result.extracted;
        setFormData(prev => ({
          ...prev,
          ...(total && { amount: total }),
          ...(vendor && { description: vendor }),
          ...(date && { date: parseReceiptDate(date) }),
        }));
        toast.success('Receipt scanned — check the auto-filled fields');
      }
    } catch (e) {
      console.error('OCR error:', e);
      toast.error('Failed to scan receipt. You can still fill in manually.');
    } finally { setScanning(false); }
  };

  // Parse receipt date — handles NZ formats like 27/03/2026, 27-03-2026, 27 Mar 2026
  const parseReceiptDate = (d: string): string => {
    if (!d) return formData.date;
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmy = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    // Try natural language (e.g. "27 Mar 2026")
    try {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    } catch {}
    return formData.date;
  };

  const handleReceiptSelect = (file: File) => {
    setReceiptFile(file);
    handleScanReceipt(file);
  };

  const amount = parseFloat(formData.amount) || 0;
  const gstAmount = formData.gstClaimable ? amount * 3 / 23 : 0;
  const amountExGst = amount - gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(expenseSchema, {
      description: formData.description, amount, date: formData.date, category: formData.category,
    });
    if (!result.success) { setErrors(result.errors); toast.error('Please fix the errors below'); return; }
    setErrors({});
    setSaving(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        const key = `receipts/${Date.now()}-${receiptFile.name}`;
        const uploadResult = await uploadData({ path: ({identityId}) => `receipts/${identityId}/${Date.now()}-${receiptFile.name}`, data: receiptFile, options: { contentType: receiptFile.type } }).result;
        receiptUrl = uploadResult.path;
      }
      const client = generateClient<Schema>();
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      await client.models.Expense.create({
        description: formData.description, category: formData.category,
        amount, amountExGst, gstAmount, gstClaimable: formData.gstClaimable,
        date: new Date(formData.date).toISOString(), notes: formData.notes,
        status: 'PENDING' as any, userId: user.userId,
        ...(receiptUrl && { receiptUrl }),
      });
      router.push('/expenses');
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/expenses" className={t.link}>
          <ArrowLeft className="w-4 h-4" /> Back to Expenses
        </Link>

        <div className={t.card}>
          <h1 className={t.heading}>Add Expense</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={t.label}>Description *</label>
              <input type="text" required value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Office supplies from Warehouse" className={t.input} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={t.label}>Category</label>
                <select value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={t.input}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={t.label}>Date *</label>
                <input type="date" required value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={dark ? { colorScheme: 'dark' } : {}} className={t.input} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={t.label}>Amount (incl. GST) *</label>
                <input type="number" required min="0" step="0.01" value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00" className={`${t.input} ${errors.amount ? 'border-red-500' : ''}`} />
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input type="checkbox" id="gstClaimable" checked={formData.gstClaimable}
                  onChange={(e) => setFormData({ ...formData, gstClaimable: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <label htmlFor="gstClaimable" className={dark ? 'text-slate-300' : 'text-gray-700'}>GST Claimable</label>
              </div>
            </div>

            {/* GST Breakdown */}
            {amount > 0 && (
              <div className={dark ? 'bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg' : 'bg-indigo-50 p-4 rounded-lg'}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className={t.textMuted}>Amount ex GST</p>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${amountExGst.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={t.textMuted}>GST ({formData.gstClaimable ? '15%' : 'N/A'})</p>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${gstAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className={t.textMuted}>Total</p>
                    <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={t.label}>Receipt {scanning && <span className="text-indigo-500 ml-2"><Loader2 className="w-3 h-3 inline animate-spin" /> Scanning...</span>}</label>
              {receiptFile ? (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${dark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <span className={`text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{receiptFile.name}</span>
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-red-400 hover:text-red-300 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer ${dark ? 'border-2 border-dashed border-purple-500/40 hover:border-purple-500 text-slate-400' : 'border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-500'}`}>
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">Snap or upload receipt</span>
                    <input type="file" accept="image/*,.pdf" capture="environment" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleReceiptSelect(e.target.files[0])} />
                  </label>
                </div>
              )}
              <p className={`text-xs mt-1 ${t.textMuted}`}>Receipt will be auto-scanned to fill in amount, date, and vendor</p>
            </div>

            <div>
              <label className={t.label}>Notes</label>
              <textarea rows={3} value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this expense" className={t.input} />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className={`flex-1 ${t.btnPrimary}`}>
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
              <Link href="/expenses" className={t.btnSecondary}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
