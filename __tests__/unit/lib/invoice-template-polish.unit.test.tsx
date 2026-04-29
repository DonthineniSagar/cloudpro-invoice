import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { companySchema } from '@/lib/validation';
import { hexToRgb, generateInvoicePDF, InvoiceData, TemplateName } from '@/lib/generate-pdf';
import TemplateThumbnail from '@/components/TemplateThumbnail';

// ─── jsPDF mock (same pattern as property tests) ───

const mockAddPage = jest.fn();
const mockText = jest.fn();
const mockLine = jest.fn();
const mockSetTextColor = jest.fn();
const mockSetDrawColor = jest.fn();
const mockSplitTextToSize = jest.fn((text: string) => [text]);

jest.mock('jspdf', () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    lastAutoTable: { finalY: 120 },
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    setTextColor: mockSetTextColor,
    setDrawColor: mockSetDrawColor,
    setLineWidth: jest.fn(),
    setLineDashPattern: jest.fn(),
    text: mockText,
    line: mockLine,
    addPage: mockAddPage,
    addImage: jest.fn(),
    splitTextToSize: mockSplitTextToSize,
  };
  return jest.fn(() => mockDoc);
});

jest.mock('jspdf-autotable', () => jest.fn());

// ─── Test data helper ───

function makeInvoice(overrides?: Partial<InvoiceData>): InvoiceData {
  return {
    invoiceNumber: 'INV-2401-001',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    status: 'DRAFT',
    clientName: 'Test Client',
    subtotal: 100,
    gstRate: 15,
    gstAmount: 15,
    total: 115,
    currency: 'NZD',
    lineItems: [{ description: 'Service', quantity: 1, unitPrice: 100, amount: 100 }],
    ...overrides,
  };
}


// Placeholder – test data helpers are used by the property test suite
describe('Invoice template test data', () => {
  it('makeInvoice returns valid defaults', () => {
    const inv = makeInvoice();
    expect(inv.invoiceNumber).toBe('INV-2401-001');
    expect(inv.total).toBe(115);
  });
});
