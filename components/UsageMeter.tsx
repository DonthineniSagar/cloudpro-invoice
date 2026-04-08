'use client';

import Link from 'next/link';
import { checkLimit } from '@/lib/usage';
import type { PlanTier } from '@/lib/subscription';

interface UsageMeterProps {
  invoiceCount: number;
  clientCount: number;
  ocrCount: number;
  plan: PlanTier | null;
  dark: boolean;
}

interface MeterBarProps {
  label: string;
  current: number;
  max: number;
  dark: boolean;
}

function MeterBar({ label, current, max, dark }: MeterBarProps) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const barColor =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 70
        ? 'bg-amber-500'
        : dark
          ? 'bg-purple-500'
          : 'bg-indigo-500';

  return (
    <Link href="/#pricing" className="block group">
      <div className="flex justify-between text-xs mb-1">
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>
          {label}
        </span>
        <span
          className={`font-medium ${
            pct >= 90
              ? 'text-red-500'
              : pct >= 70
                ? 'text-amber-500'
                : dark
                  ? 'text-slate-300'
                  : 'text-gray-700'
          }`}
        >
          {current} / {max}
        </span>
      </div>
      <div
        className={`h-1.5 rounded-full overflow-hidden ${
          dark ? 'bg-slate-700' : 'bg-gray-200'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

export default function UsageMeter({
  invoiceCount,
  clientCount,
  ocrCount,
  plan,
  dark,
}: UsageMeterProps) {
  if (!plan) return null;

  const invoiceLimit = checkLimit('invoices', invoiceCount, plan);
  const clientLimit = checkLimit('clients', clientCount, plan);
  const ocrLimit = checkLimit('ocr', ocrCount, plan);

  const hasFiniteLimits =
    invoiceLimit.max !== -1 || clientLimit.max !== -1 || ocrLimit.max !== -1;

  if (!hasFiniteLimits) return null;

  return (
    <div
      className={`px-3 py-3 space-y-2 border-t ${
        dark ? 'border-purple-500/20' : 'border-gray-100'
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          dark ? 'text-slate-500' : 'text-gray-400'
        }`}
      >
        Usage
      </p>
      {invoiceLimit.max !== -1 && (
        <MeterBar
          label="Invoices"
          current={invoiceLimit.current}
          max={invoiceLimit.max}
          dark={dark}
        />
      )}
      {clientLimit.max !== -1 && (
        <MeterBar
          label="Clients"
          current={clientLimit.current}
          max={clientLimit.max}
          dark={dark}
        />
      )}
      {ocrLimit.max !== -1 && ocrLimit.max !== 0 && (
        <MeterBar
          label="OCR Scans"
          current={ocrLimit.current}
          max={ocrLimit.max}
          dark={dark}
        />
      )}
    </div>
  );
}
