import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type InvoiceData = {
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

export type TemplateName = 'modern' | 'classic' | 'minimal';

export interface PdfOptions {
  accentColor?: string;   // hex #RRGGBB
  footerText?: string;    // up to 500 chars
}

export function hexToRgb(hex: string): [number, number, number] {
  if (!hex || hex.length !== 7 || hex[0] !== '#') return [99, 102, 241]; // fallback: primary-500
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [99, 102, 241]; // fallback: primary-500
  return [r, g, b];
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Helper: ensure y fits, else add page and return new y ───
function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

// ─── Helper: render footer text with page overflow handling ───
function renderFooterText(doc: jsPDF, y: number, footerText: string, m: number, pw: number, textColor: [number, number, number]): number {
  if (!footerText) return y;
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  const maxW = pw - m * 2;
  const lines = doc.splitTextToSize(footerText, maxW) as string[];
  const lineHeight = 4.5;
  const totalHeight = lines.length * lineHeight + 4;
  y = ensureSpace(doc, y, totalHeight, m);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(m, y, pw - m, y);
  y += 4;
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight + 2, m);
    doc.text(line, m, y);
    y += lineHeight;
  }
  return y;
}

// ─── MODERN (original) ───
function generateModern(invoice: InvoiceData, options?: PdfOptions): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 14;
  const black: [number, number, number] = [20, 20, 20];
  const grey: [number, number, number] = [90, 90, 90];
  const accentRgb: [number, number, number] = options?.accentColor ? hexToRgb(options.accentColor) : black;

  const logoSize = 32;
  if (invoice.logoDataUrl) {
    try { doc.addImage(invoice.logoDataUrl, 'PNG', pw - m - logoSize, 8, logoSize, logoSize); } catch { /* ignore logo errors */ }
  }

  doc.setFontSize(28);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...accentRgb);
  doc.text('TAX INVOICE', m, 28);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grey);
  doc.text(invoice.companyName || '', m + 2, 36);

  const midX = 95;
  let my = 20;
  const detailRow = (label: string, value: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
    doc.text(label, midX, my); my += 5;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey); doc.setFontSize(10);
    doc.text(value, midX, my); my += 7;
  };
  detailRow('Invoice Date', fmt(invoice.issueDate));
  detailRow('Invoice Number', invoice.invoiceNumber);
  if (invoice.gstNumber) detailRow('GST Number', invoice.gstNumber);

  const rightX = pw - m;
  const addrMaxW = 55;
  let ry = 44;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  for (const line of [invoice.companyName, invoice.companyAddress, invoice.companyEmail].filter(Boolean) as string[]) {
    if (line === invoice.companyName) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(line, addrMaxW) as string[];
    for (const wl of wrapped) { doc.text(wl, rightX, ry, { align: 'right' }); ry += 5; }
  }

  let y = Math.max(my, ry) + 10;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text('Bill To:', m, y); y += 6;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  for (const line of [invoice.clientName, invoice.clientEmail, invoice.clientAddress].filter(Boolean) as string[]) {
    doc.text(line, m, y); y += 5;
  }
  y += 12;

  // Reserve space for payment advice on last page (65pt)
  const paymentAdviceHeight = 65;

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Quantity', 'Unit Price', `Amount ${invoice.currency}`]],
    body: invoice.lineItems.map(item => [
      item.description + (item.wbs ? `\n${item.wbs}` : ''), item.quantity.toFixed(2), item.unitPrice.toFixed(2), item.amount.toFixed(2),
    ]),
    headStyles: { fillColor: [255, 255, 255] as [number, number, number], textColor: black, fontStyle: 'bold', fontSize: 9.5, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 } },
    bodyStyles: { fontSize: 9.5, textColor: grey, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 } },
    columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right', cellWidth: 25 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 35 } },
    margin: { left: m, right: m, bottom: m },
    theme: 'plain',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'head') { data.cell.styles.lineWidth = { bottom: 0.3, top: 0, left: 0, right: 0 }; data.cell.styles.lineColor = accentRgb; }
      if (data.section === 'body') { data.cell.styles.lineWidth = { bottom: 0.15, top: 0, left: 0, right: 0 }; data.cell.styles.lineColor = [200, 200, 200]; }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Totals
  const tLabelX = pw - 80;
  const tValX = pw - m;
  const totalRow = (label: string, value: string, bold = false, size = 10) => {
    y = ensureSpace(doc, y, 10, m);
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...(bold ? black : grey));
    doc.text(label, tLabelX, y); doc.text(value, tValX, y, { align: 'right' }); y += 7;
  };
  totalRow('Subtotal', invoice.subtotal.toFixed(2));
  totalRow(`TOTAL GST ${invoice.gstRate}%`, invoice.gstAmount.toFixed(2));
  doc.setDrawColor(...accentRgb); doc.setLineWidth(0.4); doc.line(tLabelX, y - 3, tValX, y - 3); y += 1;
  totalRow(`TOTAL ${invoice.currency}`, invoice.total.toFixed(2), true, 12);
  y += 16;

  // Due date & payment info
  y = ensureSpace(doc, y, 30, m);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black);
  doc.text(`Due Date: ${fmt(invoice.dueDate)}`, m, y); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  if (invoice.companyName) { doc.text(invoice.companyName, m, y); y += 5; }
  if (invoice.bankAccount) { doc.text(invoice.bankAccount, m, y); y += 5; }
  if (invoice.paymentTerms) { doc.text(invoice.paymentTerms, m, y); y += 5; }
  if (invoice.notes) { y += 4; const noteLines = doc.splitTextToSize(invoice.notes, pw - m * 2); doc.text(noteLines, m, y); y += noteLines.length * 5; }

  // Footer text (below notes, before payment advice)
  if (options?.footerText) {
    y = renderFooterText(doc, y, options.footerText, m, pw, grey);
  }

  // Payment advice tear-off — always at bottom of last page
  if (y > ph - paymentAdviceHeight - 10) {
    doc.addPage();
  }
  const tearY = ph - paymentAdviceHeight;
  doc.setFontSize(9); doc.setTextColor(...black); doc.text('\u2702', m - 4, tearY + 1);
  doc.setDrawColor(0); doc.setLineWidth(0.3); doc.setLineDashPattern([4, 3], 0);
  doc.line(m, tearY, pw - m, tearY); doc.setLineDashPattern([], 0);
  let py = tearY + 12;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...accentRgb); doc.text('PAYMENT ADVICE', m, py); py += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  const payToMaxW = pw / 2 - m - 10;
  if (invoice.companyName) { const nl = doc.splitTextToSize(`To: ${invoice.companyName}`, payToMaxW) as string[]; for (const l of nl) { doc.text(l, m, py); py += 5; } }
  if (invoice.companyAddress) { const al = doc.splitTextToSize(invoice.companyAddress, payToMaxW - 4) as string[]; for (const l of al) { doc.text(`  ${l}`, m, py); py += 5; } }
  const pL = pw / 2 + 5; const pV = pL + 40; const pValMaxW = pw - m - pV; let pdy = tearY + 20;
  const payRow = (label: string, value: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...black); doc.text(label, pL, pdy);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
    const wrapped = doc.splitTextToSize(value, pValMaxW) as string[];
    for (const wl of wrapped) { doc.text(wl, pV, pdy); pdy += 5; }
    if (wrapped.length === 0) pdy += 5;
  };
  payRow('Customer', invoice.clientName);
  payRow('Invoice Number', invoice.invoiceNumber);
  payRow('Amount Due', invoice.total.toFixed(2));
  payRow('Due Date', fmt(invoice.dueDate));
  payRow('Amount Enclosed', '');
  doc.setDrawColor(180); doc.setLineWidth(0.2); doc.line(pV, pdy - 5, pV + 30, pdy - 5);

  return doc;
}

// ─── CLASSIC (serif, traditional, bordered) ───
function generateClassic(invoice: InvoiceData, options?: PdfOptions): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 16;
  const black: [number, number, number] = [30, 30, 30];
  const grey: [number, number, number] = [80, 80, 80];
  const accent: [number, number, number] = options?.accentColor ? hexToRgb(options.accentColor) : [44, 62, 80]; // dark navy default

  // Top border line
  doc.setDrawColor(...accent); doc.setLineWidth(1.5); doc.line(m, 12, pw - m, 12);

  // Logo
  if (invoice.logoDataUrl) {
    try { doc.addImage(invoice.logoDataUrl, 'PNG', pw - m - 28, 18, 28, 28); } catch { /* ignore logo errors */ }
  }

  // Company name
  doc.setFontSize(20); doc.setFont('times', 'bold'); doc.setTextColor(...accent);
  doc.text(invoice.companyName || '', m, 28);

  // Company details
  doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(...grey);
  let cy = 34;
  for (const line of [invoice.companyAddress, invoice.companyEmail, invoice.gstNumber ? `GST: ${invoice.gstNumber}` : ''].filter(Boolean) as string[]) {
    doc.text(line, m, cy); cy += 4.5;
  }

  // "INVOICE" title
  doc.setFontSize(24); doc.setFont('times', 'bold'); doc.setTextColor(...accent);
  doc.text('INVOICE', pw - m, 60, { align: 'right' });

  // Invoice details
  let dy = 68;
  doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(...grey);
  const detailLine = (l: string, v: string) => {
    doc.setFont('times', 'bold'); doc.text(l, pw - m - 50, dy);
    doc.setFont('times', 'normal'); doc.text(v, pw - m, dy, { align: 'right' }); dy += 5.5;
  };
  detailLine('Number:', invoice.invoiceNumber);
  detailLine('Date:', fmt(invoice.issueDate));
  detailLine('Due:', fmt(invoice.dueDate));

  // Bill To
  let y = 68;
  doc.setFontSize(10); doc.setFont('times', 'bold'); doc.setTextColor(...accent);
  doc.text('BILL TO', m, y); y += 6;
  doc.setFontSize(9.5); doc.setFont('times', 'normal'); doc.setTextColor(...grey);
  for (const line of [invoice.clientName, invoice.clientEmail, invoice.clientAddress].filter(Boolean) as string[]) {
    doc.text(line, m, y); y += 5;
  }

  y = Math.max(y, dy) + 10;

  // Table with borders
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: invoice.lineItems.map(item => [
      item.description + (item.wbs ? ` (${item.wbs})` : ''), item.quantity.toFixed(2), item.unitPrice.toFixed(2), item.amount.toFixed(2),
    ]),
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, font: 'times' },
    bodyStyles: { fontSize: 9, textColor: grey, font: 'times' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 30 } },
    margin: { left: m, right: m, bottom: m },
    theme: 'grid',
    styles: { lineColor: [200, 200, 200], lineWidth: 0.3 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const tR = pw - m;
  const tL = pw - 80;

  const row = (label: string, val: string, bold = false) => {
    y = ensureSpace(doc, y, 10, m);
    doc.setFontSize(10); doc.setFont('times', bold ? 'bold' : 'normal'); doc.setTextColor(...(bold ? accent : grey));
    doc.text(label, tL, y); doc.text(val, tR, y, { align: 'right' }); y += 6;
  };
  row('Subtotal:', `$${invoice.subtotal.toFixed(2)}`);
  row(`GST (${invoice.gstRate}%):`, `$${invoice.gstAmount.toFixed(2)}`);
  doc.setDrawColor(...accent); doc.setLineWidth(0.5); doc.line(tL, y - 2, tR, y - 2); y += 2;
  row(`Total ${invoice.currency}:`, `$${invoice.total.toFixed(2)}`, true);

  y += 12;
  y = ensureSpace(doc, y, 20, m);
  doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(...grey);
  if (invoice.bankAccount) { doc.text(`Bank Account: ${invoice.bankAccount}`, m, y); y += 5; }
  if (invoice.paymentTerms) { doc.text(invoice.paymentTerms, m, y); y += 5; }
  if (invoice.notes) { y += 3; const nl = doc.splitTextToSize(invoice.notes, pw - m * 2); doc.text(nl, m, y); y += nl.length * 5; }

  // Footer text
  if (options?.footerText) {
    y = renderFooterText(doc, y, options.footerText, m, pw, grey);
  }

  // Bottom border on last page
  doc.setDrawColor(...accent); doc.setLineWidth(1.5);
  doc.line(m, doc.internal.pageSize.getHeight() - 12, pw - m, doc.internal.pageSize.getHeight() - 12);

  return doc;
}

// ─── MINIMAL (clean, no borders, lots of whitespace) ───
function generateMinimal(invoice: InvoiceData, options?: PdfOptions): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 20;
  const black: [number, number, number] = [30, 30, 30];
  const grey: [number, number, number] = [120, 120, 120];
  const light: [number, number, number] = [180, 180, 180];
  const accentRgb: [number, number, number] = options?.accentColor ? hexToRgb(options.accentColor) : black;

  // Logo
  if (invoice.logoDataUrl) {
    try { doc.addImage(invoice.logoDataUrl, 'PNG', m, 16, 24, 24); } catch { /* ignore logo errors */ }
  }

  // Invoice number top-right
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  doc.text(invoice.invoiceNumber, pw - m, 24, { align: 'right' });
  doc.text(fmt(invoice.issueDate), pw - m, 30, { align: 'right' });

  // Company name
  let y = 52;
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  for (const line of [invoice.companyName, invoice.companyAddress, invoice.companyEmail].filter(Boolean) as string[]) {
    doc.text(line, m, y); y += 5;
  }
  if (invoice.gstNumber) { doc.text(`GST ${invoice.gstNumber}`, m, y); y += 5; }

  // Billed to
  y += 8;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...accentRgb);
  doc.text('BILLED TO', m, y); y += 6;
  doc.setFontSize(10); doc.setTextColor(...black);
  for (const line of [invoice.clientName, invoice.clientEmail, invoice.clientAddress].filter(Boolean) as string[]) {
    doc.text(line, m, y); y += 5;
  }

  y += 12;

  // Minimal table — no grid, just header underline
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Price', 'Amount']],
    body: invoice.lineItems.map(item => [
      item.description + (item.wbs ? `  ·  ${item.wbs}` : ''), String(item.quantity), `$${item.unitPrice.toFixed(2)}`, `$${item.amount.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [255, 255, 255] as [number, number, number], textColor: light, fontStyle: 'normal', fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 } },
    bodyStyles: { fontSize: 9.5, textColor: black, cellPadding: { top: 6, bottom: 6, left: 0, right: 0 } },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 30 } },
    margin: { left: m, right: m, bottom: m },
    theme: 'plain',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: any) => {
      if (data.section === 'head') { data.cell.styles.lineWidth = { bottom: 0.2, top: 0, left: 0, right: 0 }; data.cell.styles.lineColor = [200, 200, 200]; }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  const tR = pw - m;

  // Totals — right-aligned, minimal
  y = ensureSpace(doc, y, 30, m);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  doc.text('Subtotal', tR - 50, y); doc.text(`$${invoice.subtotal.toFixed(2)}`, tR, y, { align: 'right' }); y += 6;
  doc.text(`GST ${invoice.gstRate}%`, tR - 50, y); doc.text(`$${invoice.gstAmount.toFixed(2)}`, tR, y, { align: 'right' }); y += 8;

  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...accentRgb);
  doc.text('Total', tR - 50, y); doc.text(`$${invoice.total.toFixed(2)} ${invoice.currency}`, tR, y, { align: 'right' }); y += 6;

  // Due date
  y += 8;
  y = ensureSpace(doc, y, 20, m);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...grey);
  doc.text(`Due ${fmt(invoice.dueDate)}`, tR, y, { align: 'right' });

  // Payment info at bottom
  y += 16;
  y = ensureSpace(doc, y, 20, m);
  doc.setDrawColor(...light); doc.setLineWidth(0.2); doc.line(m, y, pw - m, y); y += 8;
  doc.setFontSize(8); doc.setTextColor(...light);
  const payParts = [invoice.bankAccount, invoice.paymentTerms].filter(Boolean);
  if (payParts.length) doc.text(payParts.join('  ·  '), m, y);
  if (invoice.notes) { y += 8; doc.setTextColor(...grey); const nl = doc.splitTextToSize(invoice.notes, pw - m * 2); doc.text(nl, m, y); y += nl.length * 5; }

  // Footer text
  if (options?.footerText) {
    y = renderFooterText(doc, y, options.footerText, m, pw, grey);
  }

  return doc;
}

// ─── Public API ───
export function generateInvoicePDF(invoice: InvoiceData, template: TemplateName = 'modern', options?: PdfOptions): jsPDF {
  switch (template) {
    case 'classic': return generateClassic(invoice, options);
    case 'minimal': return generateMinimal(invoice, options);
    default: return generateModern(invoice, options);
  }
}

export const TEMPLATES: { id: TemplateName; name: string; description: string }[] = [
  { id: 'modern', name: 'Modern', description: 'Clean layout with payment advice tear-off' },
  { id: 'classic', name: 'Classic', description: 'Traditional serif fonts with bordered table' },
  { id: 'minimal', name: 'Minimal', description: 'Whitespace-focused, no borders' },
];
