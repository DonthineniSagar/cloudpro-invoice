'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import AppLayout from '@/components/AppLayout';
import { FileText, Receipt } from 'lucide-react';
import { DashboardSkeleton } from '@/components/Skeleton';
import { currentFY, fyLabel, fyShort, fyMonthKeys, FY_MONTHS, fyStart, fyEnd, getFY, availableFYs, selectableFYs, isFYClosed, isPreviousFYOpen } from '@/lib/fy-utils';

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
  const [hasCompanyProfile, setHasCompanyProfile] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [selectedFY, setSelectedFY] = useState(currentFY());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (user) {
      loadMetrics();
      checkCompanyProfile();
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

  const checkCompanyProfile = async () => {
    try {
      const client = generateClient<Schema>();
      const { data } = await client.models.CompanyProfile.list();
      setHasCompanyProfile(data && data.length > 0);
    } catch (error) {
      console.error('Error checking company profile:', error);
    }
  };

  const card = dark
    ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40'
    : 'bg-white p-6 rounded-xl shadow-sm border border-gray-200';
  const cardHover = dark
    ? 'bg-black p-6 rounded-xl border-2 border-purple-500/40 hover:border-purple-500 transition-all'
    : 'bg-white p-6 rounded-xl shadow-sm border border-gray-200';
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

  const chartMax = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expenses)), 1);
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={cardHover}>
            <div className={label}>Total Revenue</div>
            <div className={`text-3xl font-bold ${text}`}>{loadingMetrics ? '...' : `$${metrics.totalRevenue.toFixed(2)}`}</div>
          </div>
          <div className={cardHover}>
            <div className={label}>Outstanding</div>
            <div className="text-3xl font-bold text-orange-400">{loadingMetrics ? '...' : `$${metrics.outstanding.toFixed(2)}`}</div>
          </div>
          <div className={cardHover}>
            <div className={label}>Paid Invoices</div>
            <div className="text-3xl font-bold text-green-400">{loadingMetrics ? '...' : metrics.paidCount}</div>
          </div>
          <div className={cardHover}>
            <div className={label}>Pending</div>
            <div className="text-3xl font-bold text-blue-400">{loadingMetrics ? '...' : metrics.pendingCount}</div>
          </div>
          {metrics.overdueCount > 0 && (
          <div className={cardHover}>
            <div className={label}>Overdue</div>
            <div className="text-3xl font-bold text-red-400">{metrics.overdueCount}</div>
          </div>
          )}
        </div>

        {/* Expense & GST Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={card}>
            <div className={label}>Total Expenses</div>
            <div className="text-2xl font-bold text-red-400">{loadingMetrics ? '...' : `$${metrics.totalExpenses.toFixed(2)}`}</div>
          </div>
          <div className={card}>
            <div className={label}>Net GST Position</div>
            <div className={`text-2xl font-bold ${(metrics.gstCollected - metrics.gstPaid) >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {loadingMetrics ? '...' : `$${(metrics.gstCollected - metrics.gstPaid).toFixed(2)}`}
            </div>
            <div className={dark ? 'text-xs text-slate-500 mt-1' : 'text-xs text-gray-500 mt-1'}>
              Collected ${metrics.gstCollected.toFixed(2)} − Paid ${metrics.gstPaid.toFixed(2)}
            </div>
          </div>
          <div className={card}>
            <div className={label}>Profit (ex-GST)</div>
            <div className={`text-2xl font-bold ${(metrics.revenueExGst - metrics.expensesExGst) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loadingMetrics ? '...' : `$${(metrics.revenueExGst - metrics.expensesExGst).toFixed(2)}`}
            </div>
          </div>
        </div>

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
            {monthlyData.length > 0 ? (
              <div className="flex items-end gap-3 h-48">
                {monthlyData.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="flex gap-1 items-end w-full justify-center" style={{ height: '80%' }}>
                      <div
                        className="w-5 rounded-t bg-indigo-500 transition-all"
                        style={{ height: `${Math.max((d.revenue / chartMax) * 100, 2)}%` }}
                        title={`Revenue: $${d.revenue.toFixed(2)}`}
                      />
                      <div
                        className="w-5 rounded-t bg-red-400 transition-all"
                        style={{ height: `${Math.max((d.expenses / chartMax) * 100, 2)}%` }}
                        title={`Expenses: $${d.expenses.toFixed(2)}`}
                      />
                    </div>
                    <span className={`text-xs ${muted}`}>{d.month}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`h-48 flex items-center justify-center ${muted}`}>No data yet</div>
            )}
            <div className="flex gap-6 mt-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-indigo-500" />
                <span className={muted}>Revenue</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-red-400" />
                <span className={muted}>Expenses</span>
              </div>
            </div>
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

        {/* Setup Guide */}
        {!hasCompanyProfile && (
          <div className={dark ? 'bg-black border-2 border-purple-500/40 p-6 rounded-xl' : 'bg-indigo-50 border border-indigo-200 p-6 rounded-xl'}>
            <h3 className={dark ? 'text-lg font-semibold text-white mb-2' : 'text-lg font-semibold text-indigo-900 mb-2'}>Complete Your Setup</h3>
            <p className={dark ? 'text-purple-200 mb-4' : 'text-indigo-700 mb-4'}>Set up your company profile to start creating invoices</p>
            <button
              onClick={() => router.push('/settings/company')}
              className={dark ? 'px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all font-medium' : 'px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-medium'}
            >
              Set Up Company Profile
            </button>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
