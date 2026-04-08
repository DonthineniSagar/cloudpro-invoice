'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface LimitReachedPromptProps {
  resource: string;
  current: number;
  max: number;
  planName: string;
  backHref: string;
  backLabel: string;
  upgradeMessage: string;
}

export default function LimitReachedPrompt({
  resource,
  current,
  max,
  planName,
  backHref,
  backLabel,
  upgradeMessage,
}: LimitReachedPromptProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className={`max-w-md w-full mx-4 p-8 rounded-xl border text-center ${
          dark
            ? 'bg-slate-900 border-amber-500/30'
            : 'bg-white border-amber-200 shadow-sm'
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full ${
            dark ? 'bg-amber-500/10' : 'bg-amber-50'
          }`}
        >
          <AlertTriangle
            className={`w-8 h-8 ${dark ? 'text-amber-400' : 'text-amber-500'}`}
          />
        </div>
        <h2
          className={`text-xl font-semibold mb-2 ${
            dark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {resource} limit reached
        </h2>
        <p
          className={`text-sm mb-2 ${dark ? 'text-slate-400' : 'text-gray-600'}`}
        >
          You&apos;ve used{' '}
          <span
            className={`font-semibold ${
              dark ? 'text-amber-400' : 'text-amber-600'
            }`}
          >
            {current} / {max}
          </span>{' '}
          on the {planName} plan.
        </p>
        <p
          className={`text-sm mb-6 ${dark ? 'text-slate-400' : 'text-gray-600'}`}
        >
          {upgradeMessage}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/#pricing"
            className="inline-block px-6 py-3 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
          >
            Upgrade Plan
          </Link>
          <Link
            href={backHref}
            className={`inline-block px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              dark
                ? 'border border-purple-500/40 text-slate-300 hover:border-purple-500'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
