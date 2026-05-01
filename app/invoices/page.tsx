'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Plus, Search, FileText, Calendar, DollarSign, Copy, CheckSquare, Square, Check } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { TableRowSkeleton } from '@/components/Skeleton';
import { currentFY, fyLabel, getFY, selectableFYs } from '@/lib/fy-utils';
import { useToast } from '@/lib/toast-context';
import { downloadCSV } from '@/lib/csv-export';

export default function InvoicesPage() {
  const { theme } = useTheme();
  const toast = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [fyFilter, setFyFilter] = useState(currentFY());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) setSearchTerm(search);
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const client = generateClient<Schema>();
      const { listAll } = await import('@/lib/list-all');
      const data = await listAll(client.models.Invoice);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredInvoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const bulkMarkPaid = async () => {
    if (!selected.size) return;
    setBulkWorking(true);
    try {
      const client = generateClient<Schema>();
      await Promise.all([...selected].map(id => client.models.Invoice.update({ id, status: 'PAID' as any })));
      setInvoices(prev => prev.map(inv => selected.has(inv.id) ? { ...inv, status: 'PAID' } : inv));
      setSelected(new Set());
      toast.success(`${selected.size} invoice${selected.size > 1 ? 's' : ''} marked as paid`);
    } catch {
      toast.error('Failed to update some invoices');
    } finally {
      setBulkWorking(false);
    }
  };

  const bulkExportCSV = () => {
    const rows = filteredInvoices
      .filter(inv => selected.has(inv.id))
      .map(inv => [
        inv.invoiceNumber, inv.clientName, inv.clientEmail || '',
        new Date(inv.issueDate).toLocaleDateString('en-NZ'),
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-NZ') : '',
        inv.subtotal?.toFixed(2) || '0.00',
        inv.gstAmount?.toFixed(2) || '0.00',
        inv.total?.toFixed(2) || '0.00',
        inv.status, inv.currency || 'NZD',
      ]);
    downloadCSV(
      `invoices-${new Date().toISOString().split('T')[0]}.csv`,
      ['Invoice #', 'Client', 'Email', 'Issue Date', 'Due Date', 'Subtotal', 'GST', 'Total', 'Status', 'Currency'],
      rows
    );
    setSelected(new Set());
  };

  const filteredInvoices = invoices
    .filter(inv =>
      (inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!fyFilter || (inv.issueDate && getFY(inv.issueDate) === fyFilter))
    )
    .sort((a, b) => {
      const da = new Date(a.issueDate).getTime();
      const db = new Date(b.issueDate).getTime();
      return sortDir === 'desc' ? db - da : da - db;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Invoices</h1>
              <p className={theme === 'dark' ? 'text-slate-400 mt-1' : 'text-gray-600 mt-1'}>Manage your invoices</p>
            </div>
          </div>
          <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 overflow-hidden' : 'bg-white rounded-xl border-2 border-indigo-600 overflow-hidden'}>
            <table className="min-w-full">
              <thead className={theme === 'dark' ? 'bg-black border-b border-purple-500/20' : 'bg-gray-50'}>
                <tr>
                  {['Invoice', 'Client', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-purple-500/20' : 'divide-y divide-gray-200'}>
                {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
              </tbody>
            </table>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Invoices</h1>
            <p className={theme === 'dark' ? 'text-slate-400 mt-1' : 'text-gray-600 mt-1'}>Manage your invoices</p>
          </div>
          <Link
            href="/invoices/new"
            className={theme === 'dark' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center gap-2' : 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2'}
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </Link>
        </div>

        <div className="mb-6 flex gap-3">
          <select value={fyFilter} onChange={(e) => setFyFilter(Number(e.target.value))}
            aria-label="Financial Year"
            className={`w-44 ${theme === 'dark' ? 'bg-black border-2 border-purple-500/40 rounded-lg text-white px-3 py-3 focus:border-purple-500 focus:outline-none' : 'border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'}`}>
            {selectableFYs().map(fy => (
              <option key={fy} value={fy}>{fyLabel(fy)}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className={theme === 'dark' ? 'absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5' : 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'} />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={theme === 'dark' ? { color: 'white' } : {}}
              className={theme === 'dark' ? 'w-full pl-12 pr-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 placeholder-slate-500 focus:outline-none' : 'w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'}
            />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-12 text-center' : 'bg-white rounded-xl border-2 border-indigo-600 p-12 text-center'}>
            <div className={theme === 'dark' ? 'text-slate-600 mb-4' : 'text-gray-400 mb-4'}>
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h3 className={theme === 'dark' ? 'text-xl font-semibold text-white mb-2' : 'text-xl font-semibold text-gray-900 mb-2'}>No invoices yet</h3>
            <p className={theme === 'dark' ? 'text-slate-400 mb-6' : 'text-gray-600 mb-6'}>Create your first invoice to get started</p>
            <Link
              href="/invoices/new"
              className={theme === 'dark' ? 'inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600' : 'inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700'}
            >
              <Plus className="w-5 h-5" />
              New Invoice
            </Link>
          </div>
        ) : (
          <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 overflow-hidden' : 'bg-white rounded-xl border-2 border-indigo-600 overflow-hidden'}>
            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${theme === 'dark' ? 'bg-purple-900/20 border-purple-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-indigo-700'}`}>
                  {selected.size} selected
                </span>
                <button onClick={bulkMarkPaid} disabled={bulkWorking}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'} disabled:opacity-50`}>
                  <Check className="w-3.5 h-3.5" />
                  Mark paid
                </button>
                <button onClick={bulkExportCSV}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                  Export CSV
                </button>
                <button onClick={() => setSelected(new Set())} className={`ml-auto text-xs ${theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
                  Clear
                </button>
              </div>
            )}

            <table className="min-w-full divide-y divide-purple-500/20">
              <thead className={theme === 'dark' ? 'bg-black border-b border-purple-500/20' : 'bg-gray-50'}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className={theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}>
                      {selected.size === filteredInvoices.length && filteredInvoices.length > 0
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}>
                    Invoice
                  </th>
                  <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}>
                    Client
                  </th>
                  <th onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} className={`cursor-pointer select-none ${theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}`}>
                    Date {sortDir === 'desc' ? '↓' : '↑'}
                  </th>
                  <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}>
                    Amount
                  </th>
                  <th className={theme === 'dark' ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'}>
                    Status
                  </th>
                  <th className={theme === 'dark' ? 'px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider' : 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'bg-black divide-y divide-purple-500/20' : 'bg-white divide-y divide-gray-200'}>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className={theme === 'dark' ? 'hover:bg-purple-500/5' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4 w-10">
                      <button onClick={() => toggleSelect(invoice.id)} className={theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}>
                        {selected.has(invoice.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className={theme === 'dark' ? 'w-5 h-5 text-slate-500 mr-3' : 'w-5 h-5 text-gray-400 mr-3'} />
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className={theme === 'dark' ? 'text-purple-400 hover:text-purple-300 font-medium' : 'text-indigo-600 hover:text-indigo-900 font-medium'}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={theme === 'dark' ? 'text-sm text-white' : 'text-sm text-gray-900'}>{invoice.clientName}</div>
                      <div className={theme === 'dark' ? 'text-sm text-slate-500' : 'text-sm text-gray-500'}>{invoice.clientEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={theme === 'dark' ? 'flex items-center text-sm text-white' : 'flex items-center text-sm text-gray-900'}>
                        <Calendar className={theme === 'dark' ? 'w-4 h-4 text-slate-500 mr-2' : 'w-4 h-4 text-gray-400 mr-2'} />
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={theme === 'dark' ? 'flex items-center text-sm font-medium text-white' : 'flex items-center text-sm font-medium text-gray-900'}>
                        <DollarSign className={theme === 'dark' ? 'w-4 h-4 text-slate-500' : 'w-4 h-4 text-gray-400'} />
                        {invoice.total?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/invoices/new?clone=${invoice.id}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-slate-400 hover:text-white hover:bg-purple-500/20'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        title="Copy invoice"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
