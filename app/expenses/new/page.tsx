'use client';

import { useState, useEffect } from 'react';
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
import { getFY, currentFY, isPreviousFYOpen, fyShort } from '@/lib/fy-utils';
import { getEffectiveOcrCount, incrementOcrUsage, checkLimit } from '@/lib/usage';
import type { PlanTier } from '@/lib/subscription';
import { isSubscriptionActive } from '@/lib/subscription';
import type { SubscriptionStatus } from '@/lib/subscription';

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
  const [ocrCount, setOcrCount] = useState(0);
  const [ocrMax, setOcrMax] = useState(-1);
  const [ocrResetDate, setOcrResetDate] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '', category: 'Other', amount: '',
    gstClaimable: true, gstOverride: '', date: new Date().toISOString().split('T')[0], notes: ''
  });

  useEffect(() => {
    const loadOcrUsage = async () => {
      try {
        const client = generateClient<Schema>();
        const { data: profiles } = await client.models.CompanyProfile.list();
        const profile = profiles?.[0];
        if (profile) {
          setProfileId(profile.id);
          const plan = (profile.subscriptionPlan as PlanTier) || null;
          const status = (profile.subscriptionStatus as SubscriptionStatus) || null;
          const effectivePlan = plan;
          if (effectivePlan && isSubscriptionActive(status)) {
            const effective = getEffectiveOcrCount(
              profile.ocrUsageCount ?? 0,
              profile.ocrUsageResetDate ?? null
            );
            setOcrCount(effective);
            setOcrResetDate(profile.ocrUsageResetDate ?? null);
            const limit = checkLimit('ocr', effective, effectivePlan);
            setOcrMax(limit.max);
          }
        }
      } catch (error) {
        console.error('Error loading OCR usage:', error);
      }
    };
    loadOcrUsage();
  }, []);

  const ocrLimitReached = ocrMax !== -1 && ocrMax !== 0 && ocrCount >= ocrMax;
  const ocrHidden = ocrMax === 0;

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
          ...(vendor && { category: inferCategory(vendor) }),
        }));
        toast.success('Receipt scanned — check the auto-filled fields');
      }
    } catch (e) {
      console.error('OCR error:', e);
      toast.error('Failed to scan receipt. You can still fill in manually.');
    } finally { setScanning(false); }

    // Increment OCR usage counter after successful scan
    if (profileId) {
      try {
        const ocrClient = generateClient<Schema>();
        const { newCount, newResetDate } = await incrementOcrUsage(
          ocrClient, profileId, ocrCount, ocrResetDate
        );
        setOcrCount(newCount);
        setOcrResetDate(newResetDate);
      } catch (err) {
        console.error('Failed to increment OCR usage:', err);
      }
    }
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

  const inferCategory = (vendor: string): string => {
    const v = vendor.toLowerCase();
    const rules: [RegExp, string][] = [
      [/spark|vodafone|one nz|2degrees|skinny|orcon|slingshot|chorus/i, 'Communication (Phone & Internet)'],
      [/aws|amazon web|google cloud|azure|github|atlassian|slack|zoom|adobe|microsoft|dropbox|canva|xero|myob/i, 'Software & Subscriptions'],
      [/uber eats|doordash|menulog|restaurant|cafe|coffee|bistro|pizza|sushi|burger|mcdonald|kfc|subway|biryani/i, 'Entertainment (50% deductible)'],
      [/uber|taxi|grab|air new zealand|jetstar|qantas|booking\.com|airbnb|hotel|motel|flight/i, 'Travel & Accommodation'],
      [/bp|z energy|mobil|caltex|noel leeming|pb tech|warehouse|bunnings|mitre 10/i, 'Office Expenses'],
      [/state|aia|partners life|southern cross|tower|ami|aa insurance/i, 'Insurance'],
      [/anz|asb|bnz|westpac|kiwibank|wise|transferwise|paypal|stripe/i, 'Interest & Bank Fees'],
      [/deloitte|kpmg|ey|pwc|accountant|lawyer|solicitor|barrister|legal/i, 'Legal & Accounting'],
      [/facebook|google ads|meta|linkedin|mailchimp|hubspot/i, 'Advertising & Marketing'],
      [/mechanic|oil|tyre|tire|wof|rego|vtnz|aa |petrol|diesel/i, 'Motor Vehicle'],
      [/plumber|electrician|builder|painter|repair|maintenance/i, 'Repairs & Maintenance'],
    ];
    for (const [pattern, category] of rules) {
      if (pattern.test(v)) return category;
    }
    return 'Other';
  };

  const handleReceiptSelect = (file: File) => {
    setReceiptFile(file);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      toast.success('PDF attached — please fill in details manually');
    } else {
      handleScanReceipt(file);
    }
  };

  const amount = parseFloat(formData.amount) || 0;
  const gstOverride = formData.gstOverride !== '' ? parseFloat(formData.gstOverride) : null;
  const gstAmount = !formData.gstClaimable ? 0 : gstOverride != null ? gstOverride : Math.round(amount * 3 / 23 * 100) / 100;
  const amountExGst = amount - gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(expenseSchema, {
      description: formData.description, amount, date: formData.date, category: formData.category,
    });
    if (!result.success) { setErrors(result.errors); toast.error('Please fix the errors below'); return; }
    // Block if expense date is in a closed FY
    if (getFY(formData.date) < currentFY() && !isPreviousFYOpen()) {
      toast.error(`${fyShort(getFY(formData.date))} is closed — cutoff was May 15`); return;
    }
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
                {formData.date && getFY(formData.date) < currentFY() && (
                  <p className={`text-xs mt-1 ${isPreviousFYOpen() ? 'text-amber-500' : 'text-red-500'}`}>
                    {isPreviousFYOpen()
                      ? `⚠ This falls in ${fyShort(getFY(formData.date))} (previous year) — open until May 15`
                      : `✕ ${fyShort(getFY(formData.date))} is closed — cutoff was May 15`}
                  </p>
                )}
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
                    {formData.gstClaimable ? (
                      <input type="number" min="0" step="0.01" value={formData.gstOverride}
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
              <label className={t.label}>Receipt {scanning && <span className="text-indigo-500 ml-2"><Loader2 className="w-3 h-3 inline animate-spin" /> Scanning...</span>}</label>
              {!ocrHidden && ocrMax !== -1 && (
                <p className={`text-xs mb-2 ${ocrLimitReached ? 'text-amber-500' : dark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {ocrLimitReached
                    ? `You've used ${ocrCount} of ${ocrMax} receipt scans this month. Upgrade for unlimited scans.`
                    : `${ocrCount} / ${ocrMax} scans used this month`}
                </p>
              )}
              {receiptFile ? (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${dark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <span className={`text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{receiptFile.name}</span>
                  <button type="button" onClick={() => setReceiptFile(null)} className="text-red-400 hover:text-red-300 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : !ocrHidden ? (
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
                    ocrLimitReached
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  } ${dark ? 'border-2 border-dashed border-purple-500/40 hover:border-purple-500 text-slate-400' : 'border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-500'}`}>
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">{ocrLimitReached ? 'Scan limit reached' : 'Snap or upload receipt'}</span>
                    {!ocrLimitReached && (
                      <input type="file" accept="image/*,.pdf" capture="environment" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleReceiptSelect(e.target.files[0])} />
                    )}
                  </label>
                </div>
              ) : null}
              {!ocrHidden && !ocrLimitReached && (
                <p className={`text-xs mt-1 ${t.textMuted}`}>Receipt will be auto-scanned to fill in amount, date, and vendor</p>
              )}
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
              <Link href="/expenses" className={t.btnGhost}>Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
