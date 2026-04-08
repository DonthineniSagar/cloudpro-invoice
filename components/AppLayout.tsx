'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = theme === 'dark';

  const isActive = (path: string) => pathname.startsWith(path);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/invoices', label: 'Invoices' },
    { href: '/invoices/recurring', label: 'Recurring' },
    { href: '/clients', label: 'Clients' },
    { href: '/expenses', label: 'Expenses' },
    { href: '/reports', label: 'Reports' },
    { href: '/settings/profile', label: 'Settings' },
  ];

  const linkClass = (path: string) =>
    `text-sm transition-colors ${isActive(path) ? (dark ? 'text-purple-400 font-medium' : 'text-indigo-600 font-medium') : (dark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900')}`;

  return (
    <div className={dark ? 'min-h-screen bg-black' : 'min-h-screen bg-gray-50'}>
      <header className={dark ? 'bg-black/50 backdrop-blur-xl border-b border-purple-500/30' : 'bg-white border-b border-gray-200'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/ledgr-logo.svg" alt="Ledgr" width={32} height={32} className="h-8 w-8" />
                <span className={dark ? 'text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 'text-xl font-bold text-gray-900'}>
                  Ledgr
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.slice(0, 5).map(l => (
                  <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
                ))}
              </nav>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <NotificationBell dark={dark} />
              <button onClick={toggleTheme}
                className={dark ? 'p-2 rounded-lg bg-slate-800 text-purple-400 hover:bg-slate-700' : 'p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200'}>
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link href="/settings/profile" className={linkClass('/settings')}>Settings</Link>
              <span className={dark ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
                {user?.firstName || user?.email}
              </span>
              <button onClick={() => signOut()}
                className={dark ? 'text-sm text-slate-300 hover:text-white' : 'text-sm text-gray-600 hover:text-gray-900'}>
                Sign out
              </button>
            </div>
            {/* Mobile hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button onClick={toggleTheme}
                className={dark ? 'p-2 rounded-lg bg-slate-800 text-purple-400' : 'p-2 rounded-lg bg-gray-100 text-gray-600'}>
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className={dark ? 'p-2 rounded-lg text-slate-300' : 'p-2 rounded-lg text-gray-600'}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileOpen && (
          <div className={`md:hidden border-t ${dark ? 'border-purple-500/30 bg-black/90' : 'border-gray-200 bg-white'}`}>
            <nav className="px-4 py-3 space-y-3">
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className={`block py-2 ${linkClass(l.href)}`}>{l.label}</Link>
              ))}
              <div className={`pt-3 border-t ${dark ? 'border-purple-500/20' : 'border-gray-100'}`}>
                <span className={`block text-sm mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {user?.firstName || user?.email}
                </span>
                <button onClick={() => { signOut(); setMobileOpen(false); }}
                  className={`text-sm ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
