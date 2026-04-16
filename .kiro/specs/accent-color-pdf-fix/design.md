# Accent Color PDF Fix — Bugfix Design

## Overview

Three interrelated issues prevent the user's chosen accent color from appearing in generated invoice PDFs:

1. `buildPdfDoc` in `app/invoices/[id]/page.tsx` wraps the entire CompanyProfile load in a bare `catch {}`, silently swallowing errors and leaving `accentColor` as `undefined`.
2. The Modern template in `lib/generate-pdf.ts` only applies the accent color to the "TAX INVOICE" title text — the table header underline, total separator, and payment advice header are hardcoded to black `[0, 0, 0]`.
3. `handleDownloadPDF` short-circuits when `invoice.pdfUrl` exists, serving a stale S3 file that never reflects updated company settings.

The fix is minimal and targeted: log errors with a visible fallback, propagate accent color to all Modern template elements, and always regenerate the PDF on download.

## Glossary

- **Bug_Condition (C)**: Any of three conditions — profile load error silently swallowed, Modern template ignoring accent color on key elements, or cached PDF served stale
- **Property (P)**: Accent color is visibly applied throughout the PDF, errors are logged, and downloads always reflect current settings
- **Preservation**: Classic/Minimal template rendering, email/reminder PDF generation, first-time PDF generation, and all non-PDF UI behavior must remain unchanged
- **`buildPdfDoc`**: Async function in `app/invoices/[id]/page.tsx` that loads CompanyProfile (logo, accent color, footer) and calls `generateInvoicePDF`
- **`handleDownloadPDF`**: Async function in `app/invoices/[id]/page.tsx` that either downloads a cached S3 PDF or generates a new one
- **`generateModern`**: Function in `lib/generate-pdf.ts` that renders the Modern template using jsPDF
- **`accentColor`**: Hex string (`#RRGGBB`) stored on CompanyProfile, converted to RGB via `hexToRgb()` for jsPDF calls

## Bug Details

### Fault Condition

The bug manifests under three distinct conditions that can occur independently or together:

**C1 — Silent error swallowing**: When the CompanyProfile query fails inside `buildPdfDoc`, the bare `catch {}` block swallows the error. `accentColor` remains `undefined`, and the template falls back to its dark default color (black for Modern, navy for Classic) with no console output.

**C2 — Modern template accent underuse**: When the Modern template is used with a non-null accent color, only the "TAX INVOICE" title uses `accentRgb`. The `didParseCell` callback hardcodes the header underline to `[0, 0, 0]`, the total separator `doc.line` uses `doc.setDrawColor(0)` (black), and the "PAYMENT ADVICE" header uses `black` constant `[20, 20, 20]`.

**C3 — Cached PDF bypass**: When `invoice.pdfUrl` is already set, `handleDownloadPDF` fetches the S3 URL and returns early without calling `buildPdfDoc`, so any accent color, footer, or template changes made since the last generation are never reflected.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { invoice: Invoice, companyProfile: CompanyProfile, template: TemplateName, profileLoadError: boolean }
  OUTPUT: boolean

  C1 := input.profileLoadError = TRUE
  C2 := input.template = 'modern' AND input.companyProfile.accentColor IS NOT NULL
  C3 := input.invoice.pdfUrl IS NOT NULL

  RETURN C1 OR C2 OR C3
END FUNCTION
```

### Examples

- **C1 example**: User sets accent color to `#E11D48` (rose). Network blip causes CompanyProfile query to throw. `buildPdfDoc` catches silently → `accentColor` is `undefined` → Modern template uses `[20, 20, 20]` (black) for the title. User sees a plain black PDF with no indication of failure.
- **C2 example**: User sets accent color to `#6366F1` (indigo) and generates a Modern PDF. The "TAX INVOICE" title is indigo, but the table header underline is black `[0, 0, 0]`, the total separator is black, and "PAYMENT ADVICE" is black `[20, 20, 20]`. The accent is barely noticeable.
- **C3 example**: User generates a PDF (stored in S3 with black accent). Later changes accent to `#E11D48` in settings. Clicks "Download PDF" → `handleDownloadPDF` sees `invoice.pdfUrl` exists → downloads the old black PDF from S3. The rose accent is never applied.
- **Edge case**: User has no accent color set (null in CompanyProfile, not an error). `hexToRgb` receives `undefined`, returns fallback `[99, 102, 241]` (indigo). This is correct existing behavior and should be preserved.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Classic template accent color usage (top/bottom borders, company name, "INVOICE" title, "BILL TO" label, table header fill, total row text, separator lines) must remain identical
- Minimal template accent color usage ("BILLED TO" label, Total line) must remain identical
- First-time PDF generation flow (generate → upload to S3 → save pdfUrl → browser download) must remain identical
- Email and reminder flows calling `buildPdfDoc` must continue to generate fresh PDFs
- `hexToRgb` fallback behavior for null/invalid hex must remain identical
- Mouse clicks, status updates, portal links, and all non-PDF UI interactions must remain identical
- Invoice status restrictions (PAID/CANCELLED locked from editing) must remain identical

**Scope:**
All inputs that do NOT involve: (a) a CompanyProfile load error, (b) the Modern template with a non-null accent color, or (c) a cached PDF download — should be completely unaffected by this fix. This includes:
- Classic and Minimal template rendering with accent colors
- Email sending and reminder flows
- All non-PDF page interactions (status changes, portal links, editing)
- `hexToRgb` conversion logic

## Hypothesized Root Cause

Based on code analysis, the root causes are confirmed (not hypothesized):

1. **Silent error swallowing in `buildPdfDoc`** (line ~107 in `page.tsx`): The outer `try/catch` around the CompanyProfile load has an empty `catch {}` block. Any error (permissions, network, schema mismatch) is silently discarded. `accentColor` stays `undefined`, and `generateInvoicePDF` receives `{ accentColor: undefined }`, causing each template to use its dark default.

2. **Hardcoded black in Modern template** (`lib/generate-pdf.ts`):
   - `didParseCell` callback sets `data.cell.styles.lineColor = [0, 0, 0]` for head section — should use `accentRgb`
   - Total separator line uses `doc.setDrawColor(0)` (shorthand for black) — should use `accentRgb`
   - "PAYMENT ADVICE" header uses `doc.setTextColor(...black)` where `black = [20, 20, 20]` — should use `accentRgb`

3. **Early return in `handleDownloadPDF`** (line ~130 in `page.tsx`): When `invoice.pdfUrl` is truthy, the function fetches the S3 URL and returns immediately. It never calls `buildPdfDoc`, so any settings changes since the last generation are invisible.

## Correctness Properties

Property 1: Fault Condition — Error Logging and Visible Fallback

_For any_ input where the CompanyProfile query fails inside `buildPdfDoc`, the fixed function SHALL log the error via `console.error` and fall back to the default indigo color (`#6366F1`) so the generated PDF has a visible accent color even when the profile load fails.

**Validates: Requirements 2.1, 2.2**

Property 2: Fault Condition — Modern Template Accent Prominence

_For any_ input where the Modern template is used with a non-null accent color, the fixed `generateModern` function SHALL apply the accent color RGB to the "TAX INVOICE" title text, the table header underline color, the total separator line color, and the "PAYMENT ADVICE" header text color.

**Validates: Requirements 2.3**

Property 3: Fault Condition — Always-Fresh PDF on Download

_For any_ input where `invoice.pdfUrl` is already set, the fixed `handleDownloadPDF` function SHALL call `buildPdfDoc` to regenerate the PDF with current CompanyProfile settings, upload the new PDF to S3, update the `pdfUrl` reference, and serve the freshly generated PDF.

**Validates: Requirements 2.4, 2.5**

Property 4: Preservation — Classic and Minimal Templates Unchanged

_For any_ input where the template is Classic or Minimal, the fixed code SHALL produce exactly the same PDF output as the original code, preserving all existing accent color usage in those templates.

**Validates: Requirements 3.5, 3.6**

Property 5: Preservation — Email and Reminder Flows Unchanged

_For any_ email send or reminder send action, the fixed code SHALL continue to call `buildPdfDoc` to generate a fresh PDF with the current accent color, exactly as the original code does.

**Validates: Requirements 3.1, 3.2**

Property 6: Preservation — Null Accent Color Fallback Unchanged

_For any_ input where `accentColor` is null or empty in CompanyProfile (not an error), the fixed code SHALL continue to fall back to the default indigo color `#6366F1` via `hexToRgb`, preserving existing behavior.

**Validates: Requirements 3.3**

## Fix Implementation

### Changes Required

**File**: `app/invoices/[id]/page.tsx`

**Function**: `buildPdfDoc`

**Specific Changes**:
1. **Replace bare `catch {}`** with `catch (error) { console.error('Failed to load company profile:', error); }` so profile load failures are visible in dev tools
2. **Add fallback accent color**: After the catch block, if `accentColor` is still `undefined`, set it to `'#6366F1'` (primary indigo) so the PDF always has a visible accent

**Function**: `handleDownloadPDF`

**Specific Changes**:
3. **Remove early return for cached PDF**: Delete the `if (invoice.pdfUrl)` block that downloads from S3 and returns early. Instead, always fall through to `buildPdfDoc` so the PDF is regenerated with current settings, uploaded to S3, and the `pdfUrl` is updated.

**File**: `lib/generate-pdf.ts`

**Function**: `generateModern`

**Specific Changes**:
4. **Table header underline color**: In the `didParseCell` callback, change `data.cell.styles.lineColor = [0, 0, 0]` to `data.cell.styles.lineColor = accentRgb` for the `head` section
5. **Total separator line color**: Change `doc.setDrawColor(0)` before the total separator `doc.line` to `doc.setDrawColor(...accentRgb)`
6. **Payment advice header color**: Change `doc.setTextColor(...black)` before `doc.text('PAYMENT ADVICE', ...)` to `doc.setTextColor(...accentRgb)`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that exercise each of the three bug conditions on the unfixed code. Run them to observe failures and confirm root causes.

**Test Cases**:
1. **Silent Error Test**: Mock `CompanyProfile.list` to throw, call `buildPdfDoc`, assert `console.error` was called (will fail on unfixed code — no logging occurs)
2. **Modern Accent Color Test**: Call `generateModern` with `accentColor: '#E11D48'`, inspect the jsPDF draw calls to verify header underline, total separator, and payment advice header use the accent color (will fail on unfixed code — they use black)
3. **Cached PDF Bypass Test**: Set `invoice.pdfUrl` to a value, call `handleDownloadPDF`, assert `buildPdfDoc` is called (will fail on unfixed code — early return skips it)

**Expected Counterexamples**:
- `console.error` is never called when profile load fails
- `didParseCell` sets lineColor to `[0, 0, 0]` instead of accent RGB
- `handleDownloadPDF` returns after S3 download without calling `buildPdfDoc`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
// C1: Error logging and fallback
FOR ALL input WHERE profileLoadFailed(input) DO
  result := buildPdfDoc'(input)
  ASSERT consoleErrorWasCalled = TRUE
  ASSERT result.accentColor = '#6366F1'
END FOR

// C2: Modern template accent prominence
FOR ALL input WHERE input.template = 'modern' AND input.accentColor IS NOT NULL DO
  pdf := generateModern'(input.invoice, { accentColor: input.accentColor })
  rgb := hexToRgb(input.accentColor)
  ASSERT pdf.titleColor = rgb
  ASSERT pdf.tableHeaderUnderlineColor = rgb
  ASSERT pdf.totalSeparatorColor = rgb
  ASSERT pdf.paymentAdviceHeaderColor = rgb
END FOR

// C3: Always-fresh PDF
FOR ALL input WHERE input.invoice.pdfUrl IS NOT NULL DO
  result := handleDownloadPDF'(input)
  ASSERT buildPdfDocWasCalled = TRUE
  ASSERT result.uploadedToS3 = TRUE
  ASSERT result.pdfUrlUpdated = TRUE
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Classic/Minimal templates and null accent color scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Classic Template Preservation**: Generate Classic PDFs with various accent colors on unfixed code, verify identical output after fix
2. **Minimal Template Preservation**: Generate Minimal PDFs with various accent colors on unfixed code, verify identical output after fix
3. **Null Accent Fallback Preservation**: Call `hexToRgb(undefined)` and `hexToRgb('')` on unfixed code, verify same `[99, 102, 241]` result after fix
4. **Email/Reminder Flow Preservation**: Verify `handleSendEmail` and `handleSendReminder` still call `buildPdfDoc` and generate fresh PDFs

### Unit Tests

- Test `buildPdfDoc` logs error and uses indigo fallback when CompanyProfile query throws
- Test `generateModern` applies accent color to title, header underline, total separator, and payment advice header
- Test `handleDownloadPDF` always regenerates PDF regardless of `invoice.pdfUrl` state
- Test edge case: accent color is null (not error) — fallback to indigo via `hexToRgb`

### Property-Based Tests

- Generate random valid hex colors and verify `generateModern` applies them to all four accent elements
- Generate random invoice data with Classic/Minimal templates and verify output is unchanged by the fix
- Generate random `hexToRgb` inputs (valid hex, null, empty, malformed) and verify fallback behavior is preserved

### Integration Tests

- Test full flow: set accent color in CompanyProfile → generate Modern PDF → verify accent visible in multiple elements
- Test full flow: generate PDF → change accent color → download again → verify new accent applied
- Test full flow: profile load fails → PDF still generates with indigo accent → error logged
