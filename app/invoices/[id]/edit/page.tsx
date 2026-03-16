'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { calculateGST, calculateTotal } from '@/lib/gst-calculations';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { useToast } from '@/lib/toast-context';

type LineItem = {
  id: string;
  description: string;
  wbs: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { theme } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientDetails, setClientDetails] = useState({
    name: '',
    email: '',
    address: ''
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    notes: '',
    paymentTerms: 'Due within 30 days',
    status: 'DRAFT'
  });

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadInvoice(), loadClients(), loadCompanyProfile()]);
    };
    loadData();
  }, []);

  const loadInvoice = async () => {
    try {
      const client = generateClient<Schema>();
      const { data: invoice } = await client.models.Invoice.get({ id: params.id });
      
      if (invoice) {
        if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
          router.push(`/invoices/${params.id}`);
          return;
        }
        setFormData({
          invoiceNumber: invoice.invoiceNumber || '',
          issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
          notes: invoice.notes || '',
          paymentTerms: invoice.paymentTerms || 'Due within 30 days',
          status: invoice.status || 'DRAFT'
        });

        setClientDetails({
          name: invoice.clientName || '',
          email: invoice.clientEmail || '',
          address: invoice.clientAddress || ''
        });

        const { data: items } = await client.models.InvoiceItem.list({
          filter: { invoiceId: { eq: params.id } }
        });

        if (items && items.length > 0) {
          setLineItems(items.map(item => ({
            id: item.id,
            description: item.description || '',
            wbs: item.wbs || '',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            amount: item.amount || 0
          })));
        }
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const client = generateClient<Schema>();
      const { data } = await client.models.Client.list();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const client = generateClient<Schema>();
      const { data } = await client.models.CompanyProfile.list();
      if (data && data.length > 0) {
        setCompanyProfile(data[0]);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
    if (client) {
      const addressParts = [
        client.address,
        client.city,
        client.state,
        client.postalCode,
        client.country
      ].filter(Boolean);
      
      setClientDetails({
        name: client.name || '',
        email: client.email || '',
        address: addressParts.join(', ')
      });
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      wbs: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = calculateGST(subtotal);
  const total = calculateTotal(subtotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const client = generateClient<Schema>();

      // Update invoice
      await client.models.Invoice.update({
        id: params.id,
        invoiceNumber: formData.invoiceNumber,
        clientName: clientDetails.name,
        clientEmail: clientDetails.email,
        clientAddress: clientDetails.address,
        issueDate: new Date(formData.issueDate).toISOString(),
        dueDate: new Date(formData.dueDate).toISOString(),
        notes: formData.notes,
        paymentTerms: formData.paymentTerms,
        subtotal,
        gstAmount,
        total,
        status: formData.status as any
      });

      // Delete old line items
      const { data: oldItems } = await client.models.InvoiceItem.list({
        filter: { invoiceId: { eq: params.id } }
      });
      for (const item of oldItems) {
        await client.models.InvoiceItem.delete({ id: item.id });
      }

      // Create new line items
      for (const item of lineItems) {
        await client.models.InvoiceItem.create({
          description: item.description,
          wbs: item.wbs,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          invoiceId: params.id
        });
      }

      router.push(`/invoices/${params.id}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>Loading invoice...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/invoices/${params.id}`}
          className={theme === 'dark' ? 'inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6' : 'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoice
        </Link>

        <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-8' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-8'}>
          <h1 className={theme === 'dark' ? 'text-2xl font-bold text-white mb-6' : 'text-2xl font-bold text-gray-900 mb-6'}>Edit Invoice</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Invoice Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>

              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Issue Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  style={theme === 'dark' ? { colorScheme: 'dark' } : {}}
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>

              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  style={theme === 'dark' ? { colorScheme: 'dark' } : {}}
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>
            </div>

            {/* Client Details */}
            <div className={theme === 'dark' ? 'bg-black border-2 border-purple-500/40 p-4 rounded-lg space-y-3' : 'bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3'}>
              <h4 className={theme === 'dark' ? 'font-medium text-white' : 'font-medium text-gray-900'}>Bill To:</h4>
              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientDetails.name}
                  onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                  
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>
              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Email
                </label>
                <input
                  type="email"
                  value={clientDetails.email}
                  onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                  
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>
              <div>
                <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                  Address
                </label>
                <textarea
                  rows={2}
                  value={clientDetails.address}
                  onChange={(e) => setClientDetails({ ...clientDetails, address: e.target.value })}
                  
                  className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className={theme === 'dark' ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-900'}>Line Items</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className={theme === 'dark' ? 'text-purple-400 hover:text-purple-300 flex items-center gap-2' : 'text-indigo-600 hover:text-indigo-700 flex items-center gap-2'}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start">
                    <div className="sm:col-span-4">
                      <label className="sm:hidden text-xs text-gray-500 mb-1 block">Description</label>
                      <input
                        type="text"
                        placeholder="Description"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        
                        className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="sm:hidden text-xs text-gray-500 mb-1 block">WBS</label>
                      <input
                        type="text"
                        placeholder="WBS"
                        value={item.wbs}
                        onChange={(e) => updateLineItem(item.id, 'wbs', e.target.value)}
                        
                        className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:contents">
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-gray-500 mb-1 block">Qty</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          required
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          
                          className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-xs text-gray-500 mb-1 block">Rate</label>
                        <input
                          type="number"
                          placeholder="Rate"
                          required
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          
                          className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
                        />
                      </div>
                      <div className="flex items-end sm:items-center justify-between sm:col-span-2">
                        <span className={theme === 'dark' ? 'text-white font-medium' : 'text-gray-900 font-medium'}>${item.amount.toFixed(2)}</span>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className={theme === 'dark' ? 'text-red-400 hover:text-red-300 ml-2' : 'text-red-600 hover:text-red-700 ml-2'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className={theme === 'dark' ? 'border-t border-purple-500/20 pt-6' : 'border-t border-gray-200 pt-6'}>
              <div className="max-w-sm ml-auto space-y-2">
                <div className={theme === 'dark' ? 'flex justify-between text-slate-400' : 'flex justify-between text-gray-700'}>
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className={theme === 'dark' ? 'flex justify-between text-slate-400' : 'flex justify-between text-gray-700'}>
                  <span>GST (15%):</span>
                  <span>${gstAmount.toFixed(2)}</span>
                </div>
                <div className={theme === 'dark' ? 'flex justify-between text-xl font-bold text-white pt-2 border-t border-purple-500/20' : 'flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200'}>
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={theme === 'dark' ? 'block text-sm font-medium text-slate-400 mb-2' : 'block text-sm font-medium text-gray-700 mb-2'}>
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                
                className={theme === 'dark' ? 'w-full px-4 py-3 bg-black border-2 border-purple-500/40 rounded-lg focus:border-purple-500 text-white placeholder-slate-500 focus:outline-none' : 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900'}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className={theme === 'dark' ? 'flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50' : 'flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50'}
              >
                {saving ? 'Saving...' : 'Update Invoice'}
              </button>
              <Link
                href={`/invoices/${params.id}`}
                className={theme === 'dark' ? 'px-6 py-3 border-2 border-purple-500/40 rounded-lg hover:border-purple-500 text-slate-300 text-center' : 'px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-center'}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
