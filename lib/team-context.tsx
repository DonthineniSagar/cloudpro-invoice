'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

type TeamRole = 'OWNER' | 'VIEWER' | null;

interface TeamContextValue {
  role: TeamRole;
  ownerUserId: string | null;
  ownerCompanyName: string | null;
  isViewer: boolean;
  loading: boolean;
  pendingInvite: PendingInvite | null;
  acceptInvite: () => Promise<void>;
  declineInvite: () => Promise<void>;
}

interface PendingInvite {
  id: string;
  companyName: string | null;
  ownerUserId: string;
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<TeamRole>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [ownerCompanyName, setOwnerCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      setOwnerUserId(null);
      setOwnerCompanyName(null);
      setPendingInvite(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function detectRole() {
      try {
        const client = generateClient<Schema>();

        // Check if user owns any CompanyMember records (they invited someone)
        const { data: ownedMembers } = await client.models.CompanyMember.listCompanyMemberByOwnerUserId(
          { ownerUserId: user!.id }
        );
        if (!cancelled && ownedMembers && ownedMembers.length > 0) {
          setRole('OWNER');
          setOwnerUserId(null);
          setOwnerCompanyName(null);
          setPendingInvite(null);
          setLoading(false);
          return;
        }

        // Check if user is an ACTIVE member of someone else's company
        const { data: activeMemberships } = await client.models.CompanyMember.listCompanyMemberByMemberUserId(
          { memberUserId: user!.id }
        );
        const activeMembership = activeMemberships?.find(m => m.status === 'ACTIVE');
        if (!cancelled && activeMembership) {
          setRole('VIEWER');
          setOwnerUserId(activeMembership.ownerUserId);
          setOwnerCompanyName(activeMembership.companyName || null);
          setPendingInvite(null);
          setLoading(false);
          return;
        }

        // Check for pending invites by email
        if (user!.email) {
          const { data: invites } = await client.models.CompanyMember.listCompanyMemberByEmail(
            { email: user!.email }
          );
          const invite = invites?.find(m => m.status === 'INVITED');
          if (!cancelled && invite) {
            setPendingInvite({
              id: invite.id,
              companyName: invite.companyName || null,
              ownerUserId: invite.ownerUserId,
            });
          }
        }

        if (!cancelled) {
          setRole(null);
          setOwnerUserId(null);
          setOwnerCompanyName(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to detect team role:', err);
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
      }
    }

    detectRole();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  const acceptInvite = useCallback(async () => {
    if (!pendingInvite || !user?.id) return;
    try {
      const client = generateClient<Schema>();
      await client.models.CompanyMember.update({
        id: pendingInvite.id,
        memberUserId: user.id,
        status: 'ACTIVE',
      });
      setRole('VIEWER');
      setOwnerUserId(pendingInvite.ownerUserId);
      setOwnerCompanyName(pendingInvite.companyName);
      setPendingInvite(null);
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  }, [pendingInvite, user?.id]);

  const declineInvite = useCallback(async () => {
    if (!pendingInvite) return;
    try {
      const client = generateClient<Schema>();
      await client.models.CompanyMember.delete({ id: pendingInvite.id });
      setPendingInvite(null);
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  }, [pendingInvite]);

  return (
    <TeamContext.Provider value={{
      role,
      ownerUserId,
      ownerCompanyName,
      isViewer: role === 'VIEWER',
      loading,
      pendingInvite,
      acceptInvite,
      declineInvite,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
}

type ModelName = 'Invoice' | 'InvoiceItem' | 'Client' | 'Expense' | 'CompanyProfile' | 'RecurringInvoice' | 'Notification';

interface UseTeamDataOptions {
  filter?: Record<string, unknown>;
  id?: string;
}

interface UseTeamDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeamData<T = Record<string, unknown>>(
  model: ModelName,
  options?: UseTeamDataOptions
): UseTeamDataResult<T> {
  const { role, ownerUserId } = useTeam();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => setRefetchKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        if (role === 'VIEWER' && ownerUserId) {
          // Viewer: fetch via API route
          const params = new URLSearchParams({ model, ownerUserId });
          if (options?.filter) params.set('filter', JSON.stringify(options.filter));
          if (options?.id) params.set('id', options.id);

          const res = await fetch(`/api/team/data?${params.toString()}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to fetch ${model}`);
          }
          const json = await res.json();
          if (!cancelled) setData(json.data || []);
        } else {
          // Owner or solo user: use normal Amplify client
          const client = generateClient<Schema>();
          const modelRef = client.models[model] as Record<string, unknown>;

          if (options?.id && typeof modelRef.get === 'function') {
            const { data: item } = await (modelRef.get as (args: { id: string }) => Promise<{ data: unknown }>)({ id: options.id });
            if (!cancelled) setData(item ? [item as T] : []);
          } else if (typeof modelRef.list === 'function') {
            const listArgs: Record<string, unknown> = {};
            if (options?.filter) listArgs.filter = options.filter;
            const { data: items } = await (modelRef.list as (args?: Record<string, unknown>) => Promise<{ data: unknown[] }>)(
              Object.keys(listArgs).length > 0 ? listArgs : undefined
            );
            if (!cancelled) setData((items || []) as T[]);
          }
        }
      } catch (err) {
        console.error(`useTeamData(${model}) error:`, err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [model, role, ownerUserId, options?.id, JSON.stringify(options?.filter), refetchKey]);

  return { data, loading, error, refetch };
}
