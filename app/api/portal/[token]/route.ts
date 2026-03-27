/**
 * Portal API Route — public endpoint for client invoice viewing.
 * Uses API key auth to query DynamoDB without user authentication.
 * Returns only safe fields (no internal IDs or owner info).
 */import { NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const client = generateClient<Schema>({ authMode: 'apiKey' });
    const { data: invoices } = await client.models.Invoice.list({
      filter: { portalToken: { eq: params.token } },
    });

    if (!invoices?.length) {
      return NextResponse.json({ error: 'Invoice not found or link expired' }, { status: 404 });
    }

    const invoice = invoices[0];
    const { data: items } = await client.models.InvoiceItem.list({
      filter: { invoiceId: { eq: invoice.id } },
    });

    // Return only safe fields — no internal IDs or owner info
    return NextResponse.json({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      companyName: invoice.companyName,
      companyEmail: invoice.companyEmail,
      companyAddress: invoice.companyAddress,
      gstNumber: invoice.gstNumber,
      bankAccount: invoice.bankAccount,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      clientAddress: invoice.clientAddress,
      subtotal: invoice.subtotal,
      gstRate: invoice.gstRate,
      gstAmount: invoice.gstAmount,
      total: invoice.total,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms,
      notes: invoice.notes,
      pdfUrl: invoice.pdfUrl,
      lineItems: (items || []).map(i => ({
        description: i.description,
        wbs: i.wbs,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
    });
  } catch (error) {
    console.error('Portal API error:', error);
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 });
  }
}
