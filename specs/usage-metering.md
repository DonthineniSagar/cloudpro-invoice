# Usage Metering & Limit Enforcement

**Status:** Ready for development
**Phase:** 4 — SaaS & Monetisation
**Priority:** High (blocks monetisation — without enforcement, limits are decorative)
**Depends on:** `specs/stripe-subscriptions.md` (subscription fields, `lib/subscription.ts`, webhook)
**Last Updated:** 2026-04-16

---

## Overview

The subscription system (shipped) defines plan limits — Starter gets 10 invoices/month, 5 clients, 0 OCR scans; Business gets unlimited invoices/clients, 30 OCR/month; Business Pro gets unlimited everything. Feature gating via `canAccess()` controls which features are *visible*, but numeric limits are not enforced. A Starter user can currently create unlimited invoices.

This spec adds four things:

1. **Usage counting** — derive current usage from existing data (invoices, clients) plus a new OCR counter field.
2. **Limit checks** — block create operations when a limit is reached, with an upgrade prompt.
3. **Usage display** — show "7/10 invoices this month" in the UI.
4. **Stripe Customer Portal** — self-serve billing management (change plan, update payment method, cancel).

### Design Principle: Derive, Don't Duplicate

Invoice and client counts are derived by querying existing models (filter by `createdAt` / count total). No separate metering table. OCR is the exception — it has no dedicated model, so we add a simple counter + reset date to `CompanyProfile`.

### Out of Scope

- Server-side enforcement (Lambda/AppSync resolver-level blocks) — frontend-only for MVP
- Multi-user seat counting
- Usage analytics dashboard / historical usage charts
- Overage billing (hard block, not soft limit)
- Usage-based Stripe metering API integration

---

## Plan Limits Reference (from `lib/subscription.ts`)

| Resource | Starter | Business | Business Pro |
|---|---|---|---|
| Invoices per billing period | 10 | Unlimited (-1) | Unlimited (-1) |
| Total clients | 5 | Unlimited (-1) | Unlimited (-1) |
| OCR scans per month | 0 | 30 | Unlimited (-1) |
| Users | 1 | 1 | 2 |

---

## 1. User Stories & Acceptance Criteria

### Story 1: Usage Counting Utility

**As a** developer,
**I want** a shared utility that returns current usage counts for the authenticated user,
**So that** limit checks and usage display are consistent across the app.

**Acceptance Criteria:**

- [ ] New file: `lib/usage.ts` exports:
  - `getInvoiceCount(client: AmplifyClient, periodStart: string): Promise<number>` — counts invoices with `createdAt >= periodStart`. `periodStart` is the current billing period start (derived from `subscriptionCurrentPeriodEnd` minus 1 month/year, or current calendar month start as fallback).
  - `getClientCount(client: AmplifyClient): Promise<number>` — counts total clients owned by the user.
  - `getOcrUsage(profile: CompanyProfile): { used: number; resetDate: string }` — reads `ocrUsageCount` and `ocrUsageResetDate` from CompanyProfile.
  - `getBillingPeriodStart(profile: CompanyProfile): string` — returns ISO date string for the start of the current billing period.
  - `checkLimit(resource: 'invoices' | 'clients' | 'ocr', currentCount: number, plan: PlanTier | null): LimitStatus` — pure function, returns `{ allowed: boolean; current: number; max: number; label: string }`.
- [ ] `getBillingPeriodStart` logic:
  - If `subscriptionCurrentPeriodEnd` exists: subtract the subscription interval (1 month for MONTHLY, 1 year for ANNUAL) to get period start.
  - Fallback (no subscription or trialing): use the 1st of the current calendar month at 00:00:00 UTC+12 (NZST).
  - This ensures invoice counting aligns with the Stripe billing cycle.
- [ ] `getInvoiceCount` queries `Invoice.list()` with a `createdAt >= periodStart` filter. Counts all statuses (DRAFT, SENT, PAID, OVERDUE) — CANCELLED invoices are excluded (they shouldn't count against the limit).
- [ ] `getClientCount` queries `Client.list()` and returns `data.length`. No date filter — clients are a total cap, not per-period.
- [ ] All functions are async where they query data, pure where they don't. No side effects.
- [ ] Export `LimitStatus` type for consumers.

```typescript
// lib/usage.ts — key types
export interface LimitStatus {
  allowed: boolean;  // true if under limit
  current: number;   // current usage count
  max: number;       // plan limit (-1 = unlimited)
  label: string;     // e.g. "7 / 10" or "7 / ∞"
}
```

---

### Story 2: OCR Usage Counter on CompanyProfile

**As the** system,
**I want** to track OCR scan usage on CompanyProfile,
**So that** Business plan users are limited to 30 OCR scans per month.

**Acceptance Criteria:**

- [ ] Add two new fields to `CompanyProfile` in `amplify/data/resource.ts`:
  ```typescript
  ocrUsageCount: a.integer().default(0),
  ocrUsageResetDate: a.datetime(),  // ISO date — when the counter was last reset
  ```
- [ ] `ocrUsageCount` is incremented by 1 each time a receipt is successfully scanned (after `processReceipt` mutation returns a successful result).
- [ ] `ocrUsageResetDate` stores the date when the counter was last reset to 0. If `ocrUsageResetDate` is in a previous calendar month (or null), the counter is treated as 0 and the reset date is updated to the 1st of the current month on next increment.
- [ ] Reset logic is lazy — no cron job. When checking OCR usage, if `ocrUsageResetDate` is before the 1st of the current month, treat `ocrUsageCount` as 0. When incrementing, if the reset date is stale, set count to 1 and update the reset date.
- [ ] The increment happens client-side after a successful OCR call (in `app/expenses/new/page.tsx` inside `handleScanReceipt`). This is acceptable for MVP since all data is owner-scoped.
- [ ] No new model needed — these are additive nullable fields on CompanyProfile.

---

### Story 3: Invoice Limit Enforcement

**As a** Starter plan user,
**I want to** be blocked from creating more than 10 invoices per billing period,
**So that** I understand my plan limits and can upgrade if needed.

**Acceptance Criteria:**

- [ ] On `app/invoices/new/page.tsx`, after loading data (inside the existing `useEffect`), check the invoice count for the current billing period.
- [ ] If the user's invoice count >= their plan limit (`maxInvoicesPerMonth`), replace the invoice form with a `LimitReachedPrompt` component (not `UpgradePrompt` — this is a different UX; the user *has* the feature but hit the numeric cap).
- [ ] `LimitReachedPrompt` shows:
  - Icon: `AlertTriangle` (from lucide-react)
  - Heading: "Invoice limit reached"
  - Message: "You've created {current} of {max} invoices this month on the {planName} plan. Upgrade to create unlimited invoices."
  - Primary CTA: "Upgrade Plan" → links to `/#pricing`
  - Secondary CTA: "Back to Invoices" → links to `/invoices`
- [ ] If the plan limit is -1 (unlimited), skip the check entirely.
- [ ] The check runs on page load, not on form submit. This prevents the user from filling out a form only to be blocked at the end.
- [ ] While the usage count is loading, show a skeleton/spinner (don't flash the form then replace it).
- [ ] CANCELLED invoices are excluded from the count.
- [ ] Dark mode supported.

---

### Story 4: Client Limit Enforcement

**As a** Starter plan user,
**I want to** be blocked from creating more than 5 clients,
**So that** I understand my plan limits and can upgrade if needed.

**Acceptance Criteria:**

- [ ] On `app/clients/new/page.tsx`, after loading, check the total client count.
- [ ] If client count >= `maxClients`, replace the form with `LimitReachedPrompt`:
  - Heading: "Client limit reached"
  - Message: "You have {current} of {max} clients on the {planName} plan. Upgrade for unlimited clients."
  - Primary CTA: "Upgrade Plan" → `/#pricing`
  - Secondary CTA: "Back to Clients" → `/clients`
- [ ] If limit is -1 (unlimited), skip the check.
- [ ] Check runs on page load, not on submit.
- [ ] Dark mode supported.

---

### Story 5: OCR Limit Enforcement

**As a** Business plan user,
**I want to** be blocked from scanning more than 30 receipts per month,
**So that** I understand my plan limits and can upgrade for unlimited scans.

**Acceptance Criteria:**

- [ ] On `app/expenses/new/page.tsx`, the receipt scan button is disabled when OCR usage >= `maxOcrPerMonth`.
- [ ] This is NOT a full-page block (unlike invoices/clients) — the user can still create expenses manually. Only the OCR scan action is blocked.
- [ ] When the scan button is disabled, show a tooltip or inline message: "You've used {current} of {max} receipt scans this month. Upgrade for unlimited scans."
- [ ] If `maxOcrPerMonth` is 0 (Starter plan), the scan button should not appear at all (Starter doesn't have the `expenses` feature, so they won't reach this page — but as a safety net, hide the scan UI if OCR limit is 0).
- [ ] If `maxOcrPerMonth` is -1 (unlimited), no check needed.
- [ ] After a successful scan, increment `ocrUsageCount` on CompanyProfile and update local state so the UI reflects the new count immediately.
- [ ] The increment uses `generateClient().models.CompanyProfile.update()` with the profile ID.
- [ ] If the increment fails (network error), log the error but don't block the user — the scan already succeeded. The count will be slightly off but self-corrects on next month reset.

---

### Story 6: Usage Display Component

**As a** user on any plan,
**I want to** see my current usage vs limits,
**So that** I know how close I am to my plan limits.

**Acceptance Criteria:**

- [ ] New component: `components/UsageMeter.tsx`
- [ ] Shows a compact usage indicator for each limited resource on the user's plan.
- [ ] Display format: "{current} / {max}" with a small progress bar.
  - Green when < 70% used
  - Amber when 70–90% used
  - Red when >= 90% used
  - For unlimited (-1): show "∞" with no progress bar
- [ ] The component is rendered inside `AppLayout.tsx`, below the nav in the sidebar area (desktop) or as a collapsible section in the mobile menu.
- [ ] Only shows resources that have a finite limit on the user's plan:
  - Starter: shows invoices (X/10) and clients (X/5)
  - Business: shows OCR scans (X/30)
  - Business Pro: shows nothing (all unlimited) — or a simple "Unlimited" badge
  - Trialing: shows nothing (Business Pro access)
- [ ] Clicking the usage meter links to `/#pricing` (upgrade prompt).
- [ ] The usage data is fetched once when AppLayout mounts (alongside the existing subscription state load) and cached in component state. No polling.
- [ ] Dark mode supported.
- [ ] Responsive: on mobile, the usage meter appears in the mobile nav dropdown.

**Component Props:**
```typescript
interface UsageMeterProps {
  invoiceCount: number;
  clientCount: number;
  ocrCount: number;
  plan: PlanTier | null;
  dark: boolean;
}
```

---

### Story 7: Stripe Customer Portal

**As a** subscribed user,
**I want to** manage my subscription (change plan, update payment method, view invoices, cancel),
**So that** I have self-serve control over my billing.

**Acceptance Criteria:**

- [ ] New API route: `app/api/stripe/portal/route.ts`
- [ ] `POST /api/stripe/portal` accepts `{ customerId: string }` in the request body.
- [ ] The route creates a Stripe Billing Portal session using `stripe.billingPortal.sessions.create()`:
  ```typescript
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings/company`,
  });
  ```
- [ ] Returns `{ url: string }` — the portal session URL.
- [ ] Validates that `customerId` is provided and is a non-empty string.
- [ ] Does NOT validate that the customerId belongs to the authenticated user (Stripe handles this — the portal session is scoped to the customer). However, the frontend only sends the `stripeCustomerId` from the user's own CompanyProfile.
- [ ] The portal URL is opened in the same tab (redirect, not popup).
- [ ] A "Manage Billing" button is added to `app/settings/company/page.tsx`:
  - Only visible when `stripeCustomerId` exists on CompanyProfile.
  - Clicking it calls `POST /api/stripe/portal` and redirects to the returned URL.
  - Button text: "Manage Billing" with a `CreditCard` icon (lucide-react).
  - Disabled state while the portal session is being created (show "Loading...").
- [ ] If the API call fails, show a toast error: "Failed to open billing portal. Please try again."
- [ ] Users without a Stripe customer ID (no subscription yet) see "Choose a Plan" linking to `/#pricing` instead.

**Stripe Portal Configuration:**

The Stripe Customer Portal must be configured in the Stripe Dashboard (Settings → Customer Portal) to allow:
- Plan changes (upgrade/downgrade between Starter, Business, Business Pro)
- Payment method updates
- Invoice history viewing
- Subscription cancellation

This is a one-time Stripe Dashboard configuration, not code. Document it in the spec for the developer to set up.

---

## 2. Data Model Changes

### CompanyProfile — New Fields

Add to `amplify/data/resource.ts` inside the `CompanyProfile` model:

```typescript
// OCR usage tracking
ocrUsageCount: a.integer().default(0),
ocrUsageResetDate: a.datetime(),
```

No new models. No migration needed — additive nullable fields with defaults.

### Authorization

No auth rule changes needed. These fields are on CompanyProfile which already uses `allow.owner()`. The owner (authenticated user) reads and writes their own profile. The OCR increment is a client-side `CompanyProfile.update()` call by the owner.

---

## 3. New Files

| File | Purpose |
|---|---|
| `lib/usage.ts` | Usage counting utility — `getInvoiceCount()`, `getClientCount()`, `getOcrUsage()`, `checkLimit()`, `getBillingPeriodStart()` |
| `components/UsageMeter.tsx` | Compact usage indicator (progress bars for limited resources) |
| `components/LimitReachedPrompt.tsx` | Full-page block when a numeric limit is hit (different from `UpgradePrompt` which is for feature gating) |
| `app/api/stripe/portal/route.ts` | Creates Stripe Billing Portal session |

### Modified Files

| File | Changes |
|---|---|
| `amplify/data/resource.ts` | Add `ocrUsageCount`, `ocrUsageResetDate` to CompanyProfile |
| `app/invoices/new/page.tsx` | Add invoice limit check on load; show `LimitReachedPrompt` if over limit |
| `app/clients/new/page.tsx` | Add client limit check on load; show `LimitReachedPrompt` if over limit |
| `app/expenses/new/page.tsx` | Add OCR limit check; disable scan button when over limit; increment counter after scan |
| `components/AppLayout.tsx` | Add `UsageMeter` component; fetch usage counts alongside subscription state |
| `app/settings/company/page.tsx` | Add "Manage Billing" button (Stripe Customer Portal) |

---

## 4. Implementation Details

### `lib/usage.ts` — Billing Period Calculation

```typescript
export function getBillingPeriodStart(
  subscriptionCurrentPeriodEnd: string | null,
  subscriptionInterval: 'MONTHLY' | 'ANNUAL' | null
): string {
  if (subscriptionCurrentPeriodEnd && subscriptionInterval) {
    const periodEnd = new Date(subscriptionCurrentPeriodEnd);
    const periodStart = new Date(periodEnd);
    if (subscriptionInterval === 'ANNUAL') {
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    } else {
      periodStart.setMonth(periodStart.getMonth() - 1);
    }
    return periodStart.toISOString();
  }

  // Fallback: 1st of current month (NZST = UTC+12)
  const now = new Date();
  // Approximate NZST by adding 12 hours, then take the date
  const nzNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const firstOfMonth = new Date(Date.UTC(nzNow.getUTCFullYear(), nzNow.getUTCMonth(), 1));
  return firstOfMonth.toISOString();
}
```

### `lib/usage.ts` — Invoice Count Query

```typescript
import { type Schema } from '@/amplify/data/resource';

export async function getInvoiceCount(
  client: ReturnType<typeof generateClient<Schema>>,
  periodStart: string
): Promise<number> {
  // Query all invoices created on or after periodStart
  // Exclude CANCELLED invoices
  const { data: invoices } = await client.models.Invoice.list({
    filter: {
      createdAt: { ge: periodStart },
      status: { ne: 'CANCELLED' },
    },
  });
  return invoices?.length ?? 0;
}
```

### `lib/usage.ts` — OCR Lazy Reset Logic

```typescript
export function getEffectiveOcrCount(
  ocrUsageCount: number | null,
  ocrUsageResetDate: string | null
): number {
  if (!ocrUsageResetDate) return 0; // never used OCR
  
  const resetDate = new Date(ocrUsageResetDate);
  const now = new Date();
  
  // If reset date is in a previous calendar month, count is effectively 0
  if (
    resetDate.getUTCFullYear() < now.getUTCFullYear() ||
    (resetDate.getUTCFullYear() === now.getUTCFullYear() &&
     resetDate.getUTCMonth() < now.getUTCMonth())
  ) {
    return 0;
  }
  
  return ocrUsageCount ?? 0;
}

export async function incrementOcrUsage(
  client: ReturnType<typeof generateClient<Schema>>,
  profileId: string,
  currentCount: number,
  resetDate: string | null
): Promise<{ newCount: number; newResetDate: string }> {
  const effectiveCount = getEffectiveOcrCount(currentCount, resetDate);
  const isStaleReset = effectiveCount === 0 && currentCount !== 0;
  
  const newCount = effectiveCount + 1;
  const newResetDate = isStaleReset || !resetDate
    ? new Date().toISOString()
    : resetDate;
  
  await client.models.CompanyProfile.update({
    id: profileId,
    ocrUsageCount: newCount,
    ocrUsageResetDate: newResetDate,
  });
  
  return { newCount, newResetDate };
}
```

### `components/LimitReachedPrompt.tsx`

```typescript
interface LimitReachedPromptProps {
  resource: string;       // "Invoice" | "Client"
  current: number;
  max: number;
  planName: string;       // "Starter" | "Business"
  backHref: string;       // "/invoices" | "/clients"
  backLabel: string;      // "Back to Invoices" | "Back to Clients"
  upgradeMessage: string; // "Upgrade to create unlimited invoices."
}
```

Visually similar to `UpgradePrompt` but with:
- `AlertTriangle` icon instead of `Lock`
- Usage count displayed: "{current} / {max}"
- Amber/warning colour scheme instead of lock/grey

### `app/api/stripe/portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json();

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid customerId' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings/company`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe portal error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### AppLayout Integration

In `components/AppLayout.tsx`, extend the existing `loadSubscription` function to also fetch usage counts:

```typescript
// Inside the existing useEffect that loads subscription state:
const [usage, setUsage] = useState({ invoices: 0, clients: 0, ocr: 0, loading: true });

// After loading profile:
const periodStart = getBillingPeriodStart(
  profile.subscriptionCurrentPeriodEnd,
  profile.subscriptionInterval as 'MONTHLY' | 'ANNUAL' | null
);
const [invoiceCount, clientCount] = await Promise.all([
  getInvoiceCount(client, periodStart),
  getClientCount(client),
]);
const ocrCount = getEffectiveOcrCount(
  profile.ocrUsageCount,
  profile.ocrUsageResetDate
);
setUsage({ invoices: invoiceCount, clients: clientCount, ocr: ocrCount, loading: false });
```

The `UsageMeter` is rendered below the nav links (desktop) and inside the mobile menu dropdown.

---

## 5. Edge Cases & Error Scenarios

### Billing Period Edge Cases

| Scenario | Handling |
|---|---|
| User has no subscription (null `subscriptionCurrentPeriodEnd`) | Fall back to 1st of current calendar month for invoice counting. |
| User is trialing | Use trial start date as period start, or fall back to calendar month. Trialing users have Business Pro limits (unlimited), so the count is informational only. |
| User upgrades mid-period (Starter → Business) | Limit check uses the new plan's limits immediately. Existing invoice count carries over but is now under a higher/unlimited cap. No reset needed. |
| User downgrades mid-period (Business → Starter) | Limit check uses Starter limits immediately. If they already have 15 invoices this period, they're over the limit and can't create more until next period. Existing invoices are not deleted. |
| Subscription period end is in the past (webhook delay) | `getBillingPeriodStart` still calculates correctly — it subtracts interval from the stored period end. The count may be slightly generous (counting from an earlier start) but this is acceptable. |

### OCR Counter Edge Cases

| Scenario | Handling |
|---|---|
| `ocrUsageResetDate` is null (new user, never scanned) | Treat count as 0. On first scan, set reset date to now. |
| `ocrUsageResetDate` is 2+ months ago | Lazy reset: treat count as 0, update reset date on next increment. |
| OCR increment fails (network error after successful scan) | Log error, don't block user. Count will be 1 behind. Self-corrects on month rollover. |
| User scans receipt at 11:59 PM on month boundary | Use UTC month comparison. Slight timezone edge case is acceptable for MVP. |
| Two tabs open, both scan simultaneously | Both increments go through. Count may be off by 1 in rare race condition. Acceptable for MVP — not a billing-critical counter. |

### Limit Enforcement Edge Cases

| Scenario | Handling |
|---|---|
| User opens `/invoices/new` in two tabs, both under limit | Both tabs show the form. First submit succeeds and increments count. Second submit also succeeds (no server-side enforcement for MVP). The count will be 11/10 — over limit. Next page load will block. |
| User creates invoice via recurring invoice auto-generation | Recurring invoices are system-generated (Lambda). They are NOT counted against the user's limit for MVP. This is a known gap — server-side enforcement (future) would need to handle this. |
| Plan is null (no subscription, no trial) | `getPlanLimits(null)` returns all zeros. All create pages show `LimitReachedPrompt` with "0 / 0" — effectively blocked. Message should say "Choose a plan to start creating invoices." |
| CANCELLED invoices | Excluded from count. User can cancel an invoice to "free up" a slot. This is intentional — cancelled invoices are void. |
| User deletes a client | Client count decreases. If they were at 5/5, deleting one brings them to 4/5 and they can create again. |

### Stripe Customer Portal Edge Cases

| Scenario | Handling |
|---|---|
| `stripeCustomerId` is null (no subscription) | "Manage Billing" button is hidden. Show "Choose a Plan" link instead. |
| Stripe API error when creating portal session | Return 500. Frontend shows toast: "Failed to open billing portal. Please try again." |
| User cancels subscription via portal | Stripe fires `customer.subscription.deleted` webhook → sets `subscriptionStatus: 'CANCELLED'`. On return to app, user sees cancelled banner and limits drop to zero. |
| User changes plan via portal | Stripe fires `customer.subscription.updated` webhook → updates `subscriptionPlan`. On return to app, new limits apply immediately. |
| Portal session expires (24h) | User clicks "Manage Billing" again to get a fresh session. |

---

## 6. Impact on Existing Features

### `app/invoices/new/page.tsx`

- The existing `useEffect` that loads clients and company profile is extended to also count invoices for the current billing period.
- A new loading state (`usageLoading`) gates the form render.
- If over limit, the form is replaced with `LimitReachedPrompt`. The rest of the page (AppLayout wrapper, back link) remains.
- No changes to the form submission logic itself.

### `app/clients/new/page.tsx`

- Similar pattern: load client count on mount, gate form with `LimitReachedPrompt`.
- The existing `handleSubmit` is unchanged.

### `app/expenses/new/page.tsx`

- The receipt scan section gains an OCR limit check.
- The scan button (`handleReceiptSelect` → `handleScanReceipt`) is wrapped with a limit check.
- After a successful scan, `incrementOcrUsage` is called.
- The expense form itself is NOT blocked — only the OCR scan action. Users can always create expenses manually (expenses are gated by `canAccess('expenses')`, not by a numeric limit).

### `components/AppLayout.tsx`

- The existing `loadSubscription` useEffect is extended to also fetch usage counts.
- `UsageMeter` component is added to the nav area.
- The subscription state interface gains usage fields.
- No breaking changes to existing AppLayout consumers.

### `app/settings/company/page.tsx`

- A "Manage Billing" button is added to the existing settings page.
- Positioned in a new "Billing" section below the existing company details form.
- No changes to existing form fields or save logic.

### `amplify/data/resource.ts`

- Two new nullable fields on CompanyProfile: `ocrUsageCount` (integer, default 0) and `ocrUsageResetDate` (datetime).
- No changes to authorization rules.
- No impact on existing fields or other models.

### Recurring Invoice Generation

- Recurring invoices generated by the Lambda function are NOT counted against the user's invoice limit in this spec. This is a known gap.
- Future: the `generate-recurring` Lambda should check limits before creating invoices and skip generation if the user is over their limit (with a notification).

---

## 7. Component Hierarchy

```
AppLayout
├── TrialBanner (existing)
├── Nav
│   ├── NavLinks (existing, plan-filtered)
│   └── UsageMeter (NEW — shows usage bars for limited resources)
└── <main>
     ├── /invoices/new → checks invoice limit → LimitReachedPrompt OR InvoiceForm
     ├── /clients/new  → checks client limit  → LimitReachedPrompt OR ClientForm
     └── /expenses/new → OCR limit check on scan button (inline, not full-page block)
```

---

## 8. `LimitReachedPrompt` vs `UpgradePrompt`

These are two distinct components for two distinct situations:

| | `UpgradePrompt` (existing) | `LimitReachedPrompt` (new) |
|---|---|---|
| When shown | User's plan doesn't include the feature at all | User's plan includes the feature but they've hit the numeric cap |
| Icon | Lock | AlertTriangle |
| Colour | Grey/neutral | Amber/warning |
| Example | Starter user visits `/expenses` | Starter user visits `/invoices/new` after creating 10 invoices |
| Message | "This feature is available on Business and above" | "You've created 10/10 invoices this month" |
| CTA | "View Plans & Upgrade" | "Upgrade Plan" + "Back to {resource}" |

---

## 9. Stripe Customer Portal Setup (Dashboard Configuration)

The developer must configure the Stripe Customer Portal in the Stripe Dashboard before the "Manage Billing" button will work:

1. Go to Stripe Dashboard → Settings → Customer Portal
2. Enable the following:
   - **Subscriptions**: Allow customers to switch plans (select all 3 products: Starter, Business, Business Pro)
   - **Payment methods**: Allow customers to update payment methods
   - **Invoices**: Allow customers to view invoice history
   - **Cancellations**: Allow customers to cancel (with optional cancellation reason survey)
3. Set the default return URL to `https://app.ledgr.co.nz/settings/company` (or the production domain)
4. Save configuration

No code changes needed for this — it's a one-time Stripe Dashboard setup.

---

## 10. Testing Checklist

### Manual Testing

**Invoice Limits (Starter plan):**
- [ ] Create 9 invoices → visit `/invoices/new` → form shows, usage displays "9 / 10"
- [ ] Create 10th invoice → visit `/invoices/new` → form shows (still at 9 when page loads, 10th is being created)
- [ ] After 10 invoices exist → visit `/invoices/new` → `LimitReachedPrompt` shown, form hidden
- [ ] Cancel one invoice → visit `/invoices/new` → form shows again (9/10)
- [ ] Upgrade to Business → visit `/invoices/new` → form shows, no limit check

**Client Limits (Starter plan):**
- [ ] Create 4 clients → visit `/clients/new` → form shows
- [ ] Create 5th client → visit `/clients/new` after → `LimitReachedPrompt` shown
- [ ] Delete a client → visit `/clients/new` → form shows again

**OCR Limits (Business plan):**
- [ ] Scan 29 receipts → scan button enabled, shows "29 / 30"
- [ ] Scan 30th receipt → scan button disabled, inline message shown
- [ ] Wait for month rollover (or manually set `ocrUsageResetDate` to previous month) → scan button re-enabled, count shows 0

**Usage Meter (AppLayout):**
- [ ] Starter plan: shows invoice and client usage bars
- [ ] Business plan: shows OCR usage bar only
- [ ] Business Pro / Trialing: no usage bars shown (or "Unlimited" badge)
- [ ] Usage bars change colour at 70% and 90% thresholds
- [ ] Mobile: usage meter appears in mobile nav dropdown

**Stripe Customer Portal:**
- [ ] User with active subscription → "Manage Billing" button visible on settings page
- [ ] Click "Manage Billing" → redirected to Stripe portal
- [ ] Change plan in portal → return to app → new plan limits apply
- [ ] Cancel subscription in portal → return to app → cancelled banner shown
- [ ] User with no subscription → "Choose a Plan" link shown instead of "Manage Billing"

**Dark Mode:**
- [ ] `LimitReachedPrompt` renders correctly in dark mode
- [ ] `UsageMeter` renders correctly in dark mode
- [ ] "Manage Billing" button styled correctly in dark mode

### Unit Tests

- [ ] `lib/usage.ts` — `getBillingPeriodStart()` with monthly subscription, annual subscription, null subscription
- [ ] `lib/usage.ts` — `checkLimit()` for each resource × plan combination
- [ ] `lib/usage.ts` — `getEffectiveOcrCount()` with current month reset date, previous month reset date, null reset date
- [ ] `lib/usage.ts` — `checkLimit()` with -1 (unlimited) returns `allowed: true`
- [ ] `lib/usage.ts` — `checkLimit()` with null plan returns `allowed: false`

---

## 11. Future Enhancements (Out of Scope)

- **Server-side enforcement**: Add AppSync resolver or Lambda middleware that rejects create mutations when over limit. Prevents bypass via API calls or race conditions.
- **Usage history**: Track monthly usage over time for analytics ("you created 8 invoices last month, 12 this month").
- **Soft limits with grace**: Allow 1-2 invoices over the limit with a warning, then hard block.
- **Stripe Usage Records**: Report usage to Stripe for usage-based billing tiers.
- **Recurring invoice limit awareness**: `generate-recurring` Lambda checks limits before creating.
- **Email notifications**: "You're approaching your invoice limit (8/10)" email at 80% usage.
