'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import TrialBanner from '@/components/TrialBanner';
import UsageMeter from '@/components/UsageMeter';
import { canAccess, isSubscriptionActive } from '@/lib/subscription';
import type { PlanTier, SubscriptionStatus, Feature } from '@/lib/subscription';
import { getInvoiceCount, getClientCount, getEffectiveOcrCount, getBillingPeriodStart } from '@/lib/usage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

interface SubscriptionState {
  plan: PlanTier | null;
  status: SubscriptionStatus | null;
  trialEndDate: string | null;
  loading: boolean;
}

interface NavLink {
  href: string;
  label: string;
  requiredFeature?: Feature;
}

const ALL_NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/invoices/recurring', label: 'Recurring', requiredFeature: 'recurring' },
  { href: '/clients', label: 'Clients' },
  { href: '/expenses', label: 'Expenses', requiredFeature: 'expenses' },
  { href: '/reports', label: 'Reports', requiredFeature: 'reports_full' },
  { href: '/settings/profile', label: 'Settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = theme === 'dark';

  const [sub, setSub] = useState<SubscriptionState>({
    plan: null,
    status: null,
    trialEndDate: null,
    loading: true,
  });

  const [usage, setUsage] = useState({ invoices: 0, clients: 0, ocr: 0 });

  useEffect(() => {
    if (!user?.id) {
      setSub((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    async function loadSubscription() {
      try {
        const { data: profiles } = await client.models.CompanyProfile.list();
        const profile = profiles?.[0];
        if (!cancelled && profile) {
          setSub({
            plan: (profile.subscriptionPlan as PlanTier) || null,
            status: (profile.subscriptionStatus as SubscriptionStatus) || null,
            trialEndDate: profile.trialEndDate || null,
            loading: false,
          });

          // Load usage counts
          try {
            const periodStart = getBillingPeriodStart(
              profile.subscriptionCurrentPeriodEnd || null,
              (profile.subscriptionInterval as 'MONTHLY' | 'ANNUAL') || null
            );
            const [invoiceCount, clientCount] = await Promise.all([
              getInvoiceCount(client, periodStart),
              getClientCount(client),
            ]);
            const ocrCount = getEffectiveOcrCount(
              profile.ocrUsageCount ?? 0,
              profile.ocrUsageResetDate ?? null
            );
            if (!cancelled) {
              setUsage({ invoices: invoiceCount, clients: clientCount, ocr: ocrCount });
            }
          } catch (err) {
            console.error('Failed to load usage counts:', err);
          }
        } else if (!cancelled) {
          setSub((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error('Failed to load subscription state:', err);
        if (!cancelled) setSub((prev) => ({ ...prev, loading: false }));
      }
    }

    loadSubscription();
    return () => { cancelled = true; };
  }, [user?.id]);

  const isActive = (path: string) => pathname.startsWith(path);

  // Filter nav links based on plan — show all if trialing or no gating needed
  const effectivePlan = sub.status === 'TRIALING' ? 'BUSINESS_PRO' as PlanTier : sub.plan;
  const navLinks = ALL_NAV_LINKS.filter((link) => {
    if (!link.requiredFeature) return true;
    // If no subscription at all, show all links (they'll see upgrade prompts on the pages)
    if (!sub.plan && !sub.status) return true;
    if (!isSubscriptionActive(sub.status)) return true;
    return canAccess(effectivePlan, link.requiredFeature);
  });

  const linkClass = (path: string) =>
    `text-sm transition-colors ${isActive(path) ? (dark ? 'text-purple-400 font-medium' : 'text-indigo-600 font-medium') : (dark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900')}`;

  return (
    <div className={dark ? 'min-h-screen bg-black' : 'min-h-screen bg-gray-50'}>
      <header className={dark ? 'bg-black/50 backdrop-blur-xl border-b border-purple-500/30' : 'bg-white border-b border-gray-200'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/cloudpro-logo.png" alt="CloudPro Books" width={32} height={32} className="h-8 w-8" />
                <span className={dark ? 'text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : 'text-xl font-bold text-gray-900'}>
                  CloudPro Books
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.slice(0, -1).map(l => (
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
              {!sub.loading && effectivePlan && (
                <UsageMeter
                  invoiceCount={usage.invoices}
                  clientCount={usage.clients}
                  ocrCount={usage.ocr}
                  plan={effectivePlan}
                  dark={dark}
                />
              )}
            </nav>
          </div>
        )}
      </header>
      {/* Desktop usage meter */}
      {!sub.loading && effectivePlan && (
        <div className={`hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${dark ? 'border-b border-purple-500/10' : ''}`}>
          <div className="max-w-xs">
            <UsageMeter
              invoiceCount={usage.invoices}
              clientCount={usage.clients}
              ocrCount={usage.ocr}
              plan={effectivePlan}
              dark={dark}
            />
          </div>
        </div>
      )}
      {/* Subscription banners */}
      {!sub.loading && (
        <TrialBanner status={sub.status} trialEndDate={sub.trialEndDate} dark={dark} />
      )}
      <main>{children}</main>
    </div>
  );
}
