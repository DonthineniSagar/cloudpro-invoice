# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Accent Color PDF Bug Conditions
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the three bug conditions exist
  - **Scoped PBT Approach**: Scope the property to the three concrete fault conditions:
    - C1: Mock `CompanyProfile.list` to throw an error, call `buildPdfDoc`, assert `console.error` was called and accent color falls back to `#6366F1` (indigo)
    - C2: Call `generateModern` with `accentColor: '#E11D48'`, inspect jsPDF draw calls to verify header underline uses `hexToRgb('#E11D48')` instead of `[0, 0, 0]`, total separator uses accent RGB instead of `setDrawColor(0)`, and "PAYMENT ADVICE" header uses accent RGB instead of `[20, 20, 20]`
    - C3: Set `invoice.pdfUrl` to a truthy value, call `handleDownloadPDF`, assert `buildPdfDoc` is called (not short-circuited)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - C1: `console.error` never called, accent stays `undefined` → template default black
    - C2: `didParseCell` sets lineColor to `[0,0,0]`, `setDrawColor(0)` for total separator, `setTextColor(20,20,20)` for PAYMENT ADVICE
    - C3: `handleDownloadPDF` returns early after S3 fetch, never calls `buildPdfDoc`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs, then write tests asserting that behavior:
    - Observe: `generateClassic` with accent color `#E11D48` applies accent to top/bottom borders, company name, "INVOICE" title, "BILL TO" label, table header fill, total row text, separator lines
    - Observe: `generateMinimal` with accent color `#E11D48` applies accent to "BILLED TO" label and Total line
    - Observe: `hexToRgb(undefined)` returns `[99, 102, 241]` (indigo fallback)
    - Observe: `hexToRgb('')` returns `[99, 102, 241]` (indigo fallback)
    - Observe: `hexToRgb('#6366F1')` returns `[99, 102, 241]`
  - Write property-based tests:
    - For random valid hex colors, `generateClassic` applies accent to all documented elements (borders, company name, title, BILL TO, table header fill, total row, separators)
    - For random valid hex colors, `generateMinimal` applies accent to BILLED TO label and Total line
    - For null/undefined/empty accent color inputs, `hexToRgb` returns `[99, 102, 241]`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix accent color PDF generation

  - [x] 3.1 Fix `buildPdfDoc` error handling and fallback in `app/invoices/[id]/page.tsx`
    - Replace bare `catch {}` with `catch (error) { console.error('Failed to load company profile:', error); }`
    - After the catch block, if `accentColor` is still `undefined`, set it to `'#6366F1'` (primary indigo)
    - _Bug_Condition: isBugCondition(input) where profileLoadError = TRUE → accentColor stays undefined, no error logged_
    - _Expected_Behavior: console.error called with error details, accentColor falls back to '#6366F1'_
    - _Preservation: hexToRgb fallback for null/empty accent (not error) must remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Fix Modern template accent color propagation in `lib/generate-pdf.ts` `generateModern`
    - In `didParseCell` callback: change `data.cell.styles.lineColor = [0, 0, 0]` to `data.cell.styles.lineColor = accentRgb` for `head` section
    - Total separator line: change `doc.setDrawColor(0)` to `doc.setDrawColor(...accentRgb)` before the `doc.line` call
    - Payment advice header: change `doc.setTextColor(...black)` before `doc.text('PAYMENT ADVICE', ...)` to `doc.setTextColor(...accentRgb)`
    - _Bug_Condition: isBugCondition(input) where template = 'modern' AND accentColor IS NOT NULL → only title uses accent_
    - _Expected_Behavior: accentRgb applied to title, header underline, total separator, and PAYMENT ADVICE header_
    - _Preservation: Classic and Minimal template rendering must remain identical_
    - _Requirements: 2.3_

  - [x] 3.3 Fix `handleDownloadPDF` to always regenerate PDF in `app/invoices/[id]/page.tsx`
    - Remove the `if (invoice.pdfUrl)` early return block that downloads from S3 and returns
    - Always fall through to `buildPdfDoc` so the PDF is regenerated with current CompanyProfile settings
    - The regenerated PDF is uploaded to S3 and `pdfUrl` is updated as part of the existing flow
    - _Bug_Condition: isBugCondition(input) where invoice.pdfUrl IS NOT NULL → stale S3 file served_
    - _Expected_Behavior: buildPdfDoc always called, fresh PDF uploaded to S3, pdfUrl updated, fresh PDF served_
    - _Preservation: First-time PDF generation flow (no existing pdfUrl) must remain identical_
    - _Requirements: 2.4, 2.5_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Accent Color PDF Bug Conditions
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior for all three bug conditions
    - When this test passes, it confirms:
      - C1: `console.error` is called and accent falls back to `#6366F1` on profile load error
      - C2: Modern template applies accent to title, header underline, total separator, and PAYMENT ADVICE
      - C3: `handleDownloadPDF` always regenerates PDF regardless of cached `pdfUrl`
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm Classic template accent usage unchanged (top/bottom borders, company name, INVOICE title, BILL TO, table header fill, total row, separators)
    - Confirm Minimal template accent usage unchanged (BILLED TO label, Total line)
    - Confirm `hexToRgb` fallback for null/empty unchanged
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no regressions
  - Run `npm run build` to verify compilation
  - Ensure all exploration tests (Property 1) pass after fix
  - Ensure all preservation tests (Property 2) pass after fix
  - Ask the user if questions arise
