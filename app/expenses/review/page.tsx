'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, User, Split, Link2, Check, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';

type Expense = any;

export default function ReviewExpensesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';

  const [unclassified, setUnclassified] = useState<Expense[]>([]);
  const [existingExpenses, setExistingExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'debit' | 'credit'>('all');

  const fetchData = async () => {
    const client = generateClient<Schema>();
    const { listAll } = await import('@/lib/list-all');
    const all = await listAll(client.models.Expense) as Expense[];
    setUnclassified(all.filter(e => !e.classification || e.classification === 'unclassified' || e.notes?.includes('[bank_import]')));
    setExistingExpenses(all.filter(e => e.classification && e.classification !== 'unclassified' && !e.notes?.includes('[bank_import]')));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const classify = async (id: string, classification: string, businessPercent = 100) => {
    setSaving(prev => new Set(prev).add(id));
    try {
      const client = generateClient<Schema>();
      await client.models.Expense.update({ id, classification: classification as any, businessPercent });
      setUnclassified(prev => prev.map(e => e.id === id ? { ...e, classification, businessPercent } : e));
    } catch { toast.error('Failed to update'); }
    setSaving(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const bulkClassify = async (classification: string) => {
    const targets = filtered.filter(e => !e.classification || e.classification === 'unclassified');
    if (!targets.length) return;
    setSaving(new Set(targets.map(e => e.id)));
    const client = generateClient<Schema>();
    for (const e of targets) {
      try {
        await client.models.Expense.update({ id: e.id, classification: classification as any, businessPercent: classification === 'partial' ? 50 : 100 });
      } catch {}
    }
    await fetchData();
    setSaving(new Set());
    toast.success(`${targets.length} marked as ${classification}`);
  };

  const linkToExisting = async (bankExpenseId: string, existingExpenseId: string) => {
    // Delete the bank import entry and tag the existing expense as reconciled
    setSaving(prev => new Set(prev).add(bankExpenseId));
    try {
      const client = generateClient<Schema>();
      const bankExp = unclassified.find(e => e.id === bankExpenseId);
      const existingExp = existingExpenses.find(e => e.id === existingExpenseId);
      // Update existing expense notes with bank reconciliation
      await client.models.Expense.update({
        id: existingExpenseId,
        notes: `${existingExp?.notes || ''}\n🔗 Reconciled with bank transaction (${bankExp?.date?.split('T')[0]}, $${Math.abs(bankExp?.amount || 0).toFixed(2)})`.trim(),
      });
      // Delete the bank import duplicate
      await client.models.Expense.delete({ id: bankExpenseId });
      setUnclassified(prev => prev.filter(e => e.id !== bankExpenseId));
      setLinkingId(null);
      toast.success('Linked and reconciled');
    } catch { toast.error('Failed to link'); }
    setSaving(prev => { const n = new Set(prev); n.delete(bankExpenseId); return n; });
  };

  const deleteExpense = async (id: string) => {
    setSaving(prev => new Set(prev).add(id));
    try {
      const client = generateClient<Schema>();
      await client.models.Expense.delete({ id });
      setUnclassified(prev => prev.filter(e => e.id !== id));
    } catch { toast.error('Failed to delete'); }
    setSaving(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Find potential matches for linking
  const findMatches = (expense: Expense): Expense[] => {
    const amt = Math.abs(expense.amount || 0);
    const date = expense.date?.split('T')[0];
    return existingExpenses.filter(e => {
      const eAmt = Math.abs(e.amount || 0);
      const eDate = e.date?.split('T')[0];
      // Match by exact amount, or amount within 1 cent + date within 7 days
      if (Math.abs(eAmt - amt) < 0.02) return true;
      if (date && eDate && Math.abs(eAmt - amt) < 1 && Math.abs(new Date(date).getTime() - new Date(eDate).getTime()) < 7 * 86400000) return true;
      return false;
    });
  };

  const filtered = unclassified.filter(e => {
    if (filter === 'debit' && e.amount >= 0) return false;
    if (filter === 'credit' && e.amount < 0) return false;
    return true;
  });

  const counts = {
    total: unclassified.length,
    remaining: unclassified.filter(e => !e.classification || e.classification === 'unclassified').length,
    business: unclassified.filter(e => e.classification === 'business').length,
    personal: unclassified.filter(e => e.classification === 'personal').length,
    partial: unclassified.filter(e => e.classification === 'partial').length,
  };

  if (loading) return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className={t.textMuted}>Loading...</div></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/expenses" className={t.link}><ArrowLeft className="w-4 h-4" /> Back to Expenses</Link>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className={dark ? 'text-2xl font-bold text-white' : 'text-2xl font-bold text-gray-900'}>Review Imported Transactions</h1>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Classify each transaction as business, personal, or partial</p>
          </div>
          {counts.remaining === 0 && counts.total > 0 && (
            <Link href="/expenses" className={t.btnPrimary}>
              <Check className="w-4 h-4 mr-2 inline" /> Done — View Expenses
            </Link>
          )}
        </div>

        {counts.total === 0 ? (
          <div className={t.card}>
            <div className="text-center py-12">
              <p className={dark ? 'text-white' : 'text-gray-900'}>No unclassified transactions</p>
              <Link href="/expenses/import" className={`inline-block mt-4 ${t.btnPrimary}`}>Import a Statement</Link>
            </div>
          </div>
        ) : (
          <>
            {/* Summary + bulk actions */}
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/30' : 'bg-white border border-gray-200'} rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-center justify-between`}>
              <div className="flex gap-4 text-sm">
                <span className="text-yellow-500 font-medium">{counts.remaining} to review</span>
                <span className="text-green-500">{counts.business} business</span>
                <span className="text-red-400">{counts.personal} personal</span>
                <span className="text-blue-400">{counts.partial} partial</span>
              </div>
              <div className="flex gap-2">
                {(['all', 'debit', 'credit'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded ${filter === f ? (dark ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white') : (dark ? 'bg-gray-800 text-slate-400' : 'bg-gray-100 text-gray-600')}`}>
                    {f === 'all' ? 'All' : f === 'debit' ? 'Expenses' : 'Income'}
                  </button>
                ))}
                <span className="mx-1 border-l border-gray-600" />
                <button onClick={() => bulkClassify('business')} className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700">All ✓ Business</button>
                <button onClick={() => bulkClassify('personal')} className="text-xs px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600">All ✗ Personal</button>
              </div>
            </div>

            {/* Transaction list */}
            <div className={`${dark ? 'bg-black border border-purple-500/30' : 'bg-white border border-gray-200'} rounded-lg overflow-hidden`}>
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-800">
                {filtered.map(expense => {
                  const amt = Math.abs(expense.amount || 0);
                  const isDebit = expense.amount < 0;
                  const date = expense.date?.split('T')[0] || '';
                  const matches = findMatches(expense);
                  const isSaving = saving.has(expense.id);
                  const cls = expense.classification || 'unclassified';

                  return (
                    <div key={expense.id} className={`px-4 py-3 ${cls !== 'unclassified' ? (dark ? 'opacity-60' : 'opacity-50') : ''}`}>
                      <div className="flex items-center gap-4">
                        {/* Date + description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{date}</span>
                            <span className={`text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{expense.description}</span>
                          </div>
                          {matches.length > 0 && cls === 'unclassified' && (
                            <div className="mt-1">
                              <button onClick={() => setLinkingId(linkingId === expense.id ? null : expense.id)}
                                className={`text-xs flex items-center gap-1 ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                <Link2 className="w-3 h-3" /> {matches.length} possible match{matches.length > 1 ? 'es' : ''}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <span className={`text-sm font-mono w-24 text-right ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                          ${amt.toFixed(2)}
                        </span>

                        {/* Classification badge */}
                        {cls !== 'unclassified' && (
                          <span className={`text-xs px-2 py-0.5 rounded w-16 text-center ${
                            cls === 'business' ? 'bg-green-600/20 text-green-400' :
                            cls === 'personal' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{cls}</span>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : (
                            <>
                              <button onClick={() => classify(expense.id, 'business')} title="Business"
                                className={`p-1.5 rounded ${cls === 'business' ? 'bg-green-600 text-white' : dark ? 'bg-gray-800 text-slate-500 hover:text-green-400' : 'bg-gray-100 text-gray-400 hover:text-green-600'}`}>
                                <Building2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => classify(expense.id, 'personal')} title="Personal"
                                className={`p-1.5 rounded ${cls === 'personal' ? 'bg-red-500 text-white' : dark ? 'bg-gray-800 text-slate-500 hover:text-red-400' : 'bg-gray-100 text-gray-400 hover:text-red-600'}`}>
                                <User className="w-4 h-4" />
                              </button>
                              <button onClick={() => classify(expense.id, 'partial', 50)} title="Partial"
                                className={`p-1.5 rounded ${cls === 'partial' ? 'bg-blue-500 text-white' : dark ? 'bg-gray-800 text-slate-500 hover:text-blue-400' : 'bg-gray-100 text-gray-400 hover:text-blue-600'}`}>
                                <Split className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteExpense(expense.id)} title="Delete"
                                className={`p-1.5 rounded ${dark ? 'bg-gray-800 text-slate-500 hover:text-red-400' : 'bg-gray-100 text-gray-400 hover:text-red-600'}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Link matches panel */}
                      {linkingId === expense.id && matches.length > 0 && (
                        <div className={`mt-2 ml-4 p-3 rounded-lg text-sm ${dark ? 'bg-gray-900 border border-purple-500/20' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`text-xs mb-2 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Link to existing expense (will merge and remove this import):</p>
                          {matches.map(m => (
                            <div key={m.id} className={`flex items-center justify-between py-1.5 ${dark ? 'border-b border-gray-800' : 'border-b border-gray-100'} last:border-0`}>
                              <div>
                                <span className={dark ? 'text-white' : 'text-gray-900'}>{m.description}</span>
                                <span className={`ml-2 text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
                                  {m.date?.split('T')[0]} · ${Math.abs(m.amount || 0).toFixed(2)} · {m.source || 'manual'}
                                </span>
                              </div>
                              <button onClick={() => linkToExisting(expense.id, m.id)}
                                className="text-xs px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">
                                Link
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
