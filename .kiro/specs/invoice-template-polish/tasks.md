# Tasks: Invoice Template Polish

## Task 1: Add new fields to CompanyProfile data model
- [x] 1.1 Add `accentColor: a.string()` field to CompanyProfile in `amplify/data/resource.ts`
- [ ] 1.2 Add `invoiceFooterText: a.string()` field to CompanyProfile in `amplify/data/resource.ts`

## Task 2: Update Zod validation schema
- [x] 2.1 Add `accentColor` field to `companySchema` in `lib/validation.ts` with hex color regex validation `^#[0-9A-Fa-f]{6}$`
- [x] 2.2 Add `invoiceFooterText` field to `companySchema` in `lib/validation.ts` with max 500 character validation

## Task 3: Update PDF generation module
- [x] 3.1 Add `hexToRgb` helper function in `lib/generate-pdf.ts` that converts hex string to `[r, g, b]` tuple
- [x] 3.2 Add `PdfOptions` interface with optional `accentColor` and `footerText` fields
- [x] 3.3 Update `generateInvoicePDF` function signature to accept optional `PdfOptions` parameter
- [x] 3.4 Update `generateModern` to accept and apply accent color (fallback to existing default) and render footer text below notes
- [x] 3.5 Update `generateClassic` to accept and apply accent color (fallback to existing navy default) and render footer text below notes
- [x] 3.6 Update `generateMinimal` to accept and apply accent color (fallback to existing default) and render footer text below notes
- [x] 3.7 Add footer text page overflow handling using `ensureSpace` in each template function

## Task 4: Build template preview thumbnails
- [x] 4.1 Create `TemplateThumbnail` component in `components/TemplateThumbnail.tsx` that renders SVG-based template preview with accent color support and dark mode
- [x] 4.2 Create distinct SVG layouts for Modern (payment advice tear-off), Classic (bordered table), and Minimal (whitespace-focused) templates

## Task 5: Update Company Profile settings page
- [x] 5.1 Add `accentColor` and `invoiceFooterText` to the profile state object in `app/settings/company/page.tsx`
- [x] 5.2 Replace text-only template buttons with `TemplateThumbnail` components in the Invoice Template section
- [x] 5.3 Add color picker UI (native `<input type="color">` + hex text input + reset link) below template selector
- [x] 5.4 Add footer text textarea with placeholder, `maxLength={500}`, and character count indicator
- [x] 5.5 Add hex color validation error display below the hex input field
- [x] 5.6 Update `useEffect` data load to populate `accentColor` and `invoiceFooterText` from CompanyProfile
- [x] 5.7 Update `handleSubmit` to include `accentColor` and `invoiceFooterText` in the save payload
- [x] 5.8 Ensure all new UI elements support light and dark mode via `useTheme()`

## Task 6: Update invoice PDF generation call sites
- [x] 6.1 Update all call sites of `generateInvoicePDF` to pass `accentColor` and `footerText` from CompanyProfile data

## Task 7: Write property-based tests
- [x] 7.1 Write property test for hex color validation (P1) using fast-check — generate random strings, verify Zod accepts iff valid hex format
  - `Feature: invoice-template-polish, Property 1: Hex color validation accepts valid and rejects invalid`
- [x] 7.2 Write property test for footer text length validation (P2) using fast-check — generate random strings 0–1000 length, verify Zod accepts iff ≤ 500
  - `Feature: invoice-template-polish, Property 2: Footer text length validation`
- [x] 7.3 Write property test for hexToRgb round-trip (P3) using fast-check — generate random RGB tuples, convert to hex and back, assert equality
  - `Feature: invoice-template-polish, Property 3: hexToRgb round-trip correctness`
- [x] 7.4 Write property test for PDF generation (P4) using fast-check — generate random valid invoice data, template, accent color, footer text, assert no throw
  - `Feature: invoice-template-polish, Property 4: PDF generation succeeds for all valid inputs`

## Task 8: Write unit tests
- [x] 8.1 Write unit tests for template thumbnail rendering (one per template, selected state highlighting)
- [x] 8.2 Write unit tests for color picker defaults (`#6366F1` when no accent saved) and reset behavior
- [x] 8.3 Write unit tests for footer text placeholder display and character count accuracy
- [x] 8.4 Write unit tests for PDF generation edge cases (no accent color uses template default, no footer text omits footer section, footer overflow triggers new page)
