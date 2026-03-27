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

const client = generateClient<Schema>();

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
  const [profile, setProfile] = useState({
    companyName: '', companyEmail: '', companyPhone: '', companyAddress: '',
    companyCity: '', companyState: '', companyPostalCode: '', companyCountry: 'New Zealand',
    gstNumber: '', bankAccount: '', defaultCurrency: 'NZD', defaultGstRate: 15,
    defaultTemplate: 'modern' as TemplateName,
  });

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
            });
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
      const saveData = { ...profile, ...(logoUrl && { logoUrl }) };
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

      <form onSubmit={handleSubmit} className={`${t.card} space-y-6`}>
        {/* Logo Upload */}
        <div>
          <h2 className={`${t.sectionTitle} mb-4`}>Company Logo</h2>
          <div className="flex items-center gap-6">
            {(logoPreview || logoFile) ? (
              <img src={logoFile ? URL.createObjectURL(logoFile) : logoPreview}
                alt="Logo" className="w-20 h-20 rounded-lg object-contain border border-gray-200" />
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
              <button key={tmpl.id} type="button"
                onClick={() => setProfile({ ...profile, defaultTemplate: tmpl.id })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  profile.defaultTemplate === tmpl.id
                    ? theme === 'dark' ? 'border-purple-500 bg-purple-500/10' : 'border-indigo-600 bg-indigo-50'
                    : theme === 'dark' ? 'border-purple-500/20 hover:border-purple-500/50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tmpl.name}</div>
                <div className={`text-xs mt-1 ${t.textMuted}`}>{tmpl.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => router.push('/dashboard')} className={t.btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={t.btnPrimary}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
