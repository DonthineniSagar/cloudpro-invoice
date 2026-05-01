'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import type { Schema } from '@/amplify/data/resource';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { TEMPLATES } from '@/lib/generate-pdf';
import type { TemplateName } from '@/lib/generate-pdf';
import TemplateThumbnail from '@/components/TemplateThumbnail';
import { Mail, Plus, X, Copy, Check, Shield } from 'lucide-react';
import BillingStatus from '@/components/BillingStatus';
import type { PlanTier, SubscriptionStatus } from '@/lib/subscription';

const client = generateClient<Schema>();
const INGEST_DOMAIN = 'expenses.cloudpro-digital.co.nz';

export default function CompanyProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [subPlan, setSubPlan] = useState<PlanTier | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [ingest, setIngest] = useState({
    expenseIngestKey: '',
    expenseIngestActive: false,
    expenseWhitelistedEmails: [] as string[],
  });
  const [profile, setProfile] = useState({
    companyName: '', companyEmail: '', companyPhone: '', companyAddress: '',
    companyCity: '', companyState: '', companyPostalCode: '', companyCountry: 'New Zealand',
    gstNumber: '', bankAccount: '', defaultCurrency: 'NZD', defaultGstRate: 15,
    defaultTemplate: 'modern' as TemplateName,
    accentColor: '#6366F1',
    invoiceFooterText: '',
  });
  const [hexError, setHexError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          setLoading(true);
          const { data } = await client.models.CompanyProfile.list();
          if (data && data.length > 0) {
            const e = data[0];
            setProfile({
              companyName: e.companyName || '', companyEmail: e.companyEmail || '',
              companyPhone: e.companyPhone || '', companyAddress: e.companyAddress || '',
              companyCity: e.companyCity || '', companyState: e.companyState || '',
              companyPostalCode: e.companyPostalCode || '', companyCountry: e.companyCountry || 'New Zealand',
              gstNumber: e.gstNumber || '', bankAccount: e.bankAccount || '',
              defaultCurrency: e.defaultCurrency || 'NZD', defaultGstRate: e.defaultGstRate || 15,
              defaultTemplate: (e.defaultTemplate as TemplateName) || 'modern',
              accentColor: e.accentColor || '#6366F1',
              invoiceFooterText: e.invoiceFooterText || '',
            });
            setIngest({
              expenseIngestKey: e.expenseIngestKey || '',
              expenseIngestActive: e.expenseIngestActive ?? false,
              expenseWhitelistedEmails: (e.expenseWhitelistedEmails?.filter(Boolean) as string[]) ?? [],
            });
            setStripeCustomerId(e.stripeCustomerId || null);
            setSubPlan((e.subscriptionPlan as PlanTier) || null);
            setSubStatus((e.subscriptionStatus as SubscriptionStatus) || null);
            setTrialEndDate(e.trialEndDate || null);
            if (e.logoUrl) {
              try {
                const { url } = await getUrl({ path: e.logoUrl });
                setLogoPreview(url.toString());
              } catch {}
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Auto-add any pending whitelist email before saving
    const pending = newWhitelistEmail.trim().toLowerCase();
    if (pending && !ingest.expenseWhitelistedEmails.includes(pending)) {
      ingest.expenseWhitelistedEmails.push(pending);
      setNewWhitelistEmail('');
    }
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        const result = await uploadData({
          path: ({identityId}) => `invoices/${identityId}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`,
          data: logoFile,
          options: { contentType: logoFile.type },
        }).result;
        logoUrl = result.path;
      }
      const { data: existing } = await client.models.CompanyProfile.list();
      // Get Cognito identity ID for S3 path scoping (used by email ingest Lambda)
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const cognitoIdentityId = session.identityId || '';
      const saveData = {
        ...profile,
        accentColor: profile.accentColor || '#6366F1',
        invoiceFooterText: profile.invoiceFooterText || '',
        ...(logoUrl && { logoUrl }),
        ...(ingest.expenseIngestKey ? { expenseIngestKey: ingest.expenseIngestKey } : {}),
        expenseIngestActive: ingest.expenseIngestActive || false,
        ...(ingest.expenseWhitelistedEmails?.length ? { expenseWhitelistedEmails: ingest.expenseWhitelistedEmails } : {}),
        identityId: cognitoIdentityId,
      };
      console.log('saveData:', JSON.stringify(saveData, null, 2));
      console.log('profile.accentColor:', profile.accentColor);
      if (existing && existing.length > 0) {
        await client.models.CompanyProfile.update({ id: existing[0].id, ...saveData });
      } else {
        await client.models.CompanyProfile.create({ ...saveData, userId: user!.id });
      }
      toast.success('Profile saved');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className={t.textMuted}>Loading...</div></div>;
  }
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Company Profile</h1>
        <p className={`mt-1 ${t.textMuted}`}>Set up your business details for invoices</p>
      </div>

      {/* Billing Status */}
      <div className="mb-6">
        <BillingStatus
          plan={subPlan}
          status={subStatus}
          trialEndDate={trialEndDate}
          dark={theme === 'dark'}
        />
      </div>

      <form onSubmit={handleSubmit} className={`${t.card} space-y-6`}>
        {/* Logo Upload */}
        <div>
          <h2 className={`${t.sectionTitle} mb-4`}>Company Logo</h2>
          <div className="flex items-center gap-6">
            {(logoPreview || logoFile) ? (
              <img src={logoFile ? URL.createObjectURL(logoFile) : logoPreview}
                alt="Logo" className="w-20 h-20 rounded-lg object-contain border-2 border-indigo-600" />
            ) : (
              <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-3xl ${theme === 'dark' ? 'bg-purple-900/20 border-2 border-purple-500/30' : 'bg-gray-100 border-2 border-gray-200'}`}>🏢</div>
            )}
            <div>
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm ${theme === 'dark' ? 'bg-purple-900/30 border border-purple-500/40 text-purple-400 hover:bg-purple-900/50' : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}>
                {logoPreview || logoFile ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </label>
              <p className={`text-xs mt-2 ${t.textMuted}`}>PNG or JPG, will appear on invoices</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className={`${t.sectionTitle} mb-4`}>Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={t.label}>Company Name *</label>
              <input type="text" required value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Email</label>
              <input type="email" value={profile.companyEmail}
                onChange={(e) => setProfile({ ...profile, companyEmail: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Phone</label>
              <input type="tel" value={profile.companyPhone}
                onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })} className={t.input} />
            </div>
            <div className="md:col-span-2">
              <label className={t.label}>Address</label>
              <input type="text" value={profile.companyAddress}
                onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>City</label>
              <input type="text" value={profile.companyCity}
                onChange={(e) => setProfile({ ...profile, companyCity: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>State/Region</label>
              <input type="text" value={profile.companyState}
                onChange={(e) => setProfile({ ...profile, companyState: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Postal Code</label>
              <input type="text" value={profile.companyPostalCode}
                onChange={(e) => setProfile({ ...profile, companyPostalCode: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Country</label>
              <input type="text" value={profile.companyCountry}
                onChange={(e) => setProfile({ ...profile, companyCountry: e.target.value })} className={t.input} />
            </div>
          </div>
        </div>

        <div>
          <h2 className={`${t.sectionTitle} mb-4`}>Tax & Banking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={t.label}>GST Number</label>
              <input type="text" value={profile.gstNumber} placeholder="12-345-678"
                onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Bank Account</label>
              <input type="text" value={profile.bankAccount} placeholder="12-3456-7890123-00"
                onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })} className={t.input} />
            </div>
            <div>
              <label className={t.label}>Default Currency</label>
              <input type="text" value={profile.defaultCurrency} readOnly
                className={`${t.input} opacity-50 cursor-not-allowed`} />
            </div>
            <div>
              <label className={t.label}>Default GST Rate (%)</label>
              <input type="number" value={profile.defaultGstRate} readOnly
                className={`${t.input} opacity-50 cursor-not-allowed`} />
            </div>
          </div>
        </div>

        <div>
          <h2 className={`${t.sectionTitle} mb-4`}>Invoice Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATES.map(tmpl => (
              <div key={tmpl.id} className="space-y-2">
                <TemplateThumbnail
                  templateId={tmpl.id}
                  accentColor={profile.accentColor || '#6366F1'}
                  selected={profile.defaultTemplate === tmpl.id}
                  dark={theme === 'dark'}
                  onClick={() => setProfile({ ...profile, defaultTemplate: tmpl.id })}
                />
                <div className="text-center">
                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tmpl.name}</div>
                  <div className={`text-xs ${t.textMuted}`}>{tmpl.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Accent Color Picker */}
          <div className="mt-6">
            <label className={t.label}>Accent Color</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={profile.accentColor || '#6366F1'}
                onChange={(e) => {
                  setProfile({ ...profile, accentColor: e.target.value });
                  setHexError('');
                }}
                className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                aria-label="Pick accent color"
              />
              <input
                type="text"
                value={profile.accentColor || '#6366F1'}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfile({ ...profile, accentColor: val });
                  if (val && !/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    setHexError('Enter a valid hex color (e.g. #6366F1)');
                  } else {
                    setHexError('');
                  }
                }}
                placeholder="#6366F1"
                maxLength={7}
                className={`${t.input} w-32 font-mono text-sm`}
                aria-label="Hex color code"
              />
              <button
                type="button"
                onClick={() => { setProfile({ ...profile, accentColor: '#6366F1' }); setHexError(''); }}
                className={`text-xs ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-500'}`}
              >
                Reset to default
              </button>
            </div>
            {hexError && (
              <p className="text-sm text-red-500 mt-1">{hexError}</p>
            )}
          </div>

          {/* Footer Text */}
          <div className="mt-6">
            <label className={t.label}>Invoice Footer Text</label>
            <textarea
              value={profile.invoiceFooterText}
              onChange={(e) => setProfile({ ...profile, invoiceFooterText: e.target.value })}
              placeholder="e.g. Thank you for your business. Payment due within 14 days."
              maxLength={500}
              rows={3}
              className={`${t.input} mt-1 resize-none`}
              aria-label="Invoice footer text"
            />
            <p className={`text-xs mt-1 ${
              profile.invoiceFooterText.length >= 450
                ? 'text-amber-500'
                : t.textMuted
            }`}>
              {profile.invoiceFooterText.length} / 500 characters
            </p>
          </div>
        </div>

        {/* Expense Email Ingest */}
        <div>
          <h2 className={`${t.sectionTitle} mb-1`}>Expense Email Ingest</h2>
          <p className={`text-xs mb-4 ${t.textMuted}`}>Forward bills and receipts to your unique email to auto-create expenses</p>

          <div className="space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={ingest.expenseIngestActive}
                onChange={(e) => {
                  const active = e.target.checked;
                  setIngest(prev => ({
                    ...prev,
                    expenseIngestActive: active,
                    expenseIngestKey: active && !prev.expenseIngestKey
                      ? Math.random().toString(36).substring(2, 10)
                      : prev.expenseIngestKey,
                  }));
                }}
                className="w-4 h-4 rounded" />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Enable email-to-expense
              </span>
            </label>

            {ingest.expenseIngestActive && ingest.expenseIngestKey && (
              <>
                {/* Ingest email address */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                  <Mail className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-purple-400' : 'text-indigo-500'}`} />
                  <code className={`text-sm flex-1 ${theme === 'dark' ? 'text-purple-300' : 'text-indigo-700'}`}>
                    {ingest.expenseIngestKey}@{INGEST_DOMAIN}
                  </code>
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText(`${ingest.expenseIngestKey}@${INGEST_DOMAIN}`);
                    setCopied(true); setTimeout(() => setCopied(false), 2000);
                  }} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-purple-500/20' : 'hover:bg-indigo-100'}`}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className={`w-4 h-4 ${t.textMuted}`} />}
                  </button>
                </div>
                <p className={`text-xs ${t.textMuted}`}>Set up email forwarding rules from your vendors to this address</p>

                {/* Whitelisted senders */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-indigo-500'}`} />
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Whitelisted Senders
                    </label>
                  </div>
                  <p className={`text-xs mb-3 ${t.textMuted}`}>
                    Only emails from these addresses will be processed. Use *@domain.com for all addresses from a domain.
                  </p>

                  {/* Existing whitelist */}
                  <div className="space-y-2 mb-3">
                    {ingest.expenseWhitelistedEmails.map((email, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-black border border-purple-500/20' : 'bg-white border-2 border-indigo-600'}`}>
                        <span className={`flex-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{email}</span>
                        <button type="button" onClick={() => setIngest(prev => ({
                          ...prev,
                          expenseWhitelistedEmails: prev.expenseWhitelistedEmails.filter((_, j) => j !== i),
                        }))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {ingest.expenseWhitelistedEmails.length === 0 && (
                      <p className={`text-xs italic ${t.textMuted}`}>No senders whitelisted — all emails will be rejected</p>
                    )}
                  </div>

                  {/* Add new */}
                  <div className="flex gap-2">
                    <input type="text" value={newWhitelistEmail}
                      onChange={(e) => setNewWhitelistEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = newWhitelistEmail.trim().toLowerCase();
                          if (v && !ingest.expenseWhitelistedEmails.includes(v)) {
                            setIngest(prev => ({ ...prev, expenseWhitelistedEmails: [...prev.expenseWhitelistedEmails, v] }));
                            setNewWhitelistEmail('');
                          }
                        }
                      }}
                      placeholder="noreply@spark.co.nz or *@xero.com"
                      className={`${t.input} flex-1`} />
                    <button type="button" onClick={() => {
                      const v = newWhitelistEmail.trim().toLowerCase();
                      if (v && !ingest.expenseWhitelistedEmails.includes(v)) {
                        setIngest(prev => ({ ...prev, expenseWhitelistedEmails: [...prev.expenseWhitelistedEmails, v] }));
                        setNewWhitelistEmail('');
                      }
                    }} className={t.btnSecondary}><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => router.push('/dashboard')} className={t.btnGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={t.btnPrimary}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
