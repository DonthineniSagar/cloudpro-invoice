// Usage counting utility — derive counts from existing data, check against plan limits

import { type Schema } from '@/amplify/data/resource';
import { getPlanLimits } from '@/lib/subscription';
import type { PlanTier } from '@/lib/subscription';

type AmplifyClient = ReturnType<typeof import('aws-amplify/data').generateClient<Schema>>;

export interface LimitStatus {
  allowed: boolean;
  current: number;
  max: number;
  label: string;
}

/**
 * Calculate the start of the current billing period.
 * Uses Stripe subscription period end minus interval, or falls back to 1st of current month (NZST).
 */
export function getBillingPeriodStart(
  subscriptionCurrentPeriodEnd: string | null,
  subscriptionInterval: 'MONTHLY' | 'ANNUAL' | null
): string {
  if (subscriptionCurrentPeriodEnd && subscriptionInterval) {
    const periodEnd = new Date(subscriptionCurrentPeriodEnd);
    const periodStart = new Date(periodEnd);
    if (subscriptionInterval === 'ANNUAL') {
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    } else {
      periodStart.setMonth(periodStart.getMonth() - 1);
    }
    return periodStart.toISOString();
  }

  // Fallback: 1st of current month (NZST = UTC+12)
  const now = new Date();
  const nzNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const firstOfMonth = new Date(Date.UTC(nzNow.getUTCFullYear(), nzNow.getUTCMonth(), 1));
  return firstOfMonth.toISOString();
}

/**
 * Count invoices created in the current billing period, excluding CANCELLED.
 */
export async function getInvoiceCount(
  client: AmplifyClient,
  periodStart: string
): Promise<number> {
  const { data: invoices } = await client.models.Invoice.list({
    filter: {
      createdAt: { ge: periodStart },
      status: { ne: 'CANCELLED' },
    },
  });
  return invoices?.length ?? 0;
}

/**
 * Count total clients owned by the user.
 */
export async function getClientCount(client: AmplifyClient): Promise<number> {
  const { data: clients } = await client.models.Client.list();
  return clients?.length ?? 0;
}

/**
 * Get effective OCR count with lazy-reset logic.
 * If the reset date is in a previous calendar month (or null), count is effectively 0.
 */
export function getEffectiveOcrCount(
  ocrUsageCount: number | null,
  ocrUsageResetDate: string | null
): number {
  if (!ocrUsageResetDate) return 0;

  const resetDate = new Date(ocrUsageResetDate);
  const now = new Date();

  if (
    resetDate.getUTCFullYear() < now.getUTCFullYear() ||
    (resetDate.getUTCFullYear() === now.getUTCFullYear() &&
      resetDate.getUTCMonth() < now.getUTCMonth())
  ) {
    return 0;
  }

  return ocrUsageCount ?? 0;
}

/**
 * Increment OCR usage counter on CompanyProfile with lazy-reset.
 */
export async function incrementOcrUsage(
  client: AmplifyClient,
  profileId: string,
  currentCount: number,
  resetDate: string | null
): Promise<{ newCount: number; newResetDate: string }> {
  const effectiveCount = getEffectiveOcrCount(currentCount, resetDate);
  const isStaleReset = effectiveCount === 0 && (currentCount ?? 0) !== 0;

  const newCount = effectiveCount + 1;
  const newResetDate =
    isStaleReset || !resetDate ? new Date().toISOString() : resetDate;

  await client.models.CompanyProfile.update({
    id: profileId,
    ocrUsageCount: newCount,
    ocrUsageResetDate: newResetDate,
  });

  return { newCount, newResetDate };
}

/**
 * Pure function: check if a resource is within its plan limit.
 */
export function checkLimit(
  resource: 'invoices' | 'clients' | 'ocr',
  currentCount: number,
  plan: PlanTier | null
): LimitStatus {
  const limits = getPlanLimits(plan);

  let max: number;
  switch (resource) {
    case 'invoices':
      max = limits.maxInvoicesPerMonth;
      break;
    case 'clients':
      max = limits.maxClients;
      break;
    case 'ocr':
      max = limits.maxOcrPerMonth;
      break;
  }

  if (max === -1) {
    return { allowed: true, current: currentCount, max, label: `${currentCount} / ∞` };
  }

  return {
    allowed: currentCount < max,
    current: currentCount,
    max,
    label: `${currentCount} / ${max}`,
  };
}
