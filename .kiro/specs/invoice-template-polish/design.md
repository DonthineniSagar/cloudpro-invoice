# Design Document: Invoice Template Polish

## Overview

This feature enhances the invoice template experience in CloudPro Invoice by adding visual template previews, a custom accent color picker, and a custom footer text field to the Company Profile settings page. The PDF generation module is updated to apply the user's accent color and footer text when rendering invoices. Two new optional fields (`accentColor`, `invoiceFooterText`) are added to the CompanyProfile DynamoDB model and validated via Zod.

### Key Design Decisions

1. Template previews are rendered as lightweight SVG-based React components (not actual PDF renders) for performance and dark mode compatibility.
2. The color picker uses the native HTML `<input type="color">` element paired with a hex text input — no third-party color picker library needed.
3. Accent color is passed as an optional hex string to each template function, which converts it to RGB internally. Each template retains its own default color when no accent is provided.
4. Footer text is rendered below the notes section in the PDF. If it overflows the current page, it moves to a new page.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Settings Page (Company Profile)                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Template Preview │  │ Color Picker     │  │ Footer Text       │  │
│  │ Thumbnails       │  │ (native + hex)   │  │ (textarea + count)│  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│           │                    │                      │             │
│  ┌────────▼────────────────────▼──────────────────────▼──────────┐  │
│  │              Profile State + Form Submit                       │  │
│  │  { ...profile, accentColor, invoiceFooterText }               │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ save
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AWS Amplify Gen 2 Backend                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ CompanyProfile (DynamoDB)                                     │   │
│  │  + accentColor: string (optional, hex #RRGGBB)               │   │
│  │  + invoiceFooterText: string (optional, max 500 chars)       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                               │ read at PDF time
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PDF Generation (lib/generate-pdf.ts)               │
│  generateInvoicePDF(invoice, template, { accentColor, footerText })  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ generateModern│  │generateClassic│ │generateMinimal│              │
│  │ (accent→RGB) │  │ (accent→RGB) │  │ (accent→RGB) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Template Preview Thumbnails (`TemplateThumbnail`)

A React component that renders a simplified SVG representation of each template layout.

```typescript
interface TemplateThumbnailProps {
  templateId: TemplateName;
  accentColor: string;  // hex color to preview
  selected: boolean;
  dark: boolean;
  onClick: () => void;
}
```

Each thumbnail shows a miniature layout with:
- Header area (colored with accent)
- Placeholder line items (grey bars)
- Footer area

The thumbnails are rendered inline as SVG elements — no external images or PDF rendering. This keeps them fast, responsive, and dark-mode-aware.

Layout: 3-column grid on md+ viewports, single column on mobile. Each thumbnail is a `<button>` for keyboard accessibility.

### 2. Color Picker

Not a separate component — implemented inline in the settings page within the Invoice Template section.

```
┌──────────────────────────────────────────────┐
│  Accent Color                                │
│  ┌──────┐  ┌──────────────────────────────┐  │
│  │ ████ │  │ #6366F1                      │  │
│  │(native│  │ (hex text input)             │  │
│  │color) │  └──────────────────────────────┘  │
│  └──────┘                                    │
│  [Reset to default]                          │
└──────────────────────────────────────────────┘
```

- Native `<input type="color">` for visual selection
- Text `<input>` for direct hex entry with `#RRGGBB` validation
- Live preview swatch via the native color input's own display
- "Reset to default" link to clear back to `#6366F1`
- Field-level error message when hex is invalid

### 3. Footer Text

Inline textarea in the Invoice Template section.

```
┌──────────────────────────────────────────────┐
│  Invoice Footer Text                         │
│  ┌──────────────────────────────────────────┐│
│  │                                          ││
│  │  (textarea, 3 rows)                      ││
│  │                                          ││
│  └──────────────────────────────────────────┘│
│  0 / 500 characters                          │
└──────────────────────────────────────────────┘
```

- `<textarea>` with `maxLength={500}`
- Character counter: `{length} / 500` — styled in muted text, turns warning color at 450+
- Placeholder: "e.g. Thank you for your business. Payment due within 14 days."

### 4. PDF Generation Updates

The `generateInvoicePDF` function signature changes to accept optional customisation:

```typescript
interface PdfOptions {
  accentColor?: string;   // hex #RRGGBB
  footerText?: string;    // up to 500 chars
}

export function generateInvoicePDF(
  invoice: InvoiceData,
  template: TemplateName = 'modern',
  options?: PdfOptions
): jsPDF;
```

Each template function (`generateModern`, `generateClassic`, `generateMinimal`) receives the options and:
- Converts `accentColor` hex to `[R, G, B]` tuple via a `hexToRgb` helper
- Falls back to its own default color if no accent is provided
- Renders `footerText` below the notes section using `ensureSpace` to handle page overflow

### 5. Hex-to-RGB Helper

```typescript
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
```

This is a pure utility function inside `lib/generate-pdf.ts`.

---

## Data Models

### CompanyProfile — New Fields

Two new optional string fields added to `amplify/data/resource.ts`:

```typescript
// Inside CompanyProfile model definition, after defaultTemplate:
accentColor: a.string(),          // hex color string e.g. "#6366F1"
invoiceFooterText: a.string(),    // free text, max 500 chars (validated by Zod)
```

Both fields are optional (no `.required()`). DynamoDB stores them as strings. The 500-character limit on `invoiceFooterText` is enforced at the Zod validation layer, not at the DynamoDB schema level.

### Zod Validation Updates (`lib/validation.ts`)

The existing `companySchema` is extended with two new optional fields:

```typescript
export const companySchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyEmail: z.string().email('Invalid email address').or(z.literal('')).optional(),
  gstNumber: z.string().regex(/^(\d{2,3}-\d{3}-\d{3}|\d{8,9})$/, 'Invalid NZ GST number (e.g. 12-345-678)').or(z.literal('')).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color (e.g. #6366F1)').or(z.literal('')).optional(),
  invoiceFooterText: z.string().max(500, 'Footer text must be 500 characters or less').optional(),
});
```

### No Changes to Invoice Model

The accent color and footer text are read from CompanyProfile at PDF generation time. They are not snapshotted onto the Invoice record — the user's current settings apply each time a PDF is generated. This is intentional: if a user changes their brand color, regenerating a PDF picks up the new color.



---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hex color validation accepts valid and rejects invalid

*For any* string, the Zod `accentColor` validator should accept it if and only if it matches the pattern `#[0-9A-Fa-f]{6}`. Strings that are valid 7-character hex color codes (# + 6 hex digits) pass validation; all other strings (wrong length, missing #, non-hex characters, empty) are rejected.

**Validates: Requirements 2.6, 6.3**

### Property 2: Footer text length validation

*For any* string, the Zod `invoiceFooterText` validator should accept it if and only if its length is ≤ 500 characters. Strings longer than 500 characters are rejected with an appropriate error message.

**Validates: Requirements 3.3, 6.4**

### Property 3: hexToRgb round-trip correctness

*For any* valid RGB tuple (r, g, b) where each component is an integer 0–255, converting to a hex string `#RRGGBB` and then calling `hexToRgb` should return the original (r, g, b) tuple.

**Validates: Requirements 4.1**

### Property 4: PDF generation succeeds for all valid inputs

*For any* valid InvoiceData, any TemplateName, any valid accent color (or undefined), and any footer text string ≤ 500 characters (or undefined), calling `generateInvoicePDF` should produce a jsPDF document without throwing an error.

**Validates: Requirements 4.4, 5.1**

### Property 5: Character count displays actual length

*For any* string of length 0–500, the displayed character count should equal the string's `.length` property.

**Validates: Requirements 3.4**

---

## Error Handling

### Validation Errors

| Scenario | Handling |
|---|---|
| Invalid hex color entered | Field-level error: "Enter a valid hex color (e.g. #6366F1)" displayed below the hex input. Form submission blocked until corrected. |
| Footer text exceeds 500 chars | `maxLength={500}` on textarea prevents input beyond limit. Zod validation as backup rejects on submit. |
| Invalid hex in Zod schema | `companySchema` validation catches on form submit via `validate()` helper. Toast not needed — field-level error is shown. |

### PDF Generation Errors

| Scenario | Handling |
|---|---|
| Invalid accent color reaches PDF generator | `hexToRgb` returns the template's default color if parsing fails (defensive fallback). |
| Footer text causes page overflow | `ensureSpace` helper detects insufficient room and adds a new page before rendering footer text. |
| jsPDF rendering error | Existing try/catch in invoice page catches and shows toast error. No change needed. |

### Data Persistence Errors

| Scenario | Handling |
|---|---|
| Save fails (network/API error) | Existing `handleSubmit` try/catch shows `toast.error('Failed to save profile')`. No change needed. |
| Load fails | Existing load error handling logs to console. Fields default to empty/default values. |

---

## Testing Strategy

### Property-Based Testing

Library: **fast-check** (TypeScript property-based testing library)

Each property test runs a minimum of 100 iterations with randomly generated inputs.

| Property | Test Approach |
|---|---|
| P1: Hex color validation | Generate random strings (valid hex, invalid hex, edge cases). Validate against Zod schema. Assert acceptance matches the hex color pattern. |
| P2: Footer text length | Generate random strings of length 0–1000. Validate against Zod schema. Assert acceptance iff length ≤ 500. |
| P3: hexToRgb round-trip | Generate random (r, g, b) tuples with integers 0–255. Convert to hex string, call hexToRgb, assert equality. |
| P4: PDF generation | Generate random InvoiceData (with required fields), random template, random valid accent color (or undefined), random footer text (or undefined). Call generateInvoicePDF. Assert no throw. |
| P5: Character count | Generate random strings 0–500 length. Assert displayed count equals `.length`. |

Each test is tagged with: `Feature: invoice-template-polish, Property {N}: {title}`

### Unit Tests

Unit tests complement property tests for specific examples and edge cases:

- Template thumbnail renders one thumbnail per TEMPLATES entry
- Selected template has highlighted styling
- Color picker defaults to `#6366F1` when no accent color is saved
- Empty/undefined footer text shows placeholder
- PDF omits footer section when footerText is undefined
- PDF uses template default color when accentColor is undefined
- Footer text overflow triggers new page (long footer + many line items)
- Character counter shows "0 / 500" for empty input
- Character counter shows warning styling at 450+ characters

### Test File Locations

- `__tests__/lib/validation.test.ts` — Zod schema property tests (P1, P2)
- `__tests__/lib/generate-pdf.test.ts` — hexToRgb round-trip (P3) and PDF generation (P4)
- `__tests__/components/template-settings.test.tsx` — UI unit tests (thumbnails, color picker, footer text, character count P5)
