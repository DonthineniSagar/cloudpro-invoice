import * as fc from 'fast-check';
import { companySchema } from '@/lib/validation';
import { hexToRgb, generateInvoicePDF, TemplateName, InvoiceData } from '@/lib/generate-pdf';

// Mock jsPDF and jspdf-autotable since they require canvas
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
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    setLineWidth: jest.fn(),
    setLineDashPattern: jest.fn(),
    text: jest.fn(),
    line: jest.fn(),
    addPage: jest.fn(),
    addImage: jest.fn(),
    splitTextToSize: jest.fn((text: string) => [text]),
  };
  return jest.fn(() => mockDoc);
});

jest.mock('jspdf-autotable', () => jest.fn());

// ─── Helpers ───

/** Arbitrary that generates valid #RRGGBB hex color strings from RGB tuples */
const validHexColor = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([r, g, b]) => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  // Randomly use upper or lower case hex digits
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
});

/** Arbitrary that generates strings which are NOT valid hex colors */
const invalidHexColor = fc.string({ minLength: 0, maxLength: 20 }).filter(s => !/^#[0-9A-Fa-f]{6}$/.test(s) && s !== '');

/** Minimal valid InvoiceData for PDF generation tests */
function makeInvoiceData(overrides?: Partial<InvoiceData>): InvoiceData {
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

// ─── Property 1: Hex color validation ───

describe('Feature: invoice-template-polish, Property 1: Hex color validation accepts valid and rejects invalid', () => {
  /**
   * Validates: Requirements 2.6, 6.3
   *
   * For any string, the Zod accentColor validator should accept it iff
   * it matches the pattern #[0-9A-Fa-f]{6}.
   */

  it('should accept all valid hex color strings', () => {
    fc.assert(
      fc.property(validHexColor, (hex) => {
        const result = companySchema.safeParse({ companyName: 'Test', accentColor: hex });
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('should reject all invalid hex color strings', () => {
    fc.assert(
      fc.property(invalidHexColor, (str) => {
        const result = companySchema.safeParse({ companyName: 'Test', accentColor: str });
        expect(result.success).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('should accept empty string (optional field allows empty)', () => {
    const result = companySchema.safeParse({ companyName: 'Test', accentColor: '' });
    expect(result.success).toBe(true);
  });

  it('should accept undefined (optional field)', () => {
    const result = companySchema.safeParse({ companyName: 'Test' });
    expect(result.success).toBe(true);
  });
});


// ─── Property 2: Footer text length validation ───

describe('Feature: invoice-template-polish, Property 2: Footer text length validation', () => {
  /**
   * Validates: Requirements 3.3, 6.4
   *
   * For any string, the Zod invoiceFooterText validator should accept it
   * iff its length is ≤ 500 characters.
   */

  it('should accept strings with length ≤ 500', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (text) => {
        const result = companySchema.safeParse({ companyName: 'Test', invoiceFooterText: text });
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('should reject strings with length > 500', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 501, maxLength: 1000 }), (text) => {
        const result = companySchema.safeParse({ companyName: 'Test', invoiceFooterText: text });
        expect(result.success).toBe(false);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 3: hexToRgb round-trip correctness ───

describe('Feature: invoice-template-polish, Property 3: hexToRgb round-trip correctness', () => {
  /**
   * Validates: Requirements 4.1
   *
   * For any valid RGB tuple (r, g, b) where each component is 0–255,
   * converting to hex and back via hexToRgb should return the original tuple.
   */

  const rgbTuple = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  );

  function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  it('should round-trip any RGB tuple through hex and back', () => {
    fc.assert(
      fc.property(rgbTuple, ([r, g, b]) => {
        const hex = rgbToHex(r, g, b);
        const [rr, gg, bb] = hexToRgb(hex);
        expect(rr).toBe(r);
        expect(gg).toBe(g);
        expect(bb).toBe(b);
      }),
      { numRuns: 500 }
    );
  });
});

// ─── Property 4: PDF generation succeeds for all valid inputs ───

describe('Feature: invoice-template-polish, Property 4: PDF generation succeeds for all valid inputs', () => {
  /**
   * Validates: Requirements 4.4, 5.1
   *
   * For any valid InvoiceData, any TemplateName, any valid accent color
   * (or undefined), and any footer text ≤ 500 chars (or undefined),
   * calling generateInvoicePDF should not throw.
   */

  const templateArb = fc.constantFrom<TemplateName>('modern', 'classic', 'minimal');

  const accentColorArb = fc.oneof(
    fc.constant(undefined),
    validHexColor
  );

  const footerTextArb = fc.oneof(
    fc.constant(undefined),
    fc.string({ minLength: 0, maxLength: 500 })
  );

  const lineItemArb = fc.record({
    description: fc.string({ minLength: 1, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 100 }),
    unitPrice: fc.integer({ min: 1, max: 10000 }),
  }).map(item => ({
    ...item,
    amount: item.quantity * item.unitPrice,
  }));

  const invoiceDataArb = fc.record({
    invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }),
    issueDate: fc.constant('2024-01-15'),
    dueDate: fc.constant('2024-02-15'),
    status: fc.constantFrom('DRAFT', 'SENT', 'PAID'),
    clientName: fc.string({ minLength: 1, maxLength: 50 }),
    subtotal: fc.integer({ min: 0, max: 100000 }),
    gstRate: fc.constant(15),
    gstAmount: fc.integer({ min: 0, max: 15000 }),
    total: fc.integer({ min: 0, max: 115000 }),
    currency: fc.constant('NZD'),
    lineItems: fc.array(lineItemArb, { minLength: 1, maxLength: 5 }),
  });

  it('should not throw for any valid combination of inputs', () => {
    fc.assert(
      fc.property(
        invoiceDataArb,
        templateArb,
        accentColorArb,
        footerTextArb,
        (invoice, template, accentColor, footerText) => {
          const options = {
            ...(accentColor !== undefined ? { accentColor } : {}),
            ...(footerText !== undefined ? { footerText } : {}),
          };
          expect(() => {
            generateInvoicePDF(
              invoice as InvoiceData,
              template,
              Object.keys(options).length > 0 ? options : undefined
            );
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
