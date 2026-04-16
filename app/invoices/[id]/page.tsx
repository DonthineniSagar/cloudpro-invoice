'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Send, Check, X, Edit2, Loader2, FileCheck, Plus, Trash2, Link2, Bell } from 'lucide-react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/lib/theme-context';
import { tc } from '@/lib/theme-classes';
import { generateInvoicePDF, TEMPLATES } from '@/lib/generate-pdf';
import type { TemplateName } from '@/lib/generate-pdf';
import { useToast } from '@/lib/toast-context';
import { createNotification } from '@/lib/notifications';

type EmailForm = {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  replyTo: string;
};

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { theme } = useTheme();
  const s = tc(theme);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailForm>({ to: [''], cc: [], subject: '', body: '', replyTo: '' });
  const [template, setTemplate] = useState<TemplateName>('modern');

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    try {
      const client = generateClient<Schema>();
      const { data: invoiceData } = await client.models.Invoice.get({ id: params.id });
      setInvoice(invoiceData);

      if (invoiceData) {
        const { data: items } = await client.models.InvoiceItem.list({
          filter: { invoiceId: { eq: params.id } }
        });
        setLineItems(items);

        // Load default template from company profile
        try {
          const { data: profiles } = await client.models.CompanyProfile.list();
          if (profiles?.[0]?.defaultTemplate) setTemplate(profiles[0].defaultTemplate as TemplateName);
        } catch {}
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const client = generateClient<Schema>();
      await client.models.Invoice.update({
        id: params.id,
        status: status as any
      });
      setInvoice({ ...invoice, status });
      if (status === 'PAID') {
        createNotification('INVOICE_PAID', `Invoice ${invoice.invoiceNumber} paid`, `${invoice.clientName} — $${invoice.total?.toFixed(2)}`, invoice.userId, `/invoices/${params.id}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const buildPdfDoc = async () => {
    let logoDataUrl: string | undefined;
    let accentColor: string | undefined;
    let footerText: string | undefined;
    try {
      const client = generateClient<Schema>();
      const { data: profiles } = await client.models.CompanyProfile.list();
      if (profiles?.[0]?.logoUrl) {
        const { url } = await getUrl({ path: profiles[0].logoUrl });
        const resp = await fetch(url.toString());
        const blob = await resp.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      // Load default template if not already changed
      if (profiles?.[0]?.defaultTemplate) {
        setTemplate(prev => prev || (profiles[0].defaultTemplate as TemplateName) || 'modern');
      }
      accentColor = profiles?.[0]?.accentColor || undefined;
      footerText = profiles?.[0]?.invoiceFooterText || undefined;
    } catch (error) {
      console.error('Failed to load company profile:', error);
    }
    if (!accentColor) accentColor = '#6366F1';
    return generateInvoicePDF({
      ...invoice, logoDataUrl,
      lineItems: lineItems.map(i => ({
        description: i.description, wbs: i.wbs,
        quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount,
      })),
    }, template, { accentColor, footerText });
  };

  const canEmail = invoice && ['DRAFT', 'OVERDUE'].includes(invoice?.status) && invoice.pdfUrl;
  const canRemind = invoice && ['SENT', 'OVERDUE'].includes(invoice?.status) && invoice.pdfUrl && invoice.clientEmail;

  const handleSendReminder = async () => {
    if (!invoice?.clientEmail) { toast.error('Client has no email'); return; }
    setSending(true);
    try {
      const client = generateClient<Schema>();
      const { data: profiles } = await client.models.CompanyProfile.list();
      const profile = profiles?.[0];

      const fmtDate = new Date(invoice.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
      const fmtTotal = `${invoice.currency || 'NZD'} ${invoice.total?.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`;
      const tokens: Record<string, string> = {
        '{invoiceNumber}': invoice.invoiceNumber, '{companyName}': invoice.companyName || '',
        '{clientName}': invoice.clientName, '{total}': fmtTotal, '{dueDate}': fmtDate,
      };
      const replace = (tpl: string) => Object.entries(tokens).reduce((s, [k, v]) => s.replaceAll(k, v), tpl);

      const subject = replace(profile?.reminderSubjectTemplate || 'Reminder: Invoice {invoiceNumber} from {companyName}');
      const body = replace(profile?.reminderBodyTemplate || 'This is a friendly reminder that invoice {invoiceNumber} for {total} is due on {dueDate}.');

      const doc = await buildPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      await client.mutations.sendInvoiceEmail({
        to: invoice.clientEmail, subject, body, pdfBase64,
        fileName: `${invoice.invoiceNumber}.pdf`,
        replyTo: profile?.emailReplyTo || profile?.companyEmail || undefined,
        fromName: profile?.companyName || undefined,
      });

      const now = new Date().toISOString();
      await client.models.Invoice.update({
        id: params.id, lastReminderSent: now,
        reminderCount: (invoice.reminderCount || 0) + 1,
      });
      setInvoice({ ...invoice, lastReminderSent: now, reminderCount: (invoice.reminderCount || 0) + 1 });
      toast.success(`Reminder sent to ${invoice.clientEmail}`);
      createNotification('REMINDER_SENT', `Reminder sent for ${invoice.invoiceNumber}`, `Sent to ${invoice.clientEmail}`, invoice.userId, `/invoices/${params.id}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSending(false);
    }
  };

  const handleCopyPortalLink = async () => {
    try {
      const client = generateClient<Schema>();
      let token = invoice.portalToken;
      if (!token) {
        token = crypto.randomUUID();
        await client.models.Invoice.update({ id: params.id, portalToken: token });
        setInvoice({ ...invoice, portalToken: token });
      }
      const url = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Portal link copied to clipboard');
    } catch {
      toast.error('Failed to generate portal link');
    }
  };

  const openEmailDialog = async () => {
    if (!invoice?.clientEmail) { toast.error('Client has no email address'); return; }
    try {
      const client = generateClient<Schema>();
      const { data: profiles } = await client.models.CompanyProfile.list();
      const profile = profiles?.[0];
      const companyEmail = profile?.companyEmail || '';

      const fmtDate = new Date(invoice.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
      const fmtTotal = `${invoice.currency || 'NZD'} ${invoice.total?.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}`;

      const tokens: Record<string, string> = {
        '{invoiceNumber}': invoice.invoiceNumber,
        '{companyName}': invoice.companyName || '',
        '{clientName}': invoice.clientName,
        '{total}': fmtTotal,
        '{dueDate}': fmtDate,
      };
      const replaceTokens = (tpl: string) =>
        Object.entries(tokens).reduce((s, [k, v]) => s.replaceAll(k, v), tpl);

      const defaultBody = `Hi {clientName},\n\nHere's invoice {invoiceNumber} for {total}.\n\nThe amount outstanding of {total} is due on {dueDate}.\n\nIf you have any questions, please let us know.\n\nThanks,\n{companyName}`;

      setEmailForm({
        to: [invoice.clientEmail],
        cc: profile?.emailCcSelf && companyEmail ? [companyEmail] : [],
        replyTo: profile?.emailReplyTo || companyEmail || '',
        subject: replaceTokens(profile?.emailSubjectTemplate || 'Invoice {invoiceNumber} from {companyName}'),
        body: replaceTokens(profile?.emailBodyTemplate || defaultBody),
      });
      setShowEmailDialog(true);
    } catch {
      toast.error('Failed to load email preferences');
    }
  };

  const handleSendEmail = async () => {
    const validTo = emailForm.to.filter(e => e.trim());
    if (!validTo.length) { toast.error('At least one recipient is required'); return; }
    setSending(true);
    try {
      const client = generateClient<Schema>();
      const doc = await buildPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      await client.mutations.sendInvoiceEmail({
        to: validTo.join(','),
        cc: emailForm.cc.filter(e => e.trim()).join(',') || undefined,
        replyTo: emailForm.replyTo || undefined,
        subject: emailForm.subject,
        body: emailForm.body,
        pdfBase64,
        fileName: `${invoice.invoiceNumber}.pdf`,
        fromName: invoice.companyName || undefined,
      });

      await client.models.Invoice.update({ id: params.id, status: 'SENT' as any });
      setInvoice({ ...invoice, status: 'SENT' });
      setShowEmailDialog(false);
      toast.success(`Invoice emailed to ${validTo.join(', ')}`);
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice email');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    setGeneratingPdf(true);
    try {
      const doc = await buildPdfDoc();

      // Upload to S3 (owner-scoped via entity_id)
      const pdfBlob = doc.output('blob');
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const result = await uploadData({
        path: ({identityId}) => `invoices/${identityId}/${fileName}`,
        data: pdfBlob,
        options: { contentType: 'application/pdf' },
      }).result;

      // Save resolved S3 path to invoice record
      const client = generateClient<Schema>();
      await client.models.Invoice.update({ id: params.id, pdfUrl: result.path });
      setInvoice({ ...invoice, pdfUrl: result.path });

      // Also trigger browser download
      doc.save(fileName);
      toast.success('PDF saved and stored');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
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

  if (!invoice) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>Invoice not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
          <Link
            href={`/invoices/${params.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Edit2 className="w-4 h-4" />
            Edit Invoice
          </Link>
          )}
          {canEmail && (
          <button
            onClick={openEmailDialog}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
            Email Invoice
          </button>
          )}
          {canRemind && (
          <button
            onClick={handleSendReminder}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Send Reminder{invoice.reminderCount ? ` (${invoice.reminderCount})` : ''}
          </button>
          )}
          <button
            onClick={() => updateStatus('PAID')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Check className="w-4 h-4" />
            Mark as Paid
          </button>
          {invoice.status === 'DRAFT' && (
          <button
            onClick={() => updateStatus('SENT')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Send className="w-4 h-4" />
            Mark as Sent
          </button>
          )}
          <button
            onClick={handleCopyPortalLink}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Link2 className="w-4 h-4" />
            {invoice.portalToken ? 'Copy Portal Link' : 'Create Portal Link'}
          </button>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateName)}
            disabled={!!invoice.pdfUrl}
            className={`px-3 py-2 rounded-lg text-sm ${invoice.pdfUrl ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'bg-black border-2 border-purple-500/40 text-white' : 'border border-gray-300 text-gray-700'}`}
          >
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name} Template</option>)}
          </select>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : invoice.pdfUrl ? <FileCheck className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {generatingPdf ? 'Generating...' : invoice.pdfUrl ? 'Download PDF' : 'Generate & Save PDF'}
          </button>
        </div>

        {/* Invoice */}
        <div className={theme === 'dark' ? 'bg-black rounded-xl border-2 border-purple-500/40 p-8' : 'bg-white rounded-xl shadow-sm border border-gray-200 p-8'}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className={theme === 'dark' ? 'text-3xl font-bold text-white mb-2' : 'text-3xl font-bold text-gray-900 mb-2'}>INVOICE</h1>
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Status</div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Company & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>From:</h3>
              <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                <p className="font-medium">{invoice.companyName}</p>
                {invoice.companyEmail && <p>{invoice.companyEmail}</p>}
                {invoice.companyPhone && <p>{invoice.companyPhone}</p>}
                {invoice.companyAddress && <p className="mt-1">{invoice.companyAddress}</p>}
                {invoice.gstNumber && <p className="mt-2">GST: {invoice.gstNumber}</p>}
              </div>
            </div>
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Bill To:</h3>
              <div className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                <p className="font-medium">{invoice.clientName}</p>
                {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
                {invoice.clientAddress && <p className="mt-1">{invoice.clientAddress}</p>}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Issue Date</div>
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {new Date(invoice.issueDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Due Date</div>
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Currency</div>
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{invoice.currency}</div>
            </div>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto mb-8">
          <table className="w-full min-w-[500px]">
            <thead className={theme === 'dark' ? 'border-b-2 border-purple-500/40' : 'border-b-2 border-gray-300'}>
              <tr>
                <th className={`text-left py-3 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Description</th>
                <th className={`text-left py-3 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>WBS</th>
                <th className={`text-right py-3 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Qty</th>
                <th className={`text-right py-3 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Rate</th>
                <th className={`text-right py-3 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className={theme === 'dark' ? 'border-b border-purple-500/20' : 'border-b border-gray-200'}>
                  <td className={`py-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{item.description}</td>
                  <td className={`py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{item.wbs || '-'}</td>
                  <td className={`py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{item.quantity}</td>
                  <td className={`py-3 text-sm text-right ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>${item.unitPrice.toFixed(2)}</td>
                  <td className={`py-3 text-sm text-right font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className={`flex justify-between text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                <span>Subtotal:</span>
                <span>${invoice.subtotal?.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                <span>GST ({invoice.gstRate}%):</span>
                <span>${invoice.gstAmount?.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-lg font-bold pt-2 ${theme === 'dark' ? 'text-white border-t-2 border-purple-500/40' : 'text-gray-900 border-t-2 border-gray-300'}`}>
                <span>Total:</span>
                <span>${invoice.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {invoice.bankAccount && (
            <div className={theme === 'dark' ? 'bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg mb-8' : 'bg-gray-50 p-4 rounded-lg mb-8'}>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Payment Details</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Bank Account: {invoice.bankAccount}</p>
              {invoice.paymentTerms && (
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{invoice.paymentTerms}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Notes</h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-900 border-2 border-purple-500/40' : 'bg-white shadow-xl border border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={theme === 'dark' ? 'text-lg font-bold text-white' : 'text-lg font-bold text-gray-900'}>Send Invoice</h2>
              <button onClick={() => setShowEmailDialog(false)} className={theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* From (read-only) */}
              <div>
                <label className={s.label}>From (set by server)</label>
                <div className={`px-4 py-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-800 text-slate-400 border border-purple-500/20' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                  Configured in server settings
                </div>
              </div>

              {/* To */}
              <div>
                <label className={s.label}>To</label>
                {emailForm.to.map((email, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { const to = [...emailForm.to]; to[i] = e.target.value; setEmailForm({ ...emailForm, to }); }}
                      className={s.input}
                    />
                    {emailForm.to.length > 1 && (
                      <button onClick={() => setEmailForm({ ...emailForm, to: emailForm.to.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 px-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEmailForm({ ...emailForm, to: [...emailForm.to, ''] })} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add recipient
                </button>
              </div>

              {/* CC */}
              <div>
                <label className={s.label}>CC</label>
                {emailForm.cc.map((email, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { const cc = [...emailForm.cc]; cc[i] = e.target.value; setEmailForm({ ...emailForm, cc }); }}
                      className={s.input}
                    />
                    <button onClick={() => setEmailForm({ ...emailForm, cc: emailForm.cc.filter((_, j) => j !== i) })} className="text-red-500 hover:text-red-700 px-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setEmailForm({ ...emailForm, cc: [...emailForm.cc, ''] })} className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add CC
                </button>
              </div>

              {/* Reply-To */}
              <div>
                <label className={s.label}>Reply-To</label>
                <input
                  type="email"
                  value={emailForm.replyTo}
                  onChange={(e) => setEmailForm({ ...emailForm, replyTo: e.target.value })}
                  className={s.input}
                />
              </div>

              {/* Subject */}
              <div>
                <label className={s.label}>Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className={s.input}
                />
              </div>

              {/* Body */}
              <div>
                <label className={s.label}>Message</label>
                <textarea
                  rows={5}
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                PDF of {invoice.invoiceNumber} will be attached automatically.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendEmail}
                  disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
                <button
                  onClick={() => setShowEmailDialog(false)}
                  className={s.btnSecondary}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
