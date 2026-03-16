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

const fmt = (d: string) => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const black: [number, number, number] = [20, 20, 20];
  const grey: [number, number, number] = [90, 90, 90];

  // ── Logo (top-right) ──
  const logoSize = 32;
  if (invoice.logoDataUrl) {
    try { doc.addImage(invoice.logoDataUrl, 'PNG', pw - m - logoSize, 8, logoSize, logoSize); } catch {}
  }

  // ── TAX INVOICE (top-left) ──
  doc.setFontSize(28);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...black);
  doc.text('TAX INVOICE', m, 28);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grey);
  doc.text(invoice.companyName || '', m + 2, 36);

  // ── Invoice details (middle column — label above value) ──
  const midX = 95;
  let my = 20;
  const detailRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(label, midX, my);
    my += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    doc.setFontSize(10);
    doc.text(value, midX, my);
    my += 7;
  };

  detailRow('Invoice Date', fmt(invoice.issueDate));
  detailRow('Invoice Number', invoice.invoiceNumber);
  if (invoice.gstNumber) detailRow('GST Number', invoice.gstNumber);

  // ── Company address (right column, below logo) ──
  const rightX = pw - m;
  const addrMaxW = 55;
  let ry = 44;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  for (const line of [invoice.companyName, invoice.companyAddress, invoice.companyEmail].filter(Boolean) as string[]) {
    if (line === invoice.companyName) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(line, addrMaxW) as string[];
    for (const wl of wrapped) {
      doc.text(wl, rightX, ry, { align: 'right' });
      ry += 5;
    }
  }

  // ── Bill To ──
  let y = Math.max(my, ry) + 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('Bill To:', m, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  for (const line of [invoice.clientName, invoice.clientEmail, invoice.clientAddress].filter(Boolean) as string[]) {
    doc.text(line, m, y);
    y += 5;
  }

  y += 12;

  // ── Line items table ──
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Quantity', 'Unit Price', `Amount ${invoice.currency}`]],
    body: invoice.lineItems.map(item => [
      item.description + (item.wbs ? `\n${item.wbs}` : ''),
      item.quantity.toFixed(2),
      item.unitPrice.toFixed(2),
      item.amount.toFixed(2),
    ]),
    headStyles: {
      fillColor: false as unknown as number[],
      textColor: black,
      fontStyle: 'bold',
      fontSize: 9.5,
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: grey,
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: m, right: m },
    theme: 'plain',
    didParseCell: (data: { section: string; cell: { styles: Record<string, unknown> } }) => {
      if (data.section === 'head') {
        data.cell.styles.lineWidth = { bottom: 0.3, top: 0, left: 0, right: 0 };
        data.cell.styles.lineColor = [0, 0, 0];
      }
      if (data.section === 'body') {
        data.cell.styles.lineWidth = { bottom: 0.15, top: 0, left: 0, right: 0 };
        data.cell.styles.lineColor = [200, 200, 200];
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ── Totals ──
  const tLabelX = pw - 80;
  const tValX = pw - m;

  const totalRow = (label: string, value: string, bold = false, size = 10) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(bold ? black : grey));
    doc.text(label, tLabelX, y);
    doc.text(value, tValX, y, { align: 'right' });
    y += 7;
  };

  totalRow('Subtotal', invoice.subtotal.toFixed(2));
  totalRow(`TOTAL GST ${invoice.gstRate}%`, invoice.gstAmount.toFixed(2));

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(tLabelX, y - 3, tValX, y - 3);
  y += 1;

  totalRow(`TOTAL ${invoice.currency}`, invoice.total.toFixed(2), true, 12);

  y += 16;

  // ── Due Date & Payment Details ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(`Due Date: ${fmt(invoice.dueDate)}`, m, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  if (invoice.companyName) { doc.text(invoice.companyName, m, y); y += 5; }
  if (invoice.bankAccount) { doc.text(invoice.bankAccount, m, y); y += 5; }
  if (invoice.paymentTerms) { doc.text(invoice.paymentTerms, m, y); y += 5; }

  if (invoice.notes) {
    y += 4;
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(invoice.notes, pw - m * 2);
    doc.text(noteLines, m, y);
  }

  // ── Payment Advice tear-off ──
  const tearY = ph - 55;

  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.text('\u2702', m - 4, tearY + 1);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([4, 3], 0);
  doc.line(m, tearY, pw - m, tearY);
  doc.setLineDashPattern([], 0);

  let py = tearY + 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('PAYMENT ADVICE', m, py);

  py += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  const payToMaxW = pw / 2 - m - 10;
  if (invoice.companyName) {
    const nameLines = doc.splitTextToSize(`To: ${invoice.companyName}`, payToMaxW) as string[];
    for (const nl of nameLines) { doc.text(nl, m, py); py += 5; }
  }
  if (invoice.companyAddress) {
    const addrLines = doc.splitTextToSize(invoice.companyAddress, payToMaxW - 4) as string[];
    for (const al of addrLines) { doc.text(`  ${al}`, m, py); py += 5; }
  }

  // Right side of tear-off
  const pL = pw / 2 + 5;
  const pV = pL + 40;
  const pValMaxW = pw - m - pV;
  let pdy = tearY + 20;
  const payRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(label, pL, pdy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grey);
    const wrapped = doc.splitTextToSize(value, pValMaxW) as string[];
    for (const wl of wrapped) { doc.text(wl, pV, pdy); pdy += 5; }
    if (wrapped.length === 0) pdy += 5;
  };

  payRow('Customer', invoice.clientName);
  payRow('Invoice Number', invoice.invoiceNumber);
  payRow('Amount Due', invoice.total.toFixed(2));
  payRow('Due Date', fmt(invoice.dueDate));
  payRow('Amount Enclosed', '');

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(pV, pdy - 5, pV + 30, pdy - 5);

  return doc;
}
