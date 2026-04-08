'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '@/amplify/data/resource';
import { Plus, Receipt, Search, CheckCircle, AlertTriangle, Trash2, FileText, FileSpreadsheet, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Lock } from 'lucide-react';

const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { currentFY, fyLabel, getFY, fyMonthKeys, FY_MONTHS, isFYClosed, selectableFYs } from '@/lib/fy-utils';

type Expense = any;

const categoryIcon = (c: string) => ({
  'Advertising & Marketing': '📣', 'Communication (Phone & Internet)': '📱',
  'Depreciation': '📉', 'Entertainment (50% deductible)': '🍽️',
  'General & Administrative': '📋', 'Insurance': '🛡️',
  'Interest & Bank Fees': '🏦', 'Legal & Accounting': '⚖️',
  'Motor Vehicle': '🚗', 'Office Expenses': '🏢',
  'Rent & Rates': '🏠', 'Repairs & Maintenance': '🔧',
  'Software & Subscriptions': '💻', 'Subcontractors': '👷',
  'Travel & Accommodation': '✈️',
}[c] || '📦');

const statusColor = (s: string) =>
  s === 'APPROVED' ? 'bg-green-100 text-green-800' :
  s === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

export default function ExpensesPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const dark = theme === 'dark';

  const [summaryData, setSummaryData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fyFilter, setFyFilter] = useState(currentFY());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [monthExpenses, setMonthExpenses] = useState<Record<string, Expense[]>>({});
  const [monthThumbnails, setMonthThumbnails] = useState<Record<string, Record<string, string>>>({});
  const [loadingMonths, setLoadingMonths] = useState<Set<string>>(new Set());
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Load only summary data (lightweight — amounts, dates, categories)
  useEffect(() => {
    (async () => {
      try {
        const client = generateClient<Schema>();
        const { data } = await client.models.Expense.list();
        setSummaryData(data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // Auto-expand current month after data loads
  useEffect(() => {
    if (summaryData.length === 0) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setExpandedMonths(new Set([key]));
    // Pre-load current month expenses
    const monthItems = summaryData
      .filter(e => e.date && getFY(e.date) === fyFilter)
      .filter(e => { const d = new Date(e.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key; })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMonthExpenses(prev => ({ ...prev, [key]: monthItems }));
    // Resolve thumbnails for current month
    (async () => {
      const urls: Record<string, string> = {};
      await Promise.all(monthItems.filter((e: any) => e.receiptUrl).map(async (e: any) => {
        try { const { url } = await getUrl({ path: e.receiptUrl }); urls[e.id] = url.toString(); } catch {}
      }));
      setMonthThumbnails(prev => ({ ...prev, [key]: urls }));
    })();
  }, [summaryData]);

  // Filter by FY and search
  const fyExpenses = summaryData.filter(e => e.date && getFY(e.date) === fyFilter);
  const filtered = fyExpenses.filter(e =>
    !search || e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by month key (YYYY-MM)
  const monthGroups: Record<string, { count: number; total: number }> = {};
  for (const e of filtered) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthGroups[key]) monthGroups[key] = { count: 0, total: 0 };
    monthGroups[key].count++;
    monthGroups[key].total += e.amount || 0;
  }

  // Ordered month keys for this FY (only months with data)
  const orderedMonths = fyMonthKeys(fyFilter).filter(k => monthGroups[k]);

  // === Insights ===
  const totalExpenses = fyExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalGst = fyExpenses.filter(e => e.gstClaimable).reduce((s, e) => s + (e.gstAmount || 0), 0);

  // Category breakdown (top 5)
  const catTotals: Record<string, number> = {};
  for (const e of fyExpenses) {
    const cat = e.category || 'Other';
    catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
  }
  const topCategories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCatAmount = topCategories[0]?.[1] || 1;

  // Monthly trend (mini sparkline data)
  const monthlyTotals = fyMonthKeys(fyFilter).map(k => monthGroups[k]?.total || 0);
  const maxMonthly = Math.max(...monthlyTotals, 1);

  // Month-over-month change
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(); prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTotal = monthGroups[currentMonthKey]?.total || 0;
  const prevMonthTotal = monthGroups[prevMonthKey]?.total || 0;
  const momChange = prevMonthTotal ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal * 100) : 0;

  // Lazy load month expenses
  const toggleMonth = useCallback(async (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) { next.delete(monthKey); return next; }
      next.add(monthKey);
      return next;
    });

    if (monthExpenses[monthKey]) return; // already loaded

    setLoadingMonths(prev => new Set(prev).add(monthKey));
    // Filter from summary data (already in memory, just resolve thumbnails)
    const expenses = filtered
      .filter(e => { const d = new Date(e.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthKey; })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setMonthExpenses(prev => ({ ...prev, [monthKey]: expenses }));

    // Resolve thumbnails
    const urls: Record<string, string> = {};
    await Promise.all(expenses.filter((e: any) => e.receiptUrl).map(async (e: any) => {
      try { const { url } = await getUrl({ path: e.receiptUrl }); urls[e.id] = url.toString(); } catch {}
    }));
    setMonthThumbnails(prev => ({ ...prev, [monthKey]: urls }));
    setLoadingMonths(prev => { const n = new Set(prev); n.delete(monthKey); return n; });
  }, [filtered, monthExpenses]);

  const updateStatus = async (id: string, status: string, monthKey: string) => {
    const client = generateClient<Schema>();
    await client.models.Expense.update({ id, status: status as any });
    setMonthExpenses(prev => ({ ...prev, [monthKey]: prev[monthKey]?.map(e => e.id === id ? { ...e, status } : e) }));
    setSummaryData(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const deleteExpense = async (id: string, monthKey: string) => {
    if (!confirm('Delete this expense?')) return;
    const client = generateClient<Schema>();
    await client.models.Expense.delete({ id });
    setMonthExpenses(prev => ({ ...prev, [monthKey]: prev[monthKey]?.filter(e => e.id !== id) }));
    setSummaryData(prev => prev.filter(e => e.id !== id));
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Expenses</h1>
            <p className={t.textMuted}>Track and manage your business expenses</p>
          </div>
          <div className="flex gap-2">
            <Link href="/expenses/review" className={`flex items-center gap-2 ${t.btnSecondary}`}>Review</Link>
            <Link href="/expenses/import" className={`flex items-center gap-2 ${t.btnSecondary}`}>
              <FileSpreadsheet className="w-4 h-4" /> Import
            </Link>
            <Link href="/expenses/new" className={`flex items-center gap-2 ${t.btnPrimary}`}>
              <Plus className="w-4 h-4" /> Add Expense
            </Link>
          </div>
        </div>

        {/* Insights Bar */}
        {!loading && fyExpenses.length > 0 && (
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6`}>
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-white border border-gray-200'} rounded-lg p-4`}>
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Total Spend</p>
              <p className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>${totalExpenses.toFixed(0)}</p>
            </div>
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-white border border-gray-200'} rounded-lg p-4`}>
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>GST Claimable</p>
              <p className={`text-xl font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>${totalGst.toFixed(0)}</p>
            </div>
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-white border border-gray-200'} rounded-lg p-4`}>
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>This Month vs Last</p>
              <div className="flex items-center gap-1">
                {momChange > 0 ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-green-400" />}
                <p className={`text-xl font-bold ${momChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {momChange === 0 ? '—' : `${momChange > 0 ? '+' : ''}${momChange.toFixed(0)}%`}
                </p>
              </div>
            </div>
            {/* Mini spending trend */}
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-white border border-gray-200'} rounded-lg p-4`}>
              <p className={`text-xs mb-2 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Monthly Trend</p>
              <div className="flex items-end gap-0.5 h-8">
                {monthlyTotals.map((v, i) => (
                  <div key={i} title={`${FY_MONTHS[i]}: $${v.toFixed(0)}`}
                    className={`flex-1 rounded-sm ${v > 0 ? (dark ? 'bg-purple-500' : 'bg-indigo-400') : (dark ? 'bg-gray-800' : 'bg-gray-100')}`}
                    style={{ height: `${Math.max(v > 0 ? 10 : 2, (v / maxMonthly) * 100)}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Categories */}
        {!loading && topCategories.length > 0 && (
          <div className={`${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-6`}>
            <p className={`text-xs mb-3 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Top Categories</p>
            <div className="space-y-2">
              {topCategories.map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-center">{categoryIcon(cat)}</span>
                  <span className={`w-48 truncate ${dark ? 'text-slate-300' : 'text-gray-700'}`}>{cat}</span>
                  <div className={`flex-1 h-2 rounded-full ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className={`h-2 rounded-full ${dark ? 'bg-purple-500' : 'bg-indigo-400'}`}
                      style={{ width: `${(amount / maxCatAmount) * 100}%` }} />
                  </div>
                  <span className={`w-20 text-right font-mono ${dark ? 'text-slate-400' : 'text-gray-500'}`}>${amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`flex flex-wrap items-center gap-2 mb-6 p-3 rounded-lg ${dark ? 'bg-black border border-purple-500/20' : 'bg-gray-50 border border-gray-200'}`}>
          <select value={fyFilter} onChange={(e) => { setFyFilter(Number(e.target.value)); setExpandedMonths(new Set()); setMonthExpenses({}); }}
            aria-label="Financial Year"
            className={`text-sm px-3 py-1.5 rounded-md ${dark ? 'bg-gray-900 border border-purple-500/30 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
            {selectableFYs().map(fy => (
              <option key={fy} value={fy}>{fyLabel(fy)}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[150px]">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
            <input type="text" placeholder="Search..." value={search}
              onChange={(e) => { setSearch(e.target.value); setMonthExpenses({}); }}
              className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md ${dark ? 'bg-gray-900 border border-purple-500/30 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none' : 'bg-white border border-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'}`} />
          </div>
          <span className={`text-xs ${t.textMuted}`}>{filtered.length} expenses · ${totalExpenses.toFixed(2)}</span>
        </div>

        {/* Collapsible Month Groups */}
        {loading ? (
          <div className="text-center py-12"><p className={t.textMuted}>Loading...</p></div>
        ) : orderedMonths.length === 0 ? (
          <div className={`${t.card} text-center py-12`}>
            <Receipt className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
            <h3 className={dark ? 'text-lg font-medium text-white mb-2' : 'text-lg font-medium text-gray-900 mb-2'}>
              {search ? 'No expenses found' : 'No expenses yet'}
            </h3>
            {!search && <Link href="/expenses/new" className={`inline-flex items-center gap-2 mt-4 ${t.btnPrimary}`}><Plus className="w-4 h-4" /> Add Expense</Link>}
          </div>
        ) : (
          <div className="space-y-2">
            {orderedMonths.map(monthKey => {
              const group = monthGroups[monthKey];
              const expanded = expandedMonths.has(monthKey);
              const isLoading = loadingMonths.has(monthKey);
              const expenses = monthExpenses[monthKey] || [];
              const thumbs = monthThumbnails[monthKey] || {};
              const [y, m] = monthKey.split('-');
              const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });

              return (
                <div key={monthKey}>
                  <button onClick={() => toggleMonth(monthKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      dark ? 'bg-gray-900 border border-purple-500/20 hover:border-purple-500/40' : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex items-center gap-3">
                      {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-gray-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                        {group.count}
                      </span>
                    </div>
                    <span className={`font-mono font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>${group.total.toFixed(2)}</span>
                  </button>

                  {expanded && (
                    <div className="mt-1 space-y-1 ml-2">
                      {isLoading ? (
                        <div className={`text-center py-4 text-sm ${t.textMuted}`}>Loading...</div>
                      ) : expenses.map((expense: Expense) => {
                        const needsReceipt = (expense.amount || 0) > 50 && !expense.receiptUrl;
                        const expLocked = expense.date ? isFYClosed(getFY(expense.date)) : false;
                        return (
                          <div key={expense.id}
                            className={`${dark ? 'bg-black rounded-lg border border-purple-500/20 px-4 py-2.5' : 'bg-white rounded-lg border border-gray-100 px-4 py-2.5'}`}>
                            <div className="flex items-center justify-between">
                              <Link href={`/expenses/${expense.id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
                                {thumbs[expense.id] ? (
                                  isPdfUrl(thumbs[expense.id]) ? (
                                    <div onClick={(e) => { e.preventDefault(); setViewingReceipt(thumbs[expense.id]); }}
                                      className="w-7 h-7 rounded flex-shrink-0 border border-gray-200 cursor-zoom-in hover:opacity-80 flex items-center justify-center bg-red-50">
                                      <FileText className="w-3.5 h-3.5 text-red-500" />
                                    </div>
                                  ) : (
                                    <img src={thumbs[expense.id]} alt="" onClick={(e) => { e.preventDefault(); setViewingReceipt(thumbs[expense.id]); }}
                                      className="w-7 h-7 rounded object-cover flex-shrink-0 border border-gray-200 cursor-zoom-in hover:opacity-80" />
                                  )
                                ) : (
                                  <span className="text-sm">{categoryIcon(expense.category || 'Other')}</span>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{expense.description}</p>
                                    {needsReceipt && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                    {expense.suspectedDuplicate && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 flex-shrink-0">Duplicate?</span>}
                                    {(expense as any).classification === 'personal' && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">Personal</span>}
                                    {(expense as any).classification === 'partial' && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">Partial</span>}
                                  </div>
                                  <p className={`text-xs ${t.textMuted}`}>
                                    {expense.category || 'Other'} · {new Date(expense.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                                    {expense.gstClaimable && ' · GST'}
                                  </p>
                                </div>
                              </Link>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>${expense.amount?.toFixed(2)}</p>
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(expense.status || 'PENDING')}`}>
                                      {expense.status || 'PENDING'}
                                    </span>
                                    {expLocked && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${dark ? 'bg-gray-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                        <Lock className="w-3 h-3" /> Locked
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!expLocked && expense.status === 'PENDING' && (
                                  <button onClick={() => updateStatus(expense.id, 'APPROVED', monthKey)} title="Approve"
                                    className={`p-1 rounded ${dark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}>
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                {!expLocked && expense.status !== 'APPROVED' && (
                                  <button onClick={() => deleteExpense(expense.id, monthKey)}
                                    className={`p-1 rounded ${dark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewingReceipt(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button onClick={() => setViewingReceipt(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm">✕ Close</button>
            {isPdfUrl(viewingReceipt) ? (
              <iframe src={viewingReceipt} className="w-[90vw] max-w-3xl h-[85vh] rounded-lg bg-white" />
            ) : (
              <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
