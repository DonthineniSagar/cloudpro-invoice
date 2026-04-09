# Spec: Financial Year (FY) Support

**Status:** Ready for Development  
**Priority:** HIGH  
**Author:** Product Manager  
**Date:** 2026-03-27  

---

## Overview

All financial views in CloudPro Invoice must be scoped to the NZ Financial Year (April 1 – March 31). Users need to filter, view, and report on data by FY. Expenses in a previous FY can be added until the IRD filing cutoff (May 15), after which the previous FY becomes read-only.

### What Already Exists

A solid foundation is already in place:

- `lib/fy-utils.ts` — complete utility library (`getFY`, `currentFY`, `fyStart`, `fyEnd`, `fyLabel`, `fyShort`, `isPreviousFYOpen`, `availableFYs`, `fyMonthKeys`, `FY_MONTHS`)
- **Dashboard** — FY selector dropdown, metrics/chart/recent items all scoped to `selectedFY` via `getFY()` filtering
- **Invoices list** — FY filter dropdown using `getFY(inv.issueDate)`
- **Expenses list** — FY filter dropdown using `getFY(exp.date)`, insights bar scoped to FY
- **Expense new form** — FY badge/warning when date falls in previous FY, blocks save if FY is closed
- **Reports page** — defaults to current FY date range (Apr 1 – Mar 31)

### What's Missing (Scope of This Spec)

1. FY cutoff enforcement on expense **edit** form (only new form has it)
2. FY cutoff enforcement on **bank import** flow
3. FY badge on expense **edit** form when date falls in previous FY
4. Read-only lock on previous FY expenses after May 15 cutoff
5. Reports page: FY selector dropdown (currently uses raw date pickers)
6. FY summary card on dashboard
7. `availableFYs()` not used consistently — some pages hardcode `[currentFY(), currentFY()-1, currentFY()-2]`

---

## User Stories

### Story 1: FY Cutoff on Expense Edit Form

**As a** freelancer editing an existing expense,  
**I want** the system to warn me if the expense date falls in a previous FY and block edits after the May 15 cutoff,  
**So that** I don't accidentally modify locked FY data.

**Acceptance Criteria:**

- [ ] When editing an expense whose `date` falls in a previous FY and `isPreviousFYOpen()` is `true`: show an amber warning below the date field: `"⚠ This falls in FY{XX} (previous year) — open until May 15"`
- [ ] When editing an expense whose `date` falls in a previous FY and `isPreviousFYOpen()` is `false`: show a red warning: `"✕ FY{XX} is closed — cutoff was May 15"`
- [ ] When `isPreviousFYOpen()` is `false` and the expense date is in a previous FY: disable the Save button and show a toast error if the user somehow submits
- [ ] When the user changes the date field to a date in a closed FY: immediately show the red warning and disable Save
- [ ] Expenses in the **current** FY are never affected by cutoff logic
- [ ] Expenses 2+ FYs old are always read-only (regardless of cutoff date)

**File:** `app/expenses/[id]/edit/page.tsx`

---

### Story 2: FY Cutoff on Bank Statement Import

**As a** freelancer importing a bank statement CSV,  
**I want** the system to skip or warn about transactions that fall in a closed FY,  
**So that** I don't import expenses into a locked period.

**Acceptance Criteria:**

- [ ] Before import begins, scan all parsed transactions and identify any whose date falls in a closed FY
- [ ] If closed-FY transactions exist, show a warning banner: `"X transactions fall in FY{XX} which is closed (cutoff was May 15). These will be skipped."`
- [ ] Closed-FY transactions are visually marked in the preview table (strikethrough or greyed out with a "Closed FY" badge)
- [ ] On import, closed-FY transactions are excluded — only open-FY transactions are created
- [ ] If `isPreviousFYOpen()` is `true`, previous-FY transactions import normally with an informational badge: `"FY{XX}"`
- [ ] The import summary toast reflects the actual count imported (excluding skipped)

**File:** `app/expenses/import/page.tsx`

---

### Story 3: Read-Only Lock on Previous FY Expenses

**As a** freelancer viewing expenses from a closed FY,  
**I want** those expenses to be clearly marked as read-only,  
**So that** I know I can't modify them and don't waste time trying.

**Acceptance Criteria:**

- [ ] On the expense edit page: if the expense date is in a closed FY, render the form in read-only mode (all inputs disabled, no Save button)
- [ ] Show a banner at the top of the edit form: `"🔒 FY{XX} is closed. This expense is read-only."`
- [ ] The Delete button is also hidden/disabled for closed-FY expenses
- [ ] On the expenses list page: closed-FY expenses show a 🔒 icon or "Locked" badge next to the status
- [ ] Approve/Reject quick actions on the expenses list are disabled for closed-FY expenses
- [ ] The "Add Expense" button on the expenses list, when FY filter is set to a closed FY, shows a tooltip or is visually de-emphasised (but not hidden — user can still add current-FY expenses)

**Files:** `app/expenses/[id]/edit/page.tsx`, `app/expenses/page.tsx`

---

### Story 4: FY Selector on Reports Page

**As a** freelancer preparing my tax return,  
**I want** a simple FY dropdown on the reports page that sets the date range to the selected FY,  
**So that** I can quickly pull up the right period without manually entering dates.

**Acceptance Criteria:**

- [ ] Add an FY selector dropdown above or alongside the existing date range filter
- [ ] Default selection: current FY
- [ ] Options: current FY, previous FY, FY before that (3 years, same as other pages)
- [ ] Selecting an FY sets `startDate` to `fyStart(fy)` and `endDate` to `fyEnd(fy)`
- [ ] The existing date pickers remain and stay in sync — if the user manually changes a date, the FY dropdown shows "Custom" or deselects
- [ ] CSV export filenames include the FY label when an FY is selected (e.g. `tax-summary-FY27.csv` instead of date range)

**File:** `app/reports/page.tsx`

---

### Story 5: FY Summary Card on Dashboard

**As a** freelancer,  
**I want** a summary card on the dashboard showing key FY totals at a glance,  
**So that** I can quickly see my financial position for the selected year.

**Acceptance Criteria:**

- [ ] Add an "FY Summary" card to the dashboard, positioned after the Expense & GST Summary row
- [ ] Card displays for the selected FY:
  - FY label (e.g. "FY27 Summary")
  - Total Revenue (incl GST)
  - Total Expenses (incl GST)
  - Net GST Position (collected − paid)
  - Pre-Tax Margin (revenue ex-GST − expenses ex-GST)
  - Invoice count (total) and Expense count (total)
- [ ] If the selected FY is the previous FY and it's closed, show a 🔒 badge: `"FY{XX} — Closed"`
- [ ] If the selected FY is the previous FY and it's still open, show: `"FY{XX} — Open until May 15"`
- [ ] Card uses the same styling as existing dashboard cards (respects dark mode)

**File:** `app/dashboard/page.tsx`

---

### Story 6: Consistent FY Selector Options

**As a** developer,  
**I want** all FY selectors across the app to use `availableFYs()` or a shared constant for the FY list,  
**So that** the options are consistent and easy to maintain.

**Acceptance Criteria:**

- [ ] Replace all hardcoded `[currentFY(), currentFY() - 1, currentFY() - 2]` arrays with a shared helper
- [ ] Add a new function to `lib/fy-utils.ts`: `selectableFYs(): number[]` that returns the last 3 FYs (current, current-1, current-2) — this is for UI dropdowns and is distinct from `availableFYs()` which controls which FYs are open for writes
- [ ] Update: `app/dashboard/page.tsx`, `app/expenses/page.tsx`, `app/invoices/page.tsx`, `app/reports/page.tsx`

**File:** `lib/fy-utils.ts` and all pages with FY selectors

---

## Edge Cases and Error Scenarios

### Date Boundary Cases

| Scenario | Expected FY | Notes |
|---|---|---|
| Date = 2026-03-31 | FY26 | Last day of FY26 |
| Date = 2026-04-01 | FY27 | First day of FY27 |
| Date = 2026-01-15 | FY26 | Jan–Mar belongs to the FY ending that March |
| Date = 2025-12-31 | FY26 | Dec belongs to the FY starting the previous April |

### Cutoff Boundary Cases

| Scenario | Behaviour |
|---|---|
| Today = May 15, user creates expense dated Mar 20 (prev FY) | **Allowed** — May 15 is the last day |
| Today = May 16, user creates expense dated Mar 20 (prev FY) | **Blocked** — cutoff has passed |
| Today = Apr 5, user creates expense dated Mar 20 (prev FY) | **Allowed** — April is within grace period |
| Today = May 16, user creates expense dated Apr 5 (current FY) | **Allowed** — current FY is always open |
| Today = May 16, user edits existing expense from prev FY | **Blocked** — read-only |
| Today = May 16, user views expense from 2 FYs ago | **Blocked** — always read-only |

### Bank Import Edge Cases

| Scenario | Behaviour |
|---|---|
| CSV contains mix of current and closed FY transactions | Import only current FY; skip closed with warning |
| CSV contains only closed FY transactions | Show warning, disable import button |
| CSV contains previous FY transactions, cutoff not yet passed | Import all with FY badge |
| User imports same CSV twice | Existing duplicate detection handles this (separate feature) |

### Reports Edge Cases

| Scenario | Behaviour |
|---|---|
| User selects FY then manually changes start date | FY dropdown shows "Custom" or deselects |
| User selects FY with no data | Show empty state, zero totals |
| FY selector + CSV export | Filename uses FY label |

### General Error Handling

| Error | Response |
|---|---|
| `getFY()` receives invalid date string | Return `NaN` — caller should validate dates before passing |
| User manipulates form to bypass disabled Save button | Server-side: Amplify owner auth still applies. Client-side: `handleSubmit` re-checks `isPreviousFYOpen()` before API call |
| Timezone issues (NZ is UTC+12/+13) | All dates stored as ISO datetime. `getFY()` uses `new Date(date)` which parses in local timezone. This is correct for NZ users. Note: if users are in other timezones, the FY boundary could shift by a day. Acceptable for MVP — all target users are NZ-based. |

---

## Data Model Changes

**None required.** The existing schema already has all necessary fields:

- `Invoice.issueDate` — used for FY determination
- `Expense.date` — used for FY determination
- No new fields, models, or indexes needed

The FY is a **derived value** computed at query time via `getFY(date)`, not stored. This is the correct approach — storing FY would create a denormalization risk.

---

## Impact on Existing Features

### Pages Modified

| Page | Change | Risk |
|---|---|---|
| `app/expenses/[id]/edit/page.tsx` | Add FY badge, cutoff warning, read-only mode | Medium — form behaviour changes |
| `app/expenses/import/page.tsx` | Add closed-FY transaction filtering | Low — additive |
| `app/expenses/page.tsx` | Add locked badge for closed-FY expenses, disable actions | Low — visual only |
| `app/reports/page.tsx` | Add FY selector dropdown | Low — additive, existing date pickers preserved |
| `app/dashboard/page.tsx` | Add FY summary card | Low — additive |
| `lib/fy-utils.ts` | Add `selectableFYs()` helper | Low — additive |

### Pages NOT Modified

| Page | Reason |
|---|---|
| `app/invoices/page.tsx` | Already has FY filter, no cutoff logic needed for invoices |
| `app/invoices/[id]/edit/page.tsx` | Invoices are locked by status (PAID/CANCELLED), not by FY |
| `app/expenses/new/page.tsx` | Already has FY badge and cutoff blocking |
| `app/expenses/review/page.tsx` | Review page shows unclassified imports — FY filtering happens at import time |

### Breaking Changes

None. All changes are additive or enhance existing behaviour.

### Migration

None required. No schema changes.

---

## Implementation Notes

### Recommended Order

1. `lib/fy-utils.ts` — add `selectableFYs()` helper
2. `app/expenses/[id]/edit/page.tsx` — FY badge + cutoff + read-only (highest value)
3. `app/expenses/page.tsx` — locked badge + disabled actions
4. `app/expenses/import/page.tsx` — closed-FY filtering
5. `app/reports/page.tsx` — FY selector
6. `app/dashboard/page.tsx` — FY summary card
7. All pages — replace hardcoded FY arrays with `selectableFYs()`

### Key Utility Functions (already exist in `lib/fy-utils.ts`)

```typescript
getFY(date: Date | string): number        // e.g. "2026-03-15" → 26
currentFY(): number                        // today's FY
isPreviousFYOpen(): boolean                // true if before May 16
fyStart(fy: number): string               // "2025-04-01" for FY26
fyEnd(fy: number): string                 // "2026-03-31" for FY26
fyLabel(fy: number): string               // "FY26 (Apr 2025 – Mar 2026)"
fyShort(fy: number): string               // "FY26"
```

### New Utility to Add

```typescript
/** FYs available for UI dropdowns: current + 2 previous */
export function selectableFYs(): number[] {
  const current = currentFY();
  return [current, current - 1, current - 2];
}

/** Check if a given FY is closed (read-only) */
export function isFYClosed(fy: number): boolean {
  const current = currentFY();
  if (fy >= current) return false;          // current or future FY — open
  if (fy === current - 1) return !isPreviousFYOpen(); // previous FY — depends on cutoff
  return true;                              // 2+ FYs ago — always closed
}
```

### Read-Only Pattern for Edit Form

```typescript
// In expense edit page
const expenseFY = formData.date ? getFY(formData.date) : currentFY();
const isLocked = isFYClosed(expenseFY);

// Disable all inputs when locked
<input ... disabled={isLocked} />

// Hide save/delete buttons when locked
{!isLocked && <button type="submit">Update Expense</button>}

// Show lock banner
{isLocked && (
  <div className="...warning banner...">
    🔒 {fyShort(expenseFY)} is closed. This expense is read-only.
  </div>
)}
```

### Bank Import Filtering Pattern

```typescript
// Before import, partition transactions
const openTransactions = transactions.filter(tx => !isFYClosed(getFY(tx.date)));
const closedTransactions = transactions.filter(tx => isFYClosed(getFY(tx.date)));

// Show warning if any closed
{closedTransactions.length > 0 && (
  <div className="...warning...">
    {closedTransactions.length} transactions fall in a closed FY and will be skipped.
  </div>
)}

// Only import open transactions
for (const tx of openTransactions) { ... }
```

---

## Security Considerations

- **No server-side FY enforcement exists.** The cutoff is client-side only. This is acceptable for MVP because:
  - All data is owner-scoped (Amplify `allow.owner()`) — users can only modify their own data
  - The cutoff is a UX guardrail, not a compliance hard-lock
  - A determined user could bypass it via API, but they'd only be modifying their own records
- **Future consideration:** If multi-user/accountant roles are added (Phase 4), FY locking should be enforced server-side via a Lambda resolver or AppSync pipeline resolver that checks the date against cutoff rules before allowing mutations.

---

## Out of Scope

- Server-side FY enforcement (future: when multi-user roles ship)
- FY configuration (always Apr 1 – Mar 31 for NZ; no user override)
- Cutoff date configuration (always May 15; no user override)
- FY filtering on invoice create/edit (invoices are locked by status, not FY)
- Year-over-year comparison charts (separate backlog item under Advanced Reporting)
