'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Plus, Search, Mail, Phone, MapPin, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { ClientCardSkeleton } from '@/components/Skeleton';

export default function ClientsPage() {
  const { theme } = useTheme();
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const client = generateClient<Schema>();
      const { listAll } = await import('@/lib/list-all');
      const data = await listAll(client.models.Client);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    
    try {
      const client = generateClient<Schema>();
      await client.models.Client.delete({ id });
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Clients</h1>
                <p className={theme === 'dark' ? 'text-slate-400 mt-1' : 'text-gray-600 mt-1'}>Manage your client contacts</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <ClientCardSkeleton key={i} />)}
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
            <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white' : 'text-3xl font-bold text-gray-900'}>Clients</h1>
            <p className={theme === 'dark' ? 'text-slate-400 mt-1' : 'text-gray-600 mt-1'}>Manage your client contacts</p>
          </div>
          <Link
            href="/clients/new"
            className={theme === 'dark' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center gap-2' : 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2'}
          >
            <Plus className="w-5 h-5" />
            Add Client
          </Link>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className={theme === 'dark' ? 'absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5' : 'absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5'} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={theme === 'dark' ? { color: 'white' } : {}}
              className={theme === 'dark' ? 'w-full pl-12 pr-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 placeholder-slate-500 focus:outline-none' : 'w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'}
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-12 text-center' : 'bg-white rounded-xl border-2 border-indigo-600 p-12 text-center'}>
            <div className={theme === 'dark' ? 'text-slate-600 mb-4' : 'text-gray-400 mb-4'}>
              <Plus className="w-16 h-16 mx-auto" />
            </div>
            <h3 className={theme === 'dark' ? 'text-xl font-semibold text-white mb-2' : 'text-xl font-semibold text-gray-900 mb-2'}>No clients yet</h3>
            <p className={theme === 'dark' ? 'text-slate-400 mb-6' : 'text-gray-600 mb-6'}>Get started by adding your first client</p>
            <Link
              href="/clients/new"
              className={theme === 'dark' ? 'inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600' : 'inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700'}
            >
              <Plus className="w-5 h-5" />
              Add Client
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-6 hover:border-purple-500 transition-all' : 'bg-white rounded-xl border-2 border-indigo-600 p-6 hover:shadow-md transition-shadow'}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className={theme === 'dark' ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900'}>{client.name}</h3>
                  <div className="flex gap-2">
                    <Link
                      href={`/clients/${client.id}/edit`}
                      className={theme === 'dark' ? 'text-slate-500 hover:text-purple-400' : 'text-gray-400 hover:text-indigo-600'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className={theme === 'dark' ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-600'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className={theme === 'dark' ? 'flex items-center gap-2 text-slate-400' : 'flex items-center gap-2 text-gray-600'}>
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className={theme === 'dark' ? 'flex items-center gap-2 text-slate-400' : 'flex items-center gap-2 text-gray-600'}>
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.city && (
                    <div className={theme === 'dark' ? 'flex items-center gap-2 text-slate-400' : 'flex items-center gap-2 text-gray-600'}>
                      <MapPin className="w-4 h-4" />
                      <span>{client.city}, {client.country || 'New Zealand'}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <p className={theme === 'dark' ? 'mt-4 text-sm text-slate-500 line-clamp-2' : 'mt-4 text-sm text-gray-500 line-clamp-2'}>{client.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
