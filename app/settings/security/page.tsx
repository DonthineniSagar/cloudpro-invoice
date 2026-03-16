'use client';

import { useState } from 'react';
import { updatePassword } from 'aws-amplify/auth';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';

export default function SecurityPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMessage('Passwords do not match'); return; }
    if (newPassword.length < 8) { setMessage('Password must be at least 8 characters'); return; }
    setLoading(true);
    setMessage('');
    try {
      await updatePassword({ oldPassword, newPassword });
      setMessage('Password updated successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className={t.card}>
        <h3 className={t.sectionTitle + ' mb-6'}>Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.includes('success')
                ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                : 'bg-red-900/30 text-red-400 border border-red-500/30'
            }`}>{message}</div>
          )}
          <div>
            <label className={t.label}>Current Password</label>
            <input type="password" required value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)} className={t.input} />
          </div>
          <div>
            <label className={t.label}>New Password</label>
            <input type="password" required value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} className={t.input} />
          </div>
          <div>
            <label className={t.label}>Confirm New Password</label>
            <input type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className={t.input} />
          </div>
          <button type="submit" disabled={loading} className={`w-full ${t.btnPrimary}`}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
