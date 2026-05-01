'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Search, FileText, Users, Receipt, X } from 'lucide-react';

interface Result {
  id: string;
  label: string;
  sub?: string;
  href: string;
  group: 'Invoice' | 'Client' | 'Expense';
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  Invoice: FileText,
  Client: Users,
  Expense: Receipt,
};

export default function CommandPalette({ open, onClose, dark }: { open: boolean; onClose: () => void; dark: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [allData, setAllData] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data once when palette first opens
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const client = generateClient<Schema>();
        const { listAll } = await import('@/lib/list-all');
        const [invoices, clients, expenses] = await Promise.all([
          listAll(client.models.Invoice),
          listAll(client.models.Client),
          listAll(client.models.Expense),
        ]);
        const data: Result[] = [
          ...(invoices as any[]).map(i => ({
            id: i.id, group: 'Invoice' as const,
            label: i.invoiceNumber, sub: `${i.clientName} · $${i.total?.toFixed(2)}`,
            href: `/invoices/${i.id}`,
          })),
          ...(clients as any[]).map(c => ({
            id: c.id, group: 'Client' as const,
            label: c.name, sub: c.email || '',
            href: `/clients/${c.id}/edit`,
          })),
          ...(expenses as any[]).map(e => ({
            id: e.id, group: 'Expense' as const,
            label: e.description, sub: `$${e.amount?.toFixed(2)} · ${e.category || ''}`,
            href: `/expenses/${e.id}/edit`,
          })),
        ];
        setAllData(data);
        setResults(data.slice(0, 8));
        setLoaded(true);
      } catch {}
    })();
  }, [open, loaded]);

  // Filter on query change
  useEffect(() => {
    if (!query.trim()) { setResults(allData.slice(0, 8)); return; }
    const q = query.toLowerCase();
    setResults(
      allData.filter(r => r.label.toLowerCase().includes(q) || (r.sub || '').toLowerCase().includes(q)).slice(0, 10)
    );
    setActiveIdx(0);
  }, [query, allData]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[activeIdx]) {
        router.push(results[activeIdx].href);
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, results, activeIdx, router, onClose]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.group]) acc[r.group] = [];
    acc[r.group].push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden ${dark ? 'bg-gray-900 border border-purple-500/30' : 'bg-white border border-gray-200'}`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark ? 'border-purple-500/20' : 'border-gray-100'}`}>
          <Search className={`w-5 h-5 flex-shrink-0 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search invoices, clients, expenses..."
            className={`flex-1 bg-transparent outline-none text-sm ${dark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          {query && (
            <button onClick={() => setQuery('')} className={dark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}>
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className={`text-xs px-1.5 py-0.5 rounded font-mono ${dark ? 'bg-gray-800 text-slate-500' : 'bg-gray-100 text-gray-400'}`}>esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className={`px-4 py-6 text-sm text-center ${dark ? 'text-slate-500' : 'text-gray-400'}`}>No results found</p>
          ) : (
            Object.entries(grouped).map(([group, items]) => {
              const Icon = GROUP_ICONS[group];
              return (
                <div key={group}>
                  <p className={`px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-600' : 'text-gray-400'}`}>{group}s</p>
                  {items.map(item => {
                    const idx = results.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => { router.push(item.href); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === activeIdx
                            ? (dark ? 'bg-purple-500/20' : 'bg-indigo-50')
                            : (dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{item.label}</p>
                          {item.sub && <p className={`text-xs truncate ${dark ? 'text-slate-500' : 'text-gray-500'}`}>{item.sub}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className={`flex items-center gap-4 px-4 py-2 border-t text-xs ${dark ? 'border-purple-500/10 text-slate-600' : 'border-gray-100 text-gray-400'}`}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">⌘K to close</span>
        </div>
      </div>
    </div>
  );
}
