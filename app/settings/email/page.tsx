'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';

export default function EmailPreferencesPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string>('');
  const [prefs, setPrefs] = useState({
    emailSubjectTemplate: 'Invoice {invoiceNumber} from {companyName}',
    emailBodyTemplate: 'Please find attached invoice {invoiceNumber} for {total}.\n\nPayment is due by {dueDate}.\n\nThank you for your business.',
    emailReplyTo: '',
    emailCcSelf: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const client = generateClient<Schema>();
        const { data } = await client.models.CompanyProfile.list();
        if (data?.[0]) {
          setProfileId(data[0].id);
          setPrefs({
            emailSubjectTemplate: data[0].emailSubjectTemplate || prefs.emailSubjectTemplate,
            emailBodyTemplate: data[0].emailBodyTemplate || prefs.emailBodyTemplate,
            emailReplyTo: data[0].emailReplyTo || '',
            emailCcSelf: data[0].emailCcSelf ?? true,
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) { toast.error('Please set up your company profile first'); return; }
    setSaving(true);
    try {
      const client = generateClient<Schema>();
      await client.models.CompanyProfile.update({ id: profileId, ...prefs });
      toast.success('Email preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className={dark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-900'}>Email Preferences</h1>
        <p className={`mt-1 ${t.textMuted}`}>Customize how invoice emails are sent to clients</p>
      </div>

      <form onSubmit={handleSave} className={`${t.card} space-y-6`}>
        <div>
          <label className={t.label}>Reply-To Email</label>
          <input type="email" value={prefs.emailReplyTo}
            onChange={(e) => setPrefs({ ...prefs, emailReplyTo: e.target.value })}
            placeholder="your@email.com (defaults to company email)" className={t.input} />
          <p className={`text-xs mt-1 ${t.textMuted}`}>When clients reply to the invoice email, it goes to this address</p>
        </div>

        <div>
          <label className={t.label}>Email Subject Template</label>
          <input type="text" value={prefs.emailSubjectTemplate}
            onChange={(e) => setPrefs({ ...prefs, emailSubjectTemplate: e.target.value })}
            className={t.input} />
          <p className={`text-xs mt-1 ${t.textMuted}`}>
            Available tokens: {'{invoiceNumber}'}, {'{companyName}'}, {'{clientName}'}, {'{total}'}
          </p>
        </div>

        <div>
          <label className={t.label}>Email Body Template</label>
          <textarea rows={6} value={prefs.emailBodyTemplate}
            onChange={(e) => setPrefs({ ...prefs, emailBodyTemplate: e.target.value })}
            className={t.input} />
          <p className={`text-xs mt-1 ${t.textMuted}`}>
            Available tokens: {'{invoiceNumber}'}, {'{companyName}'}, {'{clientName}'}, {'{total}'}, {'{dueDate}'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="ccSelf" checked={prefs.emailCcSelf}
            onChange={(e) => setPrefs({ ...prefs, emailCcSelf: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <label htmlFor="ccSelf" className={dark ? 'text-slate-300' : 'text-gray-700'}>
            Send me a copy of every invoice email (CC)
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving} className={t.btnPrimary}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
