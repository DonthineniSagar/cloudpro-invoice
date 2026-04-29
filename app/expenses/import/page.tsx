'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, Check } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { useToast } from '@/lib/toast-context';
import { validateFile, parseStatement, type BankTransaction } from '@/lib/bank-statement-parser';
import { getFY, isFYClosed, isPreviousFYOpen, fyShort } from '@/lib/fy-utils';

export default function ImportStatementPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const t = tc(theme);
  const toast = useToast();
  const dark = theme === 'dark';

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankName, setBankName] = useState('bank');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState(false);

  const handleFile = async (file: File) => {
    const fileErrors = validateFile(file);
    if (fileErrors.length) { toast.error(fileErrors.join(', ')); return; }
    const text = await file.text();
    const result = parseStatement(text);
    if (!result.success) { toast.error('Could not parse: ' + result.errors.slice(0, 3).join(', ')); return; }
    if (result.errors.length) toast.error(`${result.errors.length} rows skipped`);
    setTransactions(result.transactions);
    setParsed(true);
    toast.success(`${result.transactions.length} transactions found`);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); };

  // Partition transactions by FY status
  const openTransactions = transactions.filter(tx => !isFYClosed(getFY(tx.date)));
  const closedTransactions = transactions.filter(tx => isFYClosed(getFY(tx.date)));

  const handleImport = async () => {
    if (!openTransactions.length) return;
    setImporting(true);
    const client = generateClient<Schema>();
    const { getCurrentUser } = await import('aws-amplify/auth');
    const user = await getCurrentUser();
    let imported = 0;

    for (const tx of openTransactions) {
      try {
        const absAmount = Math.abs(tx.amount);
        const gstAmount = Math.round(absAmount * 3 / 23 * 100) / 100;
        try {
          await client.models.Expense.create({
            description: tx.description,
            category: 'Other',
            amount: absAmount,
            amountExGst: absAmount - gstAmount,
            gstAmount,
            gstClaimable: true,
            date: new Date(tx.date).toISOString(),
            notes: `Imported from ${bankName} bank statement`,
            status: 'PENDING' as any,
            source: 'bank_import' as any,
            classification: 'unclassified' as any,
            businessPercent: 100,
            userId: user.userId,
          });
        } catch {
          // Fallback: create without new schema fields if not deployed yet
          await client.models.Expense.create({
            description: tx.description,
            category: 'Other',
            amount: absAmount,
            amountExGst: absAmount - gstAmount,
            gstAmount,
            gstClaimable: true,
            date: new Date(tx.date).toISOString(),
            notes: `Imported from ${bankName} bank statement [bank_import]`,
            status: 'PENDING' as any,
            userId: user.userId,
          });
        }
        imported++;
        setProgress(Math.round((imported / openTransactions.length) * 100));
      } catch (err) {
        console.error('Failed to import:', tx.description, err);
        toast.error(`Failed: ${tx.description}`);
      }
    }

    const skippedMsg = closedTransactions.length > 0 ? ` (${closedTransactions.length} skipped — closed FY)` : '';
    toast.success(`${imported} transactions imported${skippedMsg} — classify them on the expenses page`);
    setTimeout(() => router.push('/expenses/review'), 1000);
  };

  const debits = transactions.filter(tx => tx.type === 'debit');
  const credits = transactions.filter(tx => tx.type === 'credit');

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/expenses" className={t.link}><ArrowLeft className="w-4 h-4" /> Back to Expenses</Link>
        <h1 className={dark ? 'text-2xl font-bold text-white mt-4 mb-6' : 'text-2xl font-bold text-gray-900 mt-4 mb-6'}>
          Import Bank Statement
        </h1>

        {!parsed ? (
          <div className={t.card}>
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
              className={`flex flex-col items-center justify-center gap-4 py-16 rounded-lg cursor-pointer ${dark ? 'border-2 border-dashed border-purple-500/40 hover:border-purple-500' : 'border-2 border-dashed border-gray-300 hover:border-indigo-400'}`}>
              <FileSpreadsheet className={`w-12 h-12 ${dark ? 'text-purple-400' : 'text-indigo-400'}`} />
              <div className="text-center">
                <p className={dark ? 'text-white font-medium' : 'text-gray-900 font-medium'}>Drop your bank statement CSV here</p>
                <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Supports ASB, ANZ, Westpac, BNZ, Kiwibank</p>
              </div>
              <label className={t.btnPrimary + ' cursor-pointer'}>
                <Upload className="w-4 h-4 mr-2 inline" /> Choose File
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              <p className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>Max 5MB · CSV only</p>
            </div>
          </div>
        ) : importing ? (
          <div className={t.card}>
            <div className="text-center py-12">
              <p className={dark ? 'text-white text-lg mb-4' : 'text-gray-900 text-lg mb-4'}>Importing {openTransactions.length} transactions...</p>
              <div className={`w-full h-3 rounded-full ${dark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className={`mt-2 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{progress}%</p>
            </div>
          </div>
        ) : (
          <>
            {/* Closed FY Warning */}
            {closedTransactions.length > 0 && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 ${dark ? 'bg-amber-900/20 border border-amber-500/30 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                <span className="text-sm">
                  ⚠ {closedTransactions.length} transaction{closedTransactions.length > 1 ? 's' : ''} fall in a closed FY and will be skipped.
                </span>
              </div>
            )}

            {/* Summary */}
            <div className={`${dark ? 'bg-gray-900 border border-purple-500/30' : 'bg-white border-2 border-indigo-600'} rounded-lg p-4 mb-4 flex gap-6 text-sm`}>
              <span className={dark ? 'text-slate-400' : 'text-gray-500'}>{bankName} format detected</span>
              <span className={dark ? 'text-white' : 'text-gray-900'}>{transactions.length} transactions</span>
              <span className="text-red-400">{debits.length} debits</span>
              <span className="text-green-400">{credits.length} credits</span>
              {closedTransactions.length > 0 && (
                <span className={dark ? 'text-amber-400' : 'text-amber-600'}>{closedTransactions.length} closed FY (skipped)</span>
              )}
            </div>

            {/* Preview table */}
            <div className={`${dark ? 'bg-black border border-purple-500/30' : 'bg-white border-2 border-indigo-600'} rounded-lg overflow-hidden`}>
              <div className="max-h-[55vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className={`sticky top-0 ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`text-left px-4 py-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Date</th>
                      <th className={`text-left px-4 py-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Description</th>
                      <th className={`text-right px-4 py-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Amount</th>
                      <th className={`text-center px-4 py-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Type</th>
                      <th className={`text-center px-4 py-3 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>FY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const txClosed = isFYClosed(getFY(tx.date));
                      const txFY = getFY(tx.date);
                      return (
                      <tr key={tx.id} className={`border-t ${dark ? 'border-gray-800' : 'border-gray-100'} ${txClosed ? 'opacity-50' : ''}`}>
                        <td className={`px-4 py-2 ${txClosed ? 'line-through' : ''} ${dark ? 'text-slate-300' : 'text-gray-700'}`}>{tx.date}</td>
                        <td className={`px-4 py-2 max-w-sm truncate ${txClosed ? 'line-through' : ''} ${dark ? 'text-white' : 'text-gray-900'}`}>{tx.description}</td>
                        <td className={`px-4 py-2 text-right font-mono ${txClosed ? 'line-through' : ''} ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ${Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${tx.type === 'debit' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {txClosed ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Closed FY</span>
                          ) : txFY < (getFY(new Date())) ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">{fyShort(txFY)}</span>
                          ) : null}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={handleImport} disabled={openTransactions.length === 0}
                className={`flex-1 ${openTransactions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${t.btnPrimary}`}>
                <Check className="w-4 h-4 mr-2 inline" /> Import {openTransactions.length} Transaction{openTransactions.length !== 1 ? 's' : ''}
              </button>
              <button onClick={() => { setParsed(false); setTransactions([]); }} className={t.btnSecondary}>
                Start Over
              </button>
            </div>
            <p className={`text-xs mt-2 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
              All transactions will be imported as unclassified. You can mark them as business, personal, or partial from the expenses page.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
