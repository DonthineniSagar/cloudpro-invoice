'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';
import { tc } from '@/lib/theme-classes';
import AppLayout from '@/components/AppLayout';
import UpgradePrompt from '@/components/UpgradePrompt';
import { canAccess } from '@/lib/subscription';
import type { PlanTier } from '@/lib/subscription';
import { UserPlus, Trash2, Shield, Eye } from 'lucide-react';

const client = generateClient<Schema>();

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  companyName: string | null;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [plan, setPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.id) return;
    try {
      const { data: profiles } = await client.models.CompanyProfile.list();
      const profile = profiles?.[0];
      if (profile) setPlan((profile.subscriptionPlan as PlanTier) || null);

      const { data: memberData } = await client.models.CompanyMember.listCompanyMemberByOwnerUserId(
        { ownerUserId: user.id }
      );
      setMembers((memberData || []).filter(m => m.status !== 'REMOVED').map(m => ({
        id: m.id, email: m.email, role: m.role || 'VIEWER',
        status: m.status || 'INVITED', companyName: m.companyName || null,
      })));
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (email === user?.email?.toLowerCase()) {
      toast.error("You can't invite yourself."); return;
    }
    if (members.some(m => m.email === email && m.status !== 'REMOVED')) {
      toast.error('This email already has a pending invite or is a member.'); return;
    }
    if (members.filter(m => m.status !== 'REMOVED').length >= 1) {
      toast.error('Your plan allows up to 2 users. Remove the existing member first.'); return;
    }

    setInviting(true);
    try {
      const { data: profiles } = await client.models.CompanyProfile.list();
      const companyName = profiles?.[0]?.companyName || 'Unknown';

      await client.models.CompanyMember.create({
        ownerUserId: user!.id,
        email,
        role: 'VIEWER',
        status: 'INVITED',
        companyName,
      });
      toast.success(`Invitation created for ${email}`);
      setInviteEmail('');
      setShowInviteForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to invite:', err);
      toast.error('Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this team member?')) return;
    try {
      await client.models.CompanyMember.update({ id: memberId, status: 'REMOVED' });
      toast.success('Member removed.');
      loadData();
    } catch (err) {
      console.error('Failed to remove:', err);
      toast.error('Failed to remove member.');
    }
  }

  if (!loading && !canAccess(plan, 'multi_user')) {
    return <AppLayout><UpgradePrompt feature="Team Members" requiredPlan="Business Pro" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={dark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-900'}>Team</h1>
            <p className={t.textMuted}>Manage who can view your account</p>
          </div>
        </div>

        <div className={t.card}>
          {/* Owner row */}
          <div className={`flex items-center justify-between py-3 ${dark ? 'border-b border-gray-800' : 'border-b border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${dark ? 'text-purple-400' : 'text-primary-500'}`} />
              <div>
                <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
                </p>
                <p className={`text-xs ${t.textMuted}`}>{user?.email}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${dark ? 'bg-purple-900/30 text-purple-400' : 'bg-primary-100 text-primary-700'}`}>
              Owner
            </span>
          </div>

          {/* Members */}
          {members.map(member => (
            <div key={member.id} className={`flex items-center justify-between py-3 ${dark ? 'border-b border-gray-800' : 'border-b border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <Eye className={`w-5 h-5 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{member.email}</p>
                  <p className={`text-xs ${t.textMuted}`}>Viewer (read-only)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  member.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {member.status === 'ACTIVE' ? 'Active' : 'Invited'}
                </span>
                <button onClick={() => handleRemove(member.id)}
                  className={`p-1 rounded ${dark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'}`}
                  title="Remove member">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Invite form */}
          {showInviteForm ? (
            <form onSubmit={handleInvite} className="pt-4 flex gap-2">
              <input type="email" required placeholder="Email address"
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className={`flex-1 ${t.input}`} />
              <button type="submit" disabled={inviting} className={t.btnPrimary}>
                {inviting ? 'Inviting...' : 'Send Invite'}
              </button>
              <button type="button" onClick={() => setShowInviteForm(false)} className={t.btnSecondary}>
                Cancel
              </button>
            </form>
          ) : (
            <div className="pt-4">
              <button onClick={() => setShowInviteForm(true)}
                disabled={members.filter(m => m.status !== 'REMOVED').length >= 1}
                className={`flex items-center gap-2 ${t.btnPrimary} ${members.filter(m => m.status !== 'REMOVED').length >= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
              {members.filter(m => m.status !== 'REMOVED').length >= 1 && (
                <p className={`text-xs mt-2 ${t.textMuted}`}>Your plan allows up to 2 users (including you). Remove the existing member to invite someone new.</p>
              )}
            </div>
          )}

          <p className={`text-xs mt-4 ${t.textMuted}`}>
            Invited members get read-only access to your invoices, expenses, clients, and reports. They cannot create, edit, or delete anything.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
