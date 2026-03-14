'use client';

import { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
          Failed to load dashboard
        </h2>
        <p className={`mb-6 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>
          There was a problem loading your data. This could be a temporary network issue.
        </p>
        <button onClick={reset}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Retry
        </button>
      </div>
    </AppLayout>
  );
}
