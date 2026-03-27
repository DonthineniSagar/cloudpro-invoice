/**
 * Skeleton loading components for dashboard, invoice table, and client cards.
 * Used as placeholders while data loads from the API.
 */
'use client';

import { useTheme } from '@/lib/theme-context';

/** Animated pulse bar — base building block for all skeletons */
function Pulse({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  return (
    <div className={`animate-pulse rounded ${theme === 'dark' ? 'bg-purple-500/10' : 'bg-gray-200'} ${className}`} />
  );
}

/** Single metric card skeleton (used in dashboard grid) */
export function MetricCardSkeleton() {
  const { theme } = useTheme();
  return (
    <div className={theme === 'dark' ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40' : 'bg-white p-6 rounded-xl shadow-sm border border-gray-200'}>
      <Pulse className="h-4 w-24 mb-3" />
      <Pulse className="h-8 w-32" />
    </div>
  );
}

/** Table row skeleton for invoice/expense lists */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4"><Pulse className="h-4 w-full max-w-[120px]" /></td>
      ))}
    </tr>
  );
}

/** Client card skeleton for the clients grid */
export function ClientCardSkeleton() {
  const { theme } = useTheme();
  return (
    <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-6' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'}>
      <Pulse className="h-5 w-36 mb-4" />
      <div className="space-y-3">
        <Pulse className="h-4 w-48" />
        <Pulse className="h-4 w-32" />
        <Pulse className="h-4 w-40" />
      </div>
    </div>
  );
}

/** Full dashboard skeleton — metric cards grid */
export function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
    </>
  );
}
