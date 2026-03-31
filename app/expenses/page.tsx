'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '@/amplify/data/resource';
import { Plus, Receipt, Search, CheckCircle, AlertTriangle, Edit, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';

export default function ExpensesPage() {
  const { theme } = useTheme();
  const t = tc(theme);
  const dark = theme === 'dark';
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const deleteExpense = async (id: string, status: string) => {
    if (status === 'APPROVED') return;
    if (!confirm('Delete this expense?')) return;
    try {
      const client = generateClient<Schema>();
      await client.models.Expense.delete({ id });
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const client = generateClient<Schema>();
      const { data } = await client.models.Expense.list();
      const sorted = data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(sorted);

      // Resolve thumbnail URLs for expenses with receipts
      const urls: Record<string, string> = {};
      await Promise.all(
        sorted.filter((e: any) => e.receiptUrl).map(async (e: any) => {
          try {
            const { url } = await getUrl({ path: e.receiptUrl });
            urls[e.id] = url.toString();
          } catch {}
        })
      );
      setThumbnails(urls);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const client = generateClient<Schema>();
      await client.models.Expense.update({ id, status: status as any });
      await fetchExpenses();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filtered = expenses.filter(e => {
    const matchesSearch = e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = !monthFilter || e.date?.startsWith(monthFilter);
    return matchesSearch && matchesMonth;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalGstClaimable = expenses.filter(e => e.gstClaimable).reduce((sum, e) => sum + (e.gstAmount || 0), 0);
  const missingReceipts = expenses.filter(e => (e.amount || 0) > 50 && !e.receiptUrl).length;

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-green-100 text-green-800';
    if (status === 'REJECTED') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const categoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Advertising & Marketing': '📣', 'Communication (Phone & Internet)': '📱',
      'Depreciation': '📉', 'Entertainment (50% deductible)': '🍽️',
      'General & Administrative': '📋', 'Insurance': '🛡️',
      'Interest & Bank Fees': '🏦', 'Legal & Accounting': '⚖️',
      'Motor Vehicle': '🚗', 'Office Expenses': '🏢',
      'Rent & Rates': '🏠', 'Repairs & Maintenance': '🔧',
      'Software & Subscriptions': '💻', 'Subcontractors': '👷',
      'Travel & Accommodation': '✈️', 'Other': '📦',
      // Legacy fallbacks
      'Travel': '✈️', 'Office': '🏢', 'Software': '💻', 'Equipment': '🔧',
      'Marketing': '📣', 'Meals': '🍽️', 'Utilities': '⚡',
    };
    return icons[category] || '📦';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={dark ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Expenses</h1>
            <p className={t.textMuted}>Track and manage your business expenses</p>
          </div>
          <Link href="/expenses/new" className={`flex items-center gap-2 ${t.btnPrimary}`}>
            <Plus className="w-4 h-4" /> Add Expense
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={t.card}>
            <p className={t.textMuted}>Total Expenses</p>
            <p className={`text-2xl font-bold mt-1 ${dark ? 'text-white' : 'text-gray-900'}`}>${totalExpenses.toFixed(2)}</p>
          </div>
          <div className={t.card}>
            <p className={t.textMuted}>GST Claimable</p>
            <p className={`text-2xl font-bold mt-1 ${dark ? 'text-green-400' : 'text-green-600'}`}>${totalGstClaimable.toFixed(2)}</p>
          </div>
          <div className={t.card}>
            <p className={t.textMuted}>Total Records</p>
            <p className={`text-2xl font-bold mt-1 ${dark ? 'text-white' : 'text-gray-900'}`}>{expenses.length}</p>
          </div>
        </div>

        {/* Missing Receipt Warning */}
        {missingReceipts > 0 && (
          <div className={`flex items-start gap-3 p-4 rounded-lg mb-6 ${dark ? 'bg-amber-900/30 border border-amber-500/40' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className={dark ? 'font-medium text-amber-400' : 'font-medium text-amber-900'}>Receipt Required</h4>
              <p className={`text-sm mt-1 ${dark ? 'text-amber-300/80' : 'text-amber-700'}`}>
                {missingReceipts} expense{missingReceipts !== 1 ? 's' : ''} over $50 missing receipt{missingReceipts !== 1 ? 's' : ''}. IRD requires receipts for all expenses over $50.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${dark ? 'text-slate-400' : 'text-gray-400'}`} />
            <input type="text" placeholder="Search expenses..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-10 ${t.input}`} />
          </div>
          <input type="month" value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={dark ? { colorScheme: 'dark' } : {}}
            className={`w-44 ${t.input}`} />
          {monthFilter && (
            <button onClick={() => setMonthFilter('')}
              className={`px-3 text-sm ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              Clear
            </button>
          )}
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="text-center py-12"><p className={t.textMuted}>Loading expenses...</p></div>
        ) : filtered.length === 0 ? (
          <div className={`${t.card} text-center py-12`}>
            <Receipt className={`w-12 h-12 mx-auto mb-4 ${dark ? 'text-slate-600' : 'text-gray-300'}`} />
            <h3 className={dark ? 'text-lg font-medium text-white mb-2' : 'text-lg font-medium text-gray-900 mb-2'}>
              {search ? 'No expenses found' : 'No expenses yet'}
            </h3>
            <p className={t.textMuted}>
              {search ? 'Try a different search term' : 'Add your first expense to start tracking'}
            </p>
            {!search && (
              <Link href="/expenses/new" className={`inline-flex items-center gap-2 mt-4 ${t.btnPrimary}`}>
                <Plus className="w-4 h-4" /> Add Expense
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((expense) => {
              const needsReceipt = (expense.amount || 0) > 50 && !expense.receiptUrl;
              return (
                <div key={expense.id}
                  className={`${dark ? 'bg-black rounded-xl border-2 border-purple-500/40 p-4' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-4'}`}>
                  <div className="flex items-center justify-between">
                    <Link href={`/expenses/${expense.id}/edit`} className="flex items-center gap-4 flex-1 min-w-0">
                      {thumbnails[expense.id] ? (
                        <img src={thumbnails[expense.id]} alt="Receipt"
                          onClick={(e) => { e.preventDefault(); setViewingReceipt(thumbnails[expense.id]); }}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 cursor-zoom-in hover:opacity-80" />
                      ) : (
                        <span className="text-2xl">{categoryIcon(expense.category || 'Other')}</span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{expense.description}</p>
                          {needsReceipt && (
                            <span className="flex items-center gap-1 text-xs text-amber-500 flex-shrink-0" title="Receipt missing - required for expenses over $50">
                              <AlertTriangle className="w-3.5 h-3.5" /> No receipt
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm ${t.textMuted}`}>{expense.category || 'Uncategorized'}</span>
                          <span className={`text-sm ${t.textMuted}`}>{new Date(expense.date).toLocaleDateString()}</span>
                          {expense.gstClaimable && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">GST</span>}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-right mr-2">
                        <p className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>${expense.amount?.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(expense.status || 'PENDING')}`}>
                          {expense.status || 'PENDING'}
                        </span>
                      </div>

                      {/* Inline action buttons */}
                      {expense.status === 'PENDING' && (
                        <button onClick={() => updateStatus(expense.id, 'APPROVED')}
                          title="Approve expense"
                          className={`p-2 rounded-lg transition-colors ${dark ? 'text-green-400 hover:bg-green-900/30 border border-green-500/30 hover:border-green-500' : 'text-green-600 hover:bg-green-50 border border-green-200 hover:border-green-400'}`}>
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <Link href={`/expenses/${expense.id}/edit`}
                        className={`p-2 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-white hover:bg-purple-900/30' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                      {expense.status !== 'APPROVED' && (
                        <button onClick={() => deleteExpense(expense.id, expense.status)}
                          className={`p-2 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
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

      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingReceipt(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button onClick={() => setViewingReceipt(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm">
              ✕ Close
            </button>
            <img src={viewingReceipt} alt="Receipt" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
