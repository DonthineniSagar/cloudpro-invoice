'use client';

import { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { downloadCSV } from '@/lib/csv-export';
import { Download, FileText, Receipt, TrendingUp, Filter } from 'lucide-react';

export default function ReportsPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const dark = theme === 'dark';
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filter — default to current financial year (April 1 - March 31)
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const fyEnd = now.getMonth() >= 3
    ? `${now.getFullYear() + 1}-03-31`
    : `${now.getFullYear()}-03-31`;

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(fyEnd);

  useEffect(() => {
    const load = async () => {
      try {
        const client = generateClient<Schema>();
        const [invRes, expRes] = await Promise.all([
          client.models.Invoice.list(),
          client.models.Expense.list(),
        ]);
        setInvoices(invRes.data);
        setExpenses(expRes.data);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter by date range
  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    if (!inv.issueDate) return false;
    const d = inv.issueDate.split('T')[0];
    return d >= startDate && d <= endDate;
  }), [invoices, startDate, endDate]);

  const filteredExpenses = useMemo(() => expenses.filter(exp => {
    if (!exp.date) return false;
    const d = exp.date.split('T')[0];
    return d >= startDate && d <= endDate;
  }), [expenses, startDate, endDate]);

  // Tax calculations
  const revenueTotal = filteredInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const revenueExGst = filteredInvoices.reduce((s, i) => s + (i.subtotal || 0), 0);
  const gstCollected = filteredInvoices.reduce((s, i) => s + (i.gstAmount || 0), 0);
  const expenseTotal = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const expenseExGst = filteredExpenses.reduce((s, e) => s + (e.amountExGst || 0), 0);
  const gstPaid = filteredExpenses.filter(e => e.gstClaimable).reduce((s, e) => s + (e.gstAmount || 0), 0);
  const netGst = gstCollected - gstPaid;
  const taxableProfit = revenueExGst - expenseExGst;

  // Expenses by category
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // Top clients by revenue
  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach(i => {
      const name = i.clientName || 'Unknown';
      map[name] = (map[name] || 0) + (i.total || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredInvoices]);

  const catMax = byCategory.length > 0 ? byCategory[0][1] : 1;

  const exportInvoicesCSV = () => {
    const headers = ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Subtotal', 'GST', 'Total', 'Status'];
    const rows = filteredInvoices.map(i => [
      i.invoiceNumber, i.clientName,
      new Date(i.issueDate).toLocaleDateString(), i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '',
      i.subtotal?.toFixed(2), i.gstAmount?.toFixed(2), i.total?.toFixed(2), i.status,
    ]);
    downloadCSV(`invoices-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  const exportExpensesCSV = () => {
    const headers = ['Description', 'Category', 'Date', 'Amount', 'Ex-GST', 'GST', 'Claimable', 'Status'];
    const rows = filteredExpenses.map(e => [
      e.description, e.category || 'Other',
      new Date(e.date).toLocaleDateString(),
      e.amount?.toFixed(2), e.amountExGst?.toFixed(2), e.gstAmount?.toFixed(2),
      e.gstClaimable ? 'Yes' : 'No', e.status,
    ]);
    downloadCSV(`expenses-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  const exportTaxSummaryCSV = () => {
    const headers = ['Metric', 'Amount (NZD)'];
    const rows = [
      ['Revenue (incl GST)', revenueTotal.toFixed(2)],
      ['Revenue (ex GST)', revenueExGst.toFixed(2)],
      ['GST Collected', gstCollected.toFixed(2)],
      ['Expenses (incl GST)', expenseTotal.toFixed(2)],
      ['Expenses (ex GST)', expenseExGst.toFixed(2)],
      ['GST Paid (Claimable)', gstPaid.toFixed(2)],
      ['Net GST (Owed to IRD)', netGst.toFixed(2)],
      ['Taxable Profit', taxableProfit.toFixed(2)],
    ];
    downloadCSV(`tax-summary-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  if (loading) {
    return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className={t.textMuted}>Loading reports...</div></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Reports & Tax</h1>
            <p className={t.textMuted}>NZ GST return summary and business reports</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportTaxSummaryCSV} className={`flex items-center gap-2 text-sm ${t.btnPrimary}`}>
              <Download className="w-4 h-4" /> Tax Summary
            </button>
            <button onClick={exportInvoicesCSV} className={`flex items-center gap-2 text-sm ${t.btnSecondary}`}>
              <FileText className="w-4 h-4" /> Invoices CSV
            </button>
            <button onClick={exportExpensesCSV} className={`flex items-center gap-2 text-sm ${t.btnSecondary}`}>
              <Receipt className="w-4 h-4" /> Expenses CSV
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className={`${t.card} mb-8`}>
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className={`w-5 h-5 ${t.textMuted}`} />
            <div>
              <label className={`text-xs ${t.textMuted}`}>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={dark ? { colorScheme: 'dark' } : {}} className={`${t.input} !py-2`} />
            </div>
            <div>
              <label className={`text-xs ${t.textMuted}`}>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={dark ? { colorScheme: 'dark' } : {}} className={`${t.input} !py-2`} />
            </div>
            <div className={`text-sm ${t.textMuted}`}>
              {filteredInvoices.length} invoices · {filteredExpenses.length} expenses
            </div>
          </div>
        </div>

        {/* NZ Tax Summary */}
        <div className={`${t.card} mb-8`}>
          <h2 className={t.sectionTitle + ' mb-6'}>NZ GST Return Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Income */}
            <div>
              <h3 className={`text-sm font-semibold mb-4 ${dark ? 'text-indigo-400' : 'text-indigo-600'}`}>INCOME</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={t.textMuted}>Revenue (incl GST)</span>
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${revenueTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={t.textMuted}>Revenue (ex GST)</span>
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${revenueExGst.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between pt-2 ${dark ? 'border-t border-purple-500/20' : 'border-t border-gray-200'}`}>
                  <span className={`font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>GST Collected</span>
                  <span className={`font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>${gstCollected.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {/* Expenses */}
            <div>
              <h3 className={`text-sm font-semibold mb-4 ${dark ? 'text-red-400' : 'text-red-600'}`}>EXPENSES</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={t.textMuted}>Expenses (incl GST)</span>
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${expenseTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={t.textMuted}>Expenses (ex GST)</span>
                  <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${expenseExGst.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between pt-2 ${dark ? 'border-t border-purple-500/20' : 'border-t border-gray-200'}`}>
                  <span className={`font-semibold ${dark ? 'text-orange-400' : 'text-orange-600'}`}>GST Paid (Claimable)</span>
                  <span className={`font-bold ${dark ? 'text-orange-400' : 'text-orange-600'}`}>${gstPaid.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom line */}
          <div className={`mt-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${dark ? 'border-t-2 border-purple-500/40' : 'border-t-2 border-gray-300'}`}>
            <div className={`p-4 rounded-lg ${dark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50'}`}>
              <div className={`text-sm ${t.textMuted}`}>Net GST {netGst >= 0 ? '(Owed to IRD)' : '(Refund from IRD)'}</div>
              <div className={`text-3xl font-bold mt-1 ${netGst >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
                ${Math.abs(netGst).toFixed(2)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${dark ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-indigo-50'}`}>
              <div className={`text-sm ${t.textMuted}`}>Taxable Profit (ex-GST)</div>
              <div className={`text-3xl font-bold mt-1 ${taxableProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${taxableProfit.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expenses by Category */}
          <div className={t.card}>
            <h3 className={t.sectionTitle + ' mb-4'}>Expenses by Category</h3>
            {byCategory.length > 0 ? (
              <div className="space-y-3">
                {byCategory.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={t.textMuted}>{cat}</span>
                      <span className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>${amount.toFixed(2)}</span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-purple-500/20' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-red-400 transition-all"
                        style={{ width: `${(amount / catMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={t.textMuted}>No expenses in this period</p>
            )}
          </div>

          {/* Top Clients */}
          <div className={t.card}>
            <h3 className={t.sectionTitle + ' mb-4'}>Top Clients by Revenue</h3>
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map(([name, amount], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      dark ? 'bg-purple-500/30 text-purple-300' : 'bg-indigo-100 text-indigo-600'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{name}</p>
                    </div>
                    <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={t.textMuted}>No invoices in this period</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
