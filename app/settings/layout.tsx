'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  if (loading) {
    return <AppLayout><div className="min-h-screen flex items-center justify-center">
      <div className={dark ? 'text-slate-400' : 'text-gray-600'}>Loading...</div>
    </div></AppLayout>;
  }
  if (!user) return null;

  const tabs = [
    { name: 'Profile', href: '/settings/profile' },
    { name: 'Company', href: '/settings/company' },
    { name: 'Email', href: '/settings/email' },
    { name: 'Team', href: '/settings/team' },
    { name: 'Security', href: '/settings/security' },
  ];

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Settings</h2>
        </div>

        <div className={`border-b mb-8 ${dark ? 'border-purple-500/30' : 'border-gray-200'}`}>
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Link key={tab.name} href={tab.href}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  pathname === tab.href
                    ? dark ? 'border-purple-500 text-purple-400' : 'border-indigo-500 text-indigo-600'
                    : dark ? 'border-transparent text-slate-400 hover:text-white hover:border-purple-500/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {children}
      </main>
    </AppLayout>
  );
}
