'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

interface UpgradePromptProps {
  feature: string;
  requiredPlan: string;
}

export default function UpgradePrompt({ feature, requiredPlan }: UpgradePromptProps) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className={`max-w-md w-full mx-4 p-8 rounded-xl border text-center ${
        dark
          ? 'bg-slate-900 border-purple-500/30'
          : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full ${
          dark ? 'bg-purple-500/10' : 'bg-primary-50'
        }`}>
          <Lock className={`w-8 h-8 ${dark ? 'text-purple-400' : 'text-primary-500'}`} />
        </div>
        <h2 className={`text-xl font-semibold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          {feature}
        </h2>
        <p className={`text-sm mb-6 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
          This feature is available on the {requiredPlan} plan and above.
          Upgrade to unlock it.
        </p>
        <Link
          href="/#pricing"
          className="inline-block px-6 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          View Plans & Upgrade
        </Link>
      </div>
    </div>
  );
}
