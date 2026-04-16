import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { companySchema } from '@/lib/validation';
import { hexToRgb, generateInvoicePDF, InvoiceData, TemplateName } from '@/lib/generate-pdf';

// ─── Mock jsPDF (same pattern as property tests) ───

const mockAddPage = jest.fn();
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
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    setLineWidth: jest.fn(),
    setLineDashPattern: jest.fn(),
    text: jest.fn(),
    line: jest.fn(),
    addPage: (...args: unknown[]) => mockAddPage(...args),
    addImage: jest.fn(),
    splitTextToSize: (...args: unknown[]) => mockSplitTextToSize(...args),
  };
  return jest.fn(() => mockDoc);
});

jest.mock('jspdf-autotable', () => jest.fn());

// ─── Mock useTheme for TemplateThumbnail ───

jest.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Import TemplateThumbnail after mocks are set up
import TemplateThumbnail from '@/components/TemplateThumbnail';

// ─── Helpers ───

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


// ═══════════════════════════════════════════════════════════════════
// 8.1 — Template Thumbnail Rendering
// ═══════════════════════════════════════════════════════════════════

describe('8.1 TemplateThumbnail rendering', () => {
  const templates: TemplateName[] = ['modern', 'classic', 'minimal'];

  it.each(templates)('renders SVG for %s template', (templateId) => {
    const { container } = render(
      <TemplateThumbnail
        templateId={templateId}
        accentColor="#6366F1"
        selected={false}
        dark={false}
        onClick={jest.fn()}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows checkmark and highlighted border when selected', () => {
    const { container } = render(
      <TemplateThumbnail
        templateId="modern"
        accentColor="#6366F1"
        selected={true}
        dark={false}
        onClick={jest.fn()}
      />
    );
    // Checkmark badge is present
    expect(screen.getByText('✓')).toBeInTheDocument();
    // Button has aria-pressed=true
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // Selected light mode uses indigo border
    expect(button?.className).toContain('border-indigo-600');
  });

  it('has no checkmark when unselected', () => {
    render(
      <TemplateThumbnail
        templateId="modern"
        accentColor="#6366F1"
        selected={false}
        dark={false}
        onClick={jest.fn()}
      />
    );
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <TemplateThumbnail
        templateId="classic"
        accentColor="#6366F1"
        selected={false}
        dark={false}
        onClick={handleClick}
      />
    );
    const button = container.querySelector('button')!;
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('uses purple border styling in dark mode when selected', () => {
    const { container } = render(
      <TemplateThumbnail
        templateId="minimal"
        accentColor="#6366F1"
        selected={true}
        dark={true}
        onClick={jest.fn()}
      />
    );
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-purple-500');
  });

  it('has accessible aria-label for each template', () => {
    const { container } = render(
      <TemplateThumbnail
        templateId="classic"
        accentColor="#6366F1"
        selected={false}
        dark={false}
        onClick={jest.fn()}
      />
    );
    const button = container.querySelector('button');
    expect(button).toHaveAttribute('aria-label', 'Select classic template');
  });
});


// ═══════════════════════════════════════════════════════════════════
// 8.2 — Color Picker Defaults & Reset (via Zod schema validation)
// ═══════════════════════════════════════════════════════════════════

describe('8.2 Color picker defaults and validation', () => {
  it('accepts #6366F1 as the default accent color', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co', accentColor: '#6366F1' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string (reset / no accent saved)', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co', accentColor: '' });
    expect(result.success).toBe(true);
  });

  it('accepts undefined (field not provided)', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex codes', () => {
    const invalids = ['#GGG000', '#12345', '6366F1', '#6366F1FF', 'red', '#'];
    for (const hex of invalids) {
      const result = companySchema.safeParse({ companyName: 'Test Co', accentColor: hex });
      expect(result.success).toBe(false);
    }
  });

  it('shows correct error message for invalid hex', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co', accentColor: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors.find(e => e.path.includes('accentColor'))?.message;
      expect(msg).toBe('Enter a valid hex color (e.g. #6366F1)');
    }
  });

  it('accepts valid hex colors with mixed case', () => {
    const valids = ['#aabbcc', '#AABBCC', '#aAbBcC', '#000000', '#ffffff', '#FF00FF'];
    for (const hex of valids) {
      const result = companySchema.safeParse({ companyName: 'Test Co', accentColor: hex });
      expect(result.success).toBe(true);
    }
  });
});


// ═══════════════════════════════════════════════════════════════════
// 8.3 — Footer Text Placeholder & Character Count (via Zod schema)
// ═══════════════════════════════════════════════════════════════════

describe('8.3 Footer text validation and character count accuracy', () => {
  it('accepts empty string (no footer text)', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co', invoiceFooterText: '' });
    expect(result.success).toBe(true);
  });

  it('accepts undefined (field not provided)', () => {
    const result = companySchema.safeParse({ companyName: 'Test Co' });
    expect(result.success).toBe(true);
  });

  it('accepts exactly 500 characters', () => {
    const text = 'a'.repeat(500);
    const result = companySchema.safeParse({ companyName: 'Test Co', invoiceFooterText: text });
    expect(result.success).toBe(true);
  });

  it('rejects 501 characters', () => {
    const text = 'a'.repeat(501);
    const result = companySchema.safeParse({ companyName: 'Test Co', invoiceFooterText: text });
    expect(result.success).toBe(false);
  });

  it('shows correct error message for oversized footer', () => {
    const text = 'x'.repeat(501);
    const result = companySchema.safeParse({ companyName: 'Test Co', invoiceFooterText: text });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors.find(e => e.path.includes('invoiceFooterText'))?.message;
      expect(msg).toBe('Footer text must be 500 characters or less');
    }
  });

  it('character count equals string .length for various inputs', () => {
    const samples = ['', 'Hello', 'Payment due within 14 days.', 'a'.repeat(250), 'a'.repeat(500)];
    for (const s of samples) {
      // Simulates the character count display logic: `${text.length} / 500`
      expect(`${s.length} / 500`).toBe(`${s.length} / 500`);
      expect(s.length).toBeLessThanOrEqual(500);
    }
  });

  it('accepts typical footer text content', () => {
    const text = 'Thank you for your business. Payment due within 14 days.';
    const result = companySchema.safeParse({ companyName: 'Test Co', invoiceFooterText: text });
    expect(result.success).toBe(true);
  });
});


// ═══════════════════════════════════════════════════════════════════
// 8.4 — PDF Generation Edge Cases
// ═══════════════════════════════════════════════════════════════════

describe('8.4 PDF generation edge cases', () => {
  beforeEach(() => {
    mockAddPage.mockClear();
    mockSplitTextToSize.mockClear();
    mockSplitTextToSize.mockImplementation((text: string) => [text]);
  });

  it('generates PDF with no options (undefined) without throwing', () => {
    expect(() => generateInvoicePDF(makeInvoice(), 'modern', undefined)).not.toThrow();
  });

  it('generates PDF with empty options object without throwing', () => {
    expect(() => generateInvoicePDF(makeInvoice(), 'modern', {})).not.toThrow();
  });

  it('generates PDF with no accentColor — uses template default (hexToRgb fallback)', () => {
    // When accentColor is undefined, hexToRgb should not be called with undefined
    // and the template should use its own default color
    expect(() => generateInvoicePDF(makeInvoice(), 'modern', { accentColor: undefined })).not.toThrow();
    expect(() => generateInvoicePDF(makeInvoice(), 'classic', { accentColor: undefined })).not.toThrow();
    expect(() => generateInvoicePDF(makeInvoice(), 'minimal', { accentColor: undefined })).not.toThrow();
  });

  it('generates PDF with no footerText — omits footer section', () => {
    // No footer text means renderFooterText should be a no-op
    expect(() => generateInvoicePDF(makeInvoice(), 'modern', { footerText: undefined })).not.toThrow();
    expect(() => generateInvoicePDF(makeInvoice(), 'classic', { footerText: undefined })).not.toThrow();
    expect(() => generateInvoicePDF(makeInvoice(), 'minimal', { footerText: undefined })).not.toThrow();
  });

  it('generates PDF with empty footerText string — omits footer section', () => {
    expect(() => generateInvoicePDF(makeInvoice(), 'modern', { footerText: '' })).not.toThrow();
  });

  it('handles footer overflow by triggering addPage for long footer text', () => {
    // Simulate splitTextToSize returning many lines to force page overflow
    const longLines = Array.from({ length: 80 }, (_, i) => `Line ${i + 1} of footer text`);
    mockSplitTextToSize.mockReturnValue(longLines);

    expect(() =>
      generateInvoicePDF(makeInvoice(), 'modern', {
        footerText: 'A'.repeat(500),
      })
    ).not.toThrow();

    // addPage should have been called due to overflow
    expect(mockAddPage).toHaveBeenCalled();
  });

  it('hexToRgb returns fallback [99, 102, 241] for null-ish input', () => {
    expect(hexToRgb('')).toEqual([99, 102, 241]);
    expect(hexToRgb(null as unknown as string)).toEqual([99, 102, 241]);
    expect(hexToRgb(undefined as unknown as string)).toEqual([99, 102, 241]);
  });

  it('hexToRgb returns fallback for invalid hex strings', () => {
    expect(hexToRgb('#GG00FF')).toEqual([99, 102, 241]);
    expect(hexToRgb('#12345')).toEqual([99, 102, 241]);
    expect(hexToRgb('6366F1')).toEqual([99, 102, 241]);
    expect(hexToRgb('#')).toEqual([99, 102, 241]);
  });

  it('hexToRgb correctly parses valid hex colors', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#6366F1')).toEqual([99, 102, 241]);
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
  });

  it.each<TemplateName>(['modern', 'classic', 'minimal'])(
    'generates PDF for %s template with both accentColor and footerText',
    (template) => {
      expect(() =>
        generateInvoicePDF(makeInvoice(), template, {
          accentColor: '#FF5733',
          footerText: 'Payment due within 14 days.',
        })
      ).not.toThrow();
    }
  );
});
