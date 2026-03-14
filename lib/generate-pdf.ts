import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type InvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  gstNumber?: string;
  bankAccount?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  logoDataUrl?: string;
  lineItems: { description: string; wbs?: string; quantity: number; unitPrice: number; amount: number }[];
};

export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Company logo (top-right)
  if (invoice.logoDataUrl) {
    try {
      doc.addImage(invoice.logoDataUrl, 'PNG', pageWidth - 44, 10, 30, 30);
    } catch {}
  }

  // Header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241); // indigo
  doc.text('INVOICE', 14, y);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, 14, y + 8);

  y += 20;

  // From section (full width)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('FROM:', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  const fromLines = [
    invoice.companyName,
    invoice.companyEmail,
    invoice.companyPhone,
    invoice.companyAddress,
    invoice.gstNumber ? `GST: ${invoice.gstNumber}` : '',
  ].filter(Boolean) as string[];

  for (const line of fromLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  y += 6;

  // Bill To section (below From)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('BILL TO:', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  const toLines = [
    invoice.clientName,
    invoice.clientEmail,
    invoice.clientAddress,
  ].filter(Boolean) as string[];

  for (const line of toLines) {
    doc.text(line, 14, y);
    y += 5;
  }

  y += 8;

  // Dates row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50);
  doc.text('Issue Date:', 14, y);
  doc.text('Due Date:', 80, y);
  doc.text('Currency:', 146, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(new Date(invoice.issueDate).toLocaleDateString(), 14, y);
  doc.text(new Date(invoice.dueDate).toLocaleDateString(), 80, y);
  doc.text(invoice.currency, 146, y);

  y += 10;

  // Line items table
  autoTable(doc, {
    startY: y,
    head: [['Description', 'WBS', 'Qty', 'Rate', 'Amount']],
    body: invoice.lineItems.map(item => [
      item.description,
      item.wbs || '-',
      item.quantity.toString(),
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 65 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pageWidth - 80;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Subtotal:', totalsX, y);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
  y += 6;
  doc.text(`GST (${invoice.gstRate}%):`, totalsX, y);
  doc.text(`$${invoice.gstAmount.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(99, 102, 241);
  doc.line(totalsX, y, pageWidth - 14, y);
  y += 6;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Total:', totalsX, y);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - 14, y, { align: 'right' });

  y += 14;

  // Payment details
  if (invoice.bankAccount) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    doc.text('Payment Details', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(`Bank Account: ${invoice.bankAccount}`, 14, y);
    y += 5;
    if (invoice.paymentTerms) {
      doc.text(invoice.paymentTerms, 14, y);
      y += 5;
    }
    y += 5;
  }

  // Notes
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    doc.text('Notes', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
  }

  return doc;
}
