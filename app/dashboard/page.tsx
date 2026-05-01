'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import AppLayout from '@/components/AppLayout';
import MetricCard from '@/components/MetricCard';
import { FileText, Receipt, CheckCircle2, Circle, X } from 'lucide-react';
import { DashboardSkeleton } from '@/components/Skeleton';
import { currentFY, fyLabel, fyShort, fyMonthKeys, FY_MONTHS, getFY, selectableFYs, isFYClosed } from '@/lib/fy-utils';
import { formatNZD, preTaxMargin, netGstPosition } from '@/lib/format';

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), { ssr: false });

type MonthData = { month: string; revenue: number; expenses: number };

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0, revenueExGst: 0, gstCollected: 0,
    outstanding: 0, paidCount: 0, pendingCount: 0, overdueCount: 0,
    totalExpenses: 0, expensesExGst: 0, gstPaid: 0,
    invoiceCount: 0, expenseCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [aged, setAged] = useState({ current: 0, d30: 0, d60: 0, d60plus: 0, currentCount: 0, d30Count: 0, d60Count: 0, d60plusCount: 0 });
  const [hasCompanyProfile, setHasCompanyProfile] = useState(false);
  const [hasClients, setHasClients] = useState(false);
  const [hasAnyInvoice, setHasAnyInvoice] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [selectedFY, setSelectedFY] = useState(currentFY());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (user) {
      loadMetrics();
      checkSetupState();
      setOnboardingDismissed(localStorage.getItem('cloudpro_onboarding_dismissed') === '1');
    }
  }, [user, loading, router, selectedFY]);

  const loadMetrics = async () => {
    try {
      const client = generateClient<Schema>();
      const { listAll } = await import('@/lib/list-all');
      const [invoices, expenses] = await Promise.all([
        listAll(client.models.Invoice),
        listAll(client.models.Expense),
      ]);

      setHasAnyInvoice(invoices.length > 0);

      // Filter to selected FY based on date (not createdAt)
      const fyInvoices = invoices.filter(inv => inv.issueDate && getFY(inv.issueDate) === selectedFY);
      const fyExpenses = expenses.filter(exp => exp.date && getFY(exp.date) === selectedFY);

      // Auto-detect overdue invoices
      const today = new Date().toISOString().split('T')[0];
      for (const inv of invoices) {
        if ((inv.status === 'DRAFT' || inv.status === 'SENT') && inv.dueDate) {
          const due = inv.dueDate.split('T')[0];
          if (due < today) {
            try {
              await client.models.Invoice.update({ id: inv.id, status: 'OVERDUE' as any });
              inv.status = 'OVERDUE';
            } catch {}
          }
        }
      }

      // Core metrics (FY-scoped)
      const totalRevenue = fyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const gstCollected = fyInvoices.reduce((sum, inv) => sum + (inv.gstAmount || 0), 0);
      const revenueExGst = totalRevenue - gstCollected;
      const outstanding = fyInvoices
        .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      const paidCount = fyInvoices.filter(inv => inv.status === 'PAID').length;
      const pendingCount = fyInvoices.filter(inv => inv.status === 'DRAFT' || inv.status === 'SENT').length;
      const overdueCount = fyInvoices.filter(inv => inv.status === 'OVERDUE').length;
      const totalExpenses = fyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const expensesExGst = fyExpenses.reduce((sum, e) => sum + (e.amountExGst || 0), 0);
      const gstPaid = fyExpenses.filter(e => e.gstClaimable).reduce((sum, e) => sum + (e.gstAmount || 0), 0);

      setMetrics({ totalRevenue, revenueExGst, gstCollected, outstanding, paidCount, pendingCount, overdueCount, totalExpenses, expensesExGst, gstPaid, invoiceCount: fyInvoices.length, expenseCount: fyExpenses.length });

      // Status breakdown (FY-scoped)
      const breakdown: Record<string, number> = {};
      fyInvoices.forEach(inv => {
        const s = inv.status || 'DRAFT';
        breakdown[s] = (breakdown[s] || 0) + 1;
      });
      setStatusBreakdown(breakdown);

      // Aged receivables (all-time, not FY-scoped — cash flow perspective)
      const now = new Date();
      const unpaid = invoices.filter(inv =>
        inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.dueDate
      );
      const agedData = { current: 0, d30: 0, d60: 0, d60plus: 0, currentCount: 0, d30Count: 0, d60Count: 0, d60plusCount: 0 };
      for (const inv of unpaid) {
        const due = new Date(inv.dueDate.split('T')[0]);
        const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
        const amount = inv.total || 0;
        if (diff <= 0) { agedData.current += amount; agedData.currentCount++; }
        else if (diff <= 30) { agedData.d30 += amount; agedData.d30Count++; }
        else if (diff <= 60) { agedData.d60 += amount; agedData.d60Count++; }
        else { agedData.d60plus += amount; agedData.d60plusCount++; }
      }
      setAged(agedData);

      // Monthly data (FY months: Apr–Mar)
      const monthly: Record<string, { revenue: number; expenses: number }> = {};
      const monthKeys = fyMonthKeys(selectedFY);
      for (const key of monthKeys) {
        monthly[key] = { revenue: 0, expenses: 0 };
      }
      fyInvoices.forEach(inv => {
        if (!inv.issueDate) return;
        const d = new Date(inv.issueDate);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthly[key]) monthly[key].revenue += inv.total || 0;
      });
      fyExpenses.forEach(exp => {
        if (!exp.date) return;
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthly[key]) monthly[key].expenses += exp.amount || 0;
      });
      setMonthlyData(monthKeys.map((key, i) => ({
        month: FY_MONTHS[i],
        revenue: monthly[key].revenue,
        expenses: monthly[key].expenses,
      })));

      // Recent items (FY-scoped)
      const sortedInv = [...fyInvoices].sort((a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      );
      setRecentInvoices(sortedInv.slice(0, 5));

      const sortedExp = [...fyExpenses].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentExpenses(sortedExp.slice(0, 5));
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const checkSetupState = async () => {
    try {
      const client = generateClient<Schema>();
      const [{ data: profiles }, { data: clients }] = await Promise.all([
        client.models.CompanyProfile.list(),
        client.models.Client.list(),
      ]);
      setHasCompanyProfile(!!(profiles && profiles.length > 0));
      setHasClients(!!(clients && clients.length > 0));
    } catch (error) {
      console.error('Error checking setup state:', error);
    }
  };

  const card = dark
    ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40'
    : 'bg-white p-6 rounded-xl border-2 border-indigo-600';
  const cardHover = dark
    ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40 hover:border-purple-500 transition-all'
    : 'bg-white p-6 rounded-xl border-2 border-indigo-600';
  const label = dark ? 'text-sm text-slate-400 mb-1' : 'text-sm text-gray-600 mb-1';
  const heading = dark ? 'text-lg font-semibold text-white mb-4' : 'text-lg font-semibold text-gray-900 mb-4';
  const muted = dark ? 'text-slate-400' : 'text-gray-600';
  const text = dark ? 'text-white' : 'text-gray-900';

  const statusColors: Record<string, string> = {
    DRAFT: '#9CA3AF', SENT: '#60A5FA', PAID: '#34D399', OVERDUE: '#F87171', CANCELLED: '#6B7280',
  };

  if (loading) {
    return <AppLayout><main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><DashboardSkeleton /></main></AppLayout>;
  }
  if (!user) return null;

  const totalStatusCount = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Dashboard</h2>
              <p className={`${muted} mt-1`}>Welcome back, {user.firstName || user.email}</p>
            </div>
            <select value={selectedFY} onChange={(e) => setSelectedFY(Number(e.target.value))}
              aria-label="Financial Year"
              className={`px-4 py-2 rounded-lg text-sm font-medium ${dark ? 'bg-black border-2 border-purple-500/40 text-white' : 'border border-gray-300 text-gray-700'}`}>
              {selectableFYs().map(fy => (
                <option key={fy} value={fy}>{fyLabel(fy)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Onboarding Checklist */}
        {!onboardingDismissed && (!hasCompanyProfile || !hasClients || !hasAnyInvoice) && (
          <div className={`mb-8 rounded-xl p-6 ${dark ? 'bg-black border-2 border-purple-500/40' : 'bg-indigo-50 border border-indigo-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-indigo-900'}`}>Get started in 3 steps</h3>
                <p className={`text-sm mt-0.5 ${dark ? 'text-slate-400' : 'text-indigo-700'}`}>Complete these to send your first invoice</p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('cloudpro_onboarding_dismissed', '1');
                  setOnboardingDismissed(true);
                }}
                aria-label="Dismiss checklist"
                className={`p-1 rounded ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-indigo-400 hover:text-indigo-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { done: hasCompanyProfile, label: 'Set up your company profile', href: '/settings/company', cta: 'Add details' },
                { done: hasClients, label: 'Add your first client', href: '/clients/new', cta: 'Add client' },
                { done: hasAnyInvoice, label: 'Create and send your first invoice', href: '/invoices/new', cta: 'New invoice' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.done
                    ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
                    : <Circle className={`w-5 h-5 flex-shrink-0 ${dark ? 'text-slate-600' : 'text-indigo-300'}`} />
                  }
                  <span className={`text-sm flex-1 ${step.done ? (dark ? 'line-through text-slate-500' : 'line-through text-indigo-400') : (dark ? 'text-slate-200' : 'text-indigo-800')}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <Link href={step.href} className={`text-xs font-medium px-3 py-1 rounded-lg ${dark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {step.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            dark={dark}
            label="Total Revenue"
            value={loadingMetrics ? '...' : formatNZD(metrics.totalRevenue)}
            subLabel={loadingMetrics ? undefined : `ex-GST ${formatNZD(metrics.revenueExGst)}`}
          />
          <MetricCard
            dark={dark}
            label="Outstanding"
            value={loadingMetrics ? '...' : formatNZD(metrics.outstanding)}
            variant="amber"
          />
          <MetricCard
            dark={dark}
            label="Paid Invoices"
            value={loadingMetrics ? '...' : metrics.paidCount}
            variant="green"
          />
          <MetricCard
            dark={dark}
            label="Pending"
            value={loadingMetrics ? '...' : metrics.pendingCount}
          />
          {metrics.overdueCount > 0 && (
            <MetricCard
              dark={dark}
              label="Overdue"
              value={metrics.overdueCount}
              variant="red"
            />
          )}
        </div>

        {/* Aged Receivables */}
        {!loadingMetrics && (aged.current + aged.d30 + aged.d60 + aged.d60plus) > 0 && (
          <div className={`${card} mb-8`}>
            <h3 className={heading}>Money owed to you</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Current', sublabel: 'Not yet due', amount: aged.current, count: aged.currentCount, color: dark ? 'text-green-400' : 'text-green-600' },
                { label: '1–30 days', sublabel: 'Overdue', amount: aged.d30, count: aged.d30Count, color: 'text-amber-500' },
                { label: '31–60 days', sublabel: 'Overdue', amount: aged.d60, count: aged.d60Count, color: 'text-orange-500' },
                { label: '60+ days', sublabel: 'Overdue', amount: aged.d60plus, count: aged.d60plusCount, color: 'text-red-500' },
              ].map(bucket => (
                <div key={bucket.label} className={`p-4 rounded-lg ${dark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-xs font-medium ${muted}`}>{bucket.label}</p>
                  <p className={`text-xs ${muted} mb-2`}>{bucket.sublabel}</p>
                  <p className={`text-xl font-bold ${bucket.amount > 0 ? bucket.color : muted}`}>
                    {formatNZD(bucket.amount)}
                  </p>
                  {bucket.count > 0 && (
                    <p className={`text-xs mt-1 ${muted}`}>{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense & GST Summary */}
        {(() => {
          const margin = preTaxMargin(metrics.revenueExGst, metrics.expensesExGst);
          const gstNet = netGstPosition(metrics.gstCollected, metrics.gstPaid);
          const marginPct = metrics.revenueExGst > 0
            ? (margin / metrics.revenueExGst) * 100
            : 0;
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={card}>
                <div className={label}>Total Expenses</div>
                <div className="text-2xl font-bold text-red-400">
                  {loadingMetrics ? '...' : formatNZD(metrics.totalExpenses)}
                </div>
                {!loadingMetrics && (
                  <div className={dark ? 'text-xs text-slate-500 mt-1' : 'text-xs text-gray-500 mt-1'}>
                    ex-GST {formatNZD(metrics.expensesExGst)}
                  </div>
                )}
              </div>
              <div className={card}>
                <div className={label}>Net GST Position</div>
                <div className={`text-2xl font-bold ${gstNet >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {loadingMetrics ? '...' : formatNZD(gstNet)}
                </div>
                {!loadingMetrics && (
                  <div className={dark ? 'text-xs text-slate-500 mt-1' : 'text-xs text-gray-500 mt-1'}>
                    Collected {formatNZD(metrics.gstCollected)} − Paid {formatNZD(metrics.gstPaid)}
                  </div>
                )}
              </div>
              <div className={card}>
                <div className={label}>Pre-Tax Margin</div>
                <div className={`text-2xl font-bold ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {loadingMetrics ? '...' : formatNZD(margin)}
                </div>
                {!loadingMetrics && (
                  <div className={dark ? 'text-xs text-slate-500 mt-1' : 'text-xs text-gray-500 mt-1'}>
                    {marginPct.toFixed(1)}% gross margin · GST net {formatNZD(gstNet)}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* FY Summary Card */}
        <div className={`${card} mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={heading}>
              {fyShort(selectedFY)} Summary
            </h3>
            {selectedFY < currentFY() && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isFYClosed(selectedFY)
                  ? (dark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                  : (dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700')
              }`}>
                {isFYClosed(selectedFY) ? `🔒 ${fyShort(selectedFY)} — Closed` : `${fyShort(selectedFY)} — Open until May 15`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className={`text-xs ${muted}`}>Revenue (incl GST)</p>
              <p className={`text-lg font-bold ${text}`}>${metrics.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Expenses (incl GST)</p>
              <p className={`text-lg font-bold text-red-400`}>${metrics.totalExpenses.toFixed(2)}</p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Net GST Position</p>
              <p className={`text-lg font-bold ${(metrics.gstCollected - metrics.gstPaid) >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
                ${(metrics.gstCollected - metrics.gstPaid).toFixed(2)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Pre-Tax Margin</p>
              <p className={`text-lg font-bold ${(metrics.revenueExGst - metrics.expensesExGst) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(metrics.revenueExGst - metrics.expensesExGst).toFixed(2)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Invoices</p>
              <p className={`text-lg font-bold ${text}`}>{loadingMetrics ? '...' : metrics.invoiceCount}</p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Expenses</p>
              <p className={`text-lg font-bold ${text}`}>{loadingMetrics ? '...' : metrics.expenseCount}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${card} mb-8`}>
          <h3 className={heading}>Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/invoices/new" className={dark ? 'p-4 border-2 border-purple-500 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all text-center font-medium' : 'p-4 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all text-center font-medium'}>
              + New Invoice
            </Link>
            <Link href="/clients/new" className={dark ? 'p-4 border-2 border-purple-500/40 text-slate-300 rounded-lg hover:border-purple-500 transition-all text-center font-medium' : 'p-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-center font-medium'}>
              + New Client
            </Link>
            <Link href="/expenses/new" className={dark ? 'p-4 border-2 border-purple-500/40 text-slate-300 rounded-lg hover:border-purple-500 transition-all text-center font-medium' : 'p-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-center font-medium'}>
              + New Expense
            </Link>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Revenue vs Expenses Bar Chart */}
          <div className={`${card} lg:col-span-2`}>
            <h3 className={heading}>Revenue vs Expenses ({fyShort(selectedFY)})</h3>
            <RevenueChart data={monthlyData} dark={dark} muted={muted} />
          </div>

          {/* Invoice Status Breakdown */}
          <div className={card}>
            <h3 className={heading}>Invoice Status</h3>
            {totalStatusCount > 0 ? (
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="flex rounded-full overflow-hidden h-4">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div
                      key={status}
                      style={{ width: `${(count / totalStatusCount) * 100}%`, backgroundColor: statusColors[status] || '#9CA3AF' }}
                      title={`${status}: ${count}`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2 mt-4">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[status] || '#9CA3AF' }} />
                        <span className={muted}>{status}</span>
                      </div>
                      <span className={`font-medium ${text}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`h-32 flex items-center justify-center ${muted}`}>No invoices yet</div>
            )}
          </div>
        </div>

        {/* Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Invoices */}
          <div className={card}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900'}>Recent Invoices</h3>
              <Link href="/invoices" className={dark ? 'text-sm text-purple-400 hover:text-purple-300' : 'text-sm text-indigo-600 hover:text-indigo-700'}>View all →</Link>
            </div>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${dark ? 'hover:bg-purple-500/10' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${muted}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${text}`}>{inv.invoiceNumber}</p>
                        <p className={`text-xs truncate ${muted}`}>{inv.clientName}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-medium ${text}`}>${inv.total?.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        inv.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                        inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{inv.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${muted}`}>No invoices yet</p>
            )}
          </div>

          {/* Recent Expenses */}
          <div className={card}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={dark ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900'}>Recent Expenses</h3>
              <Link href="/expenses" className={dark ? 'text-sm text-purple-400 hover:text-purple-300' : 'text-sm text-indigo-600 hover:text-indigo-700'}>View all →</Link>
            </div>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((exp) => (
                  <Link key={exp.id} href={`/expenses/${exp.id}/edit`}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${dark ? 'hover:bg-purple-500/10' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className={`w-4 h-4 flex-shrink-0 ${muted}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${text}`}>{exp.description}</p>
                        <p className={`text-xs truncate ${muted}`}>{exp.category} · {new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-medium ${text}`}>${exp.amount?.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${muted}`}>No expenses yet</p>
            )}
          </div>
        </div>

      </main>
    </AppLayout>
  );
}
