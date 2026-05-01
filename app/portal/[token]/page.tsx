/**
 * Client Portal Page — public invoice view accessible via unique token URL.
 * No authentication required. Shows invoice details, line items, totals,
 * and payment status (Due/Paid/Overdue) in a clean read-only layout.
 */'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

type InvoiceData = {
  invoiceNumber: string; issueDate: string; dueDate: string; status: string;
  companyName: string; companyEmail: string; companyAddress: string;
  gstNumber: string; bankAccount: string;
  clientName: string; clientEmail: string; clientAddress: string;
  subtotal: number; gstRate: number; gstAmount: number; total: number;
  currency: string; paymentTerms: string; notes: string; pdfUrl: string;
  lineItems: { description: string; wbs?: string; quantity: number; unitPrice: number; amount: number }[];
};

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  PAID: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Paid' },
  SENT: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Due' },
  DRAFT: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Due' },
  OVERDUE: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Overdue' },
  CANCELLED: { icon: FileText, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', label: 'Cancelled' },
};

export default function PortalPage({ params }: { params: { token: string } }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/${params.token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error)))
      .then(setInvoice)
      .catch(e => setError(typeof e === 'string' ? e : 'Invoice not found'))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-500">{error || 'This link may have expired or is invalid.'}</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">{invoice.companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${status.bg} ${status.color}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </div>
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Invoice Card */}
        <div className="bg-white rounded-xl border-2 border-indigo-600 overflow-hidden">
          {/* Top section */}
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Invoice {invoice.invoiceNumber}</h1>
                <p className="text-sm text-gray-500">Issued {fmt(invoice.issueDate)}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">${invoice.total.toFixed(2)}</div>
                <div className="text-sm text-gray-500">{invoice.currency}</div>
              </div>
            </div>

            {/* From / To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">From</div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{invoice.companyName}</p>
                  {invoice.companyAddress && <p>{invoice.companyAddress}</p>}
                  {invoice.companyEmail && <p>{invoice.companyEmail}</p>}
                  {invoice.gstNumber && <p className="mt-1 text-gray-500">GST: {invoice.gstNumber}</p>}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">Billed To</div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium">{invoice.clientName}</p>
                  {invoice.clientAddress && <p>{invoice.clientAddress}</p>}
                  {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-6">
              <caption className="sr-only">Invoice line items</caption>
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-medium text-gray-400 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-400 uppercase">Qty</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-400 uppercase">Price</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-900">
                      {item.description}
                      {item.wbs && <span className="text-gray-400 ml-2">({item.wbs})</span>}
                    </td>
                    <td className="py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-sm font-medium text-gray-900 text-right">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST ({invoice.gstRate}%)</span><span>${invoice.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t-2 border-gray-200">
                  <span>Total</span><span>${invoice.total.toFixed(2)} {invoice.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment info footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm">
                <span className="text-gray-500">Due: </span>
                <span className="font-medium text-gray-900">{fmt(invoice.dueDate)}</span>
                {invoice.bankAccount && (
                  <span className="text-gray-400 ml-4">Bank: {invoice.bankAccount}</span>
                )}
              </div>
            </div>
            {invoice.paymentTerms && (
              <p className="text-xs text-gray-400 mt-2">{invoice.paymentTerms}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-indigo-600">
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Powered by MyBiz
        </div>
      </div>
    </div>
  );
}
