'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';

export default function ProfilePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = tc(theme);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const attributes = await fetchUserAttributes();
        setFirstName(attributes.given_name || '');
        setLastName(attributes.family_name || '');
        setEmail(attributes.email || '');
        setPhoneNumber(attributes.phone_number || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const updates: any = { given_name: firstName, family_name: lastName };
      if (phoneNumber) updates.phone_number = phoneNumber;
      await updateUserAttributes({ userAttributes: updates });
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className={t.card}>
        <h3 className={t.sectionTitle + ' mb-6'}>Profile Information</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.includes('success')
                ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                : 'bg-red-900/30 text-red-400 border border-red-500/30'
            }`}>
              {message}
            </div>
          )}

          <div>
            <label className={t.label}>First Name</label>
            <input type="text" required value={firstName}
              onChange={(e) => setFirstName(e.target.value)} className={t.input} />
          </div>

          <div>
            <label className={t.label}>Last Name</label>
            <input type="text" required value={lastName}
              onChange={(e) => setLastName(e.target.value)} className={t.input} />
          </div>

          <div>
            <label className={t.label}>Phone Number</label>
            <input type="tel" value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+64 21 123 4567" className={t.input} />
            <p className={`mt-1 text-sm ${t.textMuted}`}>For 2FA and notifications (optional)</p>
          </div>

          <div>
            <label className={t.label}>Email</label>
            <input type="email" disabled value={email}
              className={`${t.input} opacity-50 cursor-not-allowed`} />
            <p className={`mt-1 text-sm ${t.textMuted}`}>Email cannot be changed</p>
          </div>

          <button type="submit" disabled={loading} className={`w-full ${t.btnPrimary}`}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
