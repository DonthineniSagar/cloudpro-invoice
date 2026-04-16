# Bugfix Requirements Document

## Introduction

The accent color selected in Company Settings is not applied to generated invoice PDFs. After deploying the backend and creating new invoices (INV-2604-811 and INV-2604-161), both render with plain black font on a white background despite the user having selected a color palette in settings. Investigation reveals three distinct issues working together to cause this:

1. The `buildPdfDoc` function wraps the entire CompanyProfile load in a bare `catch {}` that silently swallows errors. If the profile query fails for any reason (permissions, network, schema mismatch), `accentColor` stays `undefined` and the template falls back to its default color (black for Modern, navy for Classic).
2. The Modern template barely uses the accent color — only for the "TAX INVOICE" title text. If the user picks a dark accent color, it looks identical to the default black. The Classic and Minimal templates use accent color more prominently.
3. When `invoice.pdfUrl` already exists, `handleDownloadPDF` downloads the stale S3 file and never calls `buildPdfDoc`, so accent color changes are never reflected in previously-generated PDFs.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the CompanyProfile query fails inside `buildPdfDoc` (due to permissions, network error, or schema mismatch) THEN the system silently swallows the error via a bare `catch {}` block, leaving `accentColor` as `undefined` with no console output or user feedback

1.2 WHEN `accentColor` is `undefined` due to a swallowed error in `buildPdfDoc` THEN the Modern template falls back to black `[20, 20, 20]`, the Classic template falls back to navy `[44, 62, 80]`, and the Minimal template falls back to black `[30, 30, 30]`, making it appear as if no accent color was set

1.3 WHEN a user selects an accent color and generates a PDF using the Modern template THEN the system only applies the accent color to the "TAX INVOICE" title text, while the table header underline uses hardcoded black `[0, 0, 0]`, the total separator line uses hardcoded black, and the payment advice header uses hardcoded black — making the accent color barely visible

1.4 WHEN a user changes their accent color (or footer text or template) in Company Settings and then downloads a previously-generated invoice PDF THEN the system serves the old cached PDF from S3 without the new accent color applied, because `handleDownloadPDF` returns early when `invoice.pdfUrl` exists and never calls `buildPdfDoc`

1.5 WHEN `invoice.pdfUrl` is already set on an invoice record THEN the system skips `buildPdfDoc` entirely and returns the stale S3 file, so no company profile customizations (accent color, footer, template) are reflected in the download

### Expected Behavior (Correct)

2.1 WHEN the CompanyProfile query fails inside `buildPdfDoc` THEN the system SHALL log the error via `console.error` so the failure is visible during development and debugging

2.2 WHEN `accentColor` cannot be loaded from CompanyProfile due to an error THEN the system SHALL fall back to the default indigo color (`#6366F1`) rather than template-specific dark colors, so the user sees a visible accent color even when the profile load fails

2.3 WHEN a user selects an accent color and generates a PDF using the Modern template THEN the system SHALL apply the accent color to the "TAX INVOICE" title text, the table header underline, the total separator line, and the "PAYMENT ADVICE" header text — making the accent color prominently visible throughout the document

2.4 WHEN a user downloads a previously-generated invoice PDF THEN the system SHALL always regenerate the PDF using the current CompanyProfile settings (accent color, footer text, template), upload the new PDF to S3, update the `pdfUrl` reference, and serve the fresh PDF

2.5 WHEN a user changes their accent color, footer text, or default template in Company Settings and then downloads any invoice PDF THEN the system SHALL reflect those changes in the downloaded PDF regardless of whether a cached PDF existed

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user generates a PDF for the first time (no existing `pdfUrl`) THEN the system SHALL CONTINUE TO generate the PDF with the current accent color, upload to S3, save the `pdfUrl`, and trigger a browser download

3.2 WHEN a user emails an invoice or sends a reminder THEN the system SHALL CONTINUE TO call `buildPdfDoc` to generate a fresh PDF with the current accent color for the email attachment

3.3 WHEN the accent color is not set in CompanyProfile (field is null/empty, not an error) THEN the system SHALL CONTINUE TO fall back to the default indigo color (`#6366F1`) for PDF generation

3.4 WHEN an invoice has status PAID or CANCELLED THEN the system SHALL CONTINUE TO allow PDF download with the current accent color applied

3.5 WHEN the Classic template is used THEN the system SHALL CONTINUE TO apply the accent color to the top/bottom borders, company name, "INVOICE" title, "BILL TO" label, table header fill, total row text, and separator lines as it does today

3.6 WHEN the Minimal template is used THEN the system SHALL CONTINUE TO apply the accent color to the "BILLED TO" label and the Total line as it does today

---

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type { invoice: Invoice, companyProfile: CompanyProfile, template: TemplateName }
  OUTPUT: boolean

  // The bug triggers under any of three conditions:
  // C1: CompanyProfile load fails silently, so accentColor is undefined
  // C2: Modern template is used but accent color is only on the title
  // C3: A cached PDF exists and is served stale
  RETURN profileLoadFailed(X)
      OR (X.template = 'modern' AND X.companyProfile.accentColor IS NOT NULL)
      OR X.invoice.pdfUrl IS NOT NULL
END FUNCTION
```

```pascal
// Property: Fix Checking — Error visibility
// When profile load fails, the error is logged and a visible fallback is used
FOR ALL X WHERE profileLoadFailed(X) DO
  result ← buildPdfDoc'(X)
  ASSERT consoleErrorWasCalled = TRUE
    AND result.accentColor = '#6366F1'
END FOR
```

```pascal
// Property: Fix Checking — Modern template accent prominence
// When Modern template is used with an accent color, it appears in multiple elements
FOR ALL X WHERE X.template = 'modern' AND X.companyProfile.accentColor IS NOT NULL DO
  pdf ← generateModern'(X.invoice, { accentColor: X.companyProfile.accentColor })
  ASSERT pdf.titleColor = hexToRgb(X.companyProfile.accentColor)
    AND pdf.tableHeaderUnderlineColor = hexToRgb(X.companyProfile.accentColor)
    AND pdf.totalSeparatorColor = hexToRgb(X.companyProfile.accentColor)
    AND pdf.paymentAdviceHeaderColor = hexToRgb(X.companyProfile.accentColor)
END FOR
```

```pascal
// Property: Fix Checking — Always-fresh PDF on download
// When a cached PDF exists, download still regenerates with current settings
FOR ALL X WHERE X.invoice.pdfUrl IS NOT NULL DO
  result ← handleDownloadPDF'(X)
  ASSERT result.pdf.accentColor = X.companyProfile.accentColor
    AND result.pdf.footerText = X.companyProfile.invoiceFooterText
    AND result.pdf.template = X.companyProfile.defaultTemplate
END FOR
```

```pascal
// Property: Preservation Checking — Non-buggy inputs unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT handleDownloadPDF(X) = handleDownloadPDF'(X)
END FOR
```
