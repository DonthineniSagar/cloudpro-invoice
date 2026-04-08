# Stripe Subscription & Feature Gating

**Status:** Ready for development
**Phase:** 4 — SaaS & Monetisation
**Priority:** High
**Last Updated:** 2026-04-15

---

## Overview

Add Stripe-powered subscription billing to Ledgr. Users sign up with a 14-day free trial (full Business Pro access, no card required). After trial expiry, they select a plan via a pricing page and complete checkout through Stripe's hosted Checkout page. Subscription state is stored on `CompanyProfile` and a shared feature-gating utility controls what each plan can access throughout the app.

### Out of Scope (this spec)

- Usage metering (invoice count, OCR count enforcement)
- Stripe Customer Portal (manage billing, cancel)
- Partial payments / prorated refunds
- Multi-user seat management
- Trial email reminders (day 7, 12, 14)
- Admin ability to extend trials or toggle features
- Read-only mode after trial expiry (future spec)

---

## Stripe Product & Price IDs (Test Mode, NZD)

| Plan | Monthly Price ID | Annual Price ID | Stripe Product ID |
|---|---|---|---|
| Starter ($9/mo, $90/yr) | `price_1TJmsCRRCRfUSdl91ZT8ytWM` | `price_1TJmsnRRCRfUSdl9gOIVZBBZ` | `prod_UINcOjzo9FGPIc` |
| Business ($29/mo, $290/yr) | `price_1TJmsCRRCRfUSdl9kyVgb8Da` | `price_1TJmsnRRCRfUSdl9qQtOEzXl` | `prod_UINcDnUQuxSwga` |
| Business Pro ($59/mo, $590/yr) | `price_1TJmsnRRCRfUSdl9mHR8Mf6s` | `price_1TJmsnRRCRfUSdl99pkQutB8` | `prod_UINcPSlDVttHpn` |

Annual pricing = 2 months free (~17% discount).

---

## Feature Matrix

| Feature | Starter | Business | Business Pro |
|---|---|---|---|
| Invoices | 10/mo | Unlimited | Unlimited |
| Clients | 5 | Unlimited | Unlimited |
| Templates | 1 (Modern) | All 3 | All 3 + custom |
| Client Portal | ✅ | ✅ | ✅ |
| Recurring Invoices | ✕ | ✅ | ✅ |
| Reminders | Manual only | Auto | Auto |
| Expenses | ✕ | ✅ | ✅ |
| Receipt OCR | ✕ | 30/mo | Unlimited |
| Email Ingest | ✕ | ✕ | ✅ |
| Reports | Invoice only | Full | Full + CSV export |
| Users | 1 | 1 | Up to 5 |
| AI Insights | ✕ | Basic | Full |
| Support | Email | Email | Priority |


---

## 1. User Stories & Acceptance Criteria

### Story 1: Pricing Page

**As a** visitor or logged-in user,
**I want to** see a clear comparison of plans with pricing,
**So that** I can choose the right plan for my business.

**Acceptance Criteria:**

- [ ] Pricing section on the landing page (`app/page.tsx`) is replaced with a full plan comparison grid (3 columns: Starter, Business, Business Pro).
- [ ] Monthly/Annual toggle switch. Default: Monthly. When toggled to Annual, prices update to show annual rate with "Save 17%" badge.
- [ ] Each plan card shows: plan name, monthly price (or annual price ÷ 12 with "billed annually" note), feature list with ✅/✕ indicators, and a CTA button.
- [ ] Business plan card is visually highlighted as "Most Popular" (border accent, badge).
- [ ] CTA button text:
  - Logged-out user: "Start Free Trial" → links to `/auth/signup`
  - Logged-in user with no subscription: "Start Free Trial" → initiates checkout
  - Logged-in user on a lower plan: "Upgrade" → initiates checkout
  - Logged-in user on the same plan: "Current Plan" (disabled)
  - Logged-in user on a higher plan: "Downgrade" → initiates checkout
- [ ] All prices displayed in NZD with `$` prefix and GST-inclusive note: "All prices in NZD, GST inclusive."
- [ ] Responsive: cards stack vertically on mobile (< 768px), 3-column grid on desktop.
- [ ] Dark mode supported.

---

### Story 2: Stripe Checkout Flow

**As a** logged-in user,
**I want to** select a plan and complete payment via Stripe,
**So that** my subscription is activated.

**Acceptance Criteria:**

- [ ] Clicking a plan CTA calls `POST /api/stripe/checkout` with `{ priceId, planName, interval }`.
- [ ] API route creates a Stripe Checkout Session with:
  - `mode: 'subscription'`
  - `customer_email` set to the user's Cognito email
  - `metadata.userId` set to the Cognito user ID
  - `metadata.companyProfileId` set to the user's CompanyProfile ID
  - `subscription_data.trial_period_days: 14` (only if user has never had a subscription)
  - `success_url: {origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: {origin}/pricing` (or `{origin}/#pricing` if on landing page)
  - `currency: 'nzd'`
- [ ] User is redirected to Stripe's hosted Checkout page.
- [ ] On success, user returns to `/settings/billing?session_id=...` which shows a success message.
- [ ] On cancel, user returns to the pricing page.

**API Route: `app/api/stripe/checkout/route.ts`**

```
POST /api/stripe/checkout
Headers: Authorization (Cognito session — validated via Amplify server-side)
Body: { priceId: string, planName: string, interval: 'monthly' | 'annual' }
Response: { url: string } (Stripe Checkout URL)
```

---

### Story 3: Subscription Status Stored in CompanyProfile

**As the** system,
**I want to** persist subscription state on the CompanyProfile model,
**So that** the app can gate features based on the user's plan.

**Acceptance Criteria:**

- [ ] New fields added to `CompanyProfile` in `amplify/data/resource.ts`:

```typescript
// Subscription fields
subscriptionPlan: a.enum(['STARTER', 'BUSINESS', 'BUSINESS_PRO']),
subscriptionStatus: a.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']),
subscriptionInterval: a.enum(['MONTHLY', 'ANNUAL']),
stripeCustomerId: a.string(),
stripeSubscriptionId: a.string(),
trialStartDate: a.datetime(),
trialEndDate: a.datetime(),
subscriptionCurrentPeriodEnd: a.datetime(),
```

- [ ] Default state for new users: `subscriptionPlan: null`, `subscriptionStatus: null` (no subscription yet).
- [ ] When a user signs up and has no CompanyProfile, they are treated as "no plan" — the pricing page is their entry point.
- [ ] Trial users: `subscriptionStatus: 'TRIALING'`, `subscriptionPlan: 'BUSINESS_PRO'`, `trialEndDate` set to 14 days from checkout.

---

### Story 4: Feature Gating Utility

**As a** developer,
**I want** a single shared utility to check plan-based feature access,
**So that** gating logic is consistent and centralised.

**Acceptance Criteria:**

- [ ] New file: `lib/subscription.ts` exports:
  - `type PlanTier = 'STARTER' | 'BUSINESS' | 'BUSINESS_PRO'`
  - `type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'`
  - `type Feature` — union of all gatable feature keys (see below)
  - `function canAccess(plan: PlanTier | null, feature: Feature): boolean`
  - `function getPlanLimits(plan: PlanTier | null): PlanLimits`
  - `function isSubscriptionActive(status: SubscriptionStatus | null): boolean`
  - `PLAN_FEATURES` constant — the full feature matrix as a typed object

- [ ] Feature keys:

```typescript
type Feature =
  | 'invoices'           // all plans (limit differs)
  | 'clients'            // all plans (limit differs)
  | 'templates_all'      // Business+
  | 'templates_custom'   // Business Pro only
  | 'client_portal'      // all plans
  | 'recurring'          // Business+
  | 'auto_reminders'     // Business+
  | 'expenses'           // Business+
  | 'receipt_ocr'        // Business+ (limit differs)
  | 'email_ingest'       // Business Pro only
  | 'reports_full'       // Business+
  | 'reports_export'     // Business Pro only
  | 'ai_insights_basic'  // Business+
  | 'ai_insights_full'   // Business Pro only
  | 'multi_user';        // Business Pro only
```

- [ ] `canAccess(null, anyFeature)` returns `false` (no plan = no access, except during trial).
- [ ] `isSubscriptionActive` returns `true` for `TRIALING`, `ACTIVE`, and `PAST_DUE` (grace period). Returns `false` for `CANCELLED` and `EXPIRED`.
- [ ] `PAST_DUE` users retain access (Stripe retries payment) but see a warning banner.
- [ ] Pure functions — no side effects, no API calls. Fully unit-testable.


---

### Story 5: Nav & UI Gating

**As a** user on a specific plan,
**I want** locked features to be hidden or show upgrade prompts,
**So that** I have a clean experience and know what's available on higher plans.

**Acceptance Criteria:**

- [ ] `AppLayout.tsx` nav links are filtered based on the user's plan:
  - Starter: hide "Recurring", "Expenses", "Reports" (show only Invoice-only reports link if needed)
  - Business: show all except email ingest settings
  - Business Pro: show everything
- [ ] Hidden nav items are not just visually hidden — the routes themselves should show an upgrade prompt if accessed directly via URL.
- [ ] Upgrade prompt component: `components/UpgradePrompt.tsx`
  - Shows: lock icon, feature name, "Available on {plan} and above", "Upgrade" button linking to pricing.
  - Used on pages the user's plan doesn't cover (e.g., Starter user navigates to `/expenses`).
- [ ] Trial users see all nav items (they have Business Pro access during trial).
- [ ] Trial countdown banner at the top of the app (inside `AppLayout`):
  - Shows: "You have X days left in your free trial. [Choose a plan]"
  - Yellow/amber background, dismissible per session but reappears on next login.
  - Shows only when `subscriptionStatus === 'TRIALING'`.
- [ ] Past-due banner: "Your payment failed. Please update your payment method." with link to Stripe Customer Portal (future) or contact email.

---

### Story 6: Stripe Webhook Handler

**As the** system,
**I want to** receive Stripe webhook events and update subscription state,
**So that** the app stays in sync with Stripe billing.

**Acceptance Criteria:**

- [ ] New API route: `app/api/stripe/webhook/route.ts`
- [ ] Verifies Stripe webhook signature using `STRIPE_WEBHOOK_SECRET` env var.
- [ ] Handles these events:

| Event | Action |
|---|---|
| `checkout.session.completed` | Look up CompanyProfile by `metadata.companyProfileId`. Set `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionPlan`, `subscriptionStatus`, `subscriptionInterval`. If trial, set `trialStartDate`/`trialEndDate`. |
| `customer.subscription.updated` | Update `subscriptionStatus`, `subscriptionPlan`, `subscriptionInterval`, `subscriptionCurrentPeriodEnd`. Handles upgrades, downgrades, and trial-to-paid conversion. |
| `customer.subscription.deleted` | Set `subscriptionStatus: 'CANCELLED'`, clear `stripeSubscriptionId`. |
| `invoice.payment_failed` | Set `subscriptionStatus: 'PAST_DUE'`. |
| `customer.subscription.trial_will_end` | (Log only for now — email reminders are out of scope.) |

- [ ] Webhook must respond with 200 status within 5 seconds. Do not perform slow operations synchronously.
- [ ] Idempotent: processing the same event twice must not corrupt data.
- [ ] Unknown events are ignored (return 200, no action).
- [ ] Webhook secret stored in `STRIPE_WEBHOOK_SECRET` env var (added to `.env.local` for dev, set in Amplify console for prod).

**Mapping Stripe plan to internal plan:**

```typescript
const PRODUCT_TO_PLAN: Record<string, PlanTier> = {
  'prod_UINcOjzo9FGPIc': 'STARTER',
  'prod_UINcDnUQuxSwga': 'BUSINESS',
  'prod_UINcPSlDVttHpn': 'BUSINESS_PRO',
};
```

---

### Story 7: Upgrade / Downgrade Flow

**As a** subscribed user,
**I want to** change my plan,
**So that** I can scale up or down as my business needs change.

**Acceptance Criteria:**

- [ ] Pricing page (or a `/settings/billing` page) shows the user's current plan with a "Change Plan" option.
- [ ] Selecting a different plan creates a new Stripe Checkout Session (Stripe handles proration automatically for subscription changes).
- [ ] For MVP, upgrades and downgrades both go through a new Checkout Session. Stripe's default proration behaviour applies.
- [ ] After checkout completes, the webhook updates `CompanyProfile` with the new plan.
- [ ] Downgrade takes effect at the end of the current billing period (Stripe default).
- [ ] Upgrade takes effect immediately (Stripe default).
- [ ] If user is on annual and switches to monthly (or vice versa), this is treated as a plan change through Checkout.

---

### Story 8: 14-Day Free Trial

**As a** new user,
**I want** a 14-day free trial with full access,
**So that** I can evaluate Ledgr before committing to a paid plan.

**Acceptance Criteria:**

- [ ] Trial is initiated via Stripe Checkout with `subscription_data.trial_period_days: 14`.
- [ ] No credit card required during trial (Stripe Checkout `payment_method_collection: 'if_required'` — card collected only if trial is not offered, or set to `'always'` if we want card upfront). **Decision: no card required** — use `payment_method_collection: 'if_required'`.
- [ ] During trial, user has full Business Pro access regardless of which plan they selected at checkout.
- [ ] `subscriptionStatus: 'TRIALING'` and `subscriptionPlan: 'BUSINESS_PRO'` during trial.
- [ ] `trialEndDate` is set and used by the trial countdown banner.
- [ ] When trial ends, Stripe fires `customer.subscription.updated` with `status: 'active'` (if card on file) or `customer.subscription.deleted` (if no card). Webhook handles both.
- [ ] After trial expiry with no payment method: `subscriptionStatus: 'EXPIRED'`. User sees "Trial expired" banner with CTA to choose a plan.
- [ ] Trial is one-time only. The checkout API checks if `trialStartDate` already exists on CompanyProfile — if so, `trial_period_days` is omitted.


---

## 2. Data Model Changes

### CompanyProfile — New Fields

Add to `amplify/data/resource.ts` inside the `CompanyProfile` model:

```typescript
// Subscription & billing
subscriptionPlan: a.enum(['STARTER', 'BUSINESS', 'BUSINESS_PRO']),
subscriptionStatus: a.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']),
subscriptionInterval: a.enum(['MONTHLY', 'ANNUAL']),
stripeCustomerId: a.string(),
stripeSubscriptionId: a.string(),
trialStartDate: a.datetime(),
trialEndDate: a.datetime(),
subscriptionCurrentPeriodEnd: a.datetime(),
```

No new models required. No migration needed — these are additive nullable fields on an existing model.

### Authorization Note

The webhook API route writes to CompanyProfile using the Amplify Data client with API key auth. The `CompanyProfile` model currently uses `allow.owner()` only. The webhook needs a way to update records it doesn't own.

**Solution:** Add a secondary authorization rule for API key with restricted field access:

```typescript
.authorization((allow) => [
  allow.owner(),
  allow.publicApiKey().to(['read', 'update']),  // webhook needs update access
])
```

**Security concern:** This opens CompanyProfile to API key updates. To mitigate:
- The webhook route validates the Stripe signature before any writes.
- The API key is not exposed to the browser (only used server-side in API routes).
- Long-term, move webhook processing to a Lambda function with IAM-based DynamoDB access (bypasses AppSync auth entirely). For MVP, API key auth is acceptable.

**Alternative (preferred if time allows):** Use AWS SDK v3 `DynamoDBClient` directly in the webhook route to bypass AppSync authorization entirely. This avoids loosening the AppSync auth rules. The webhook route runs server-side and can use IAM credentials from the Amplify environment.

---

## 3. New Files

| File | Purpose |
|---|---|
| `lib/subscription.ts` | Feature gating utility — plan matrix, `canAccess()`, `getPlanLimits()`, `isSubscriptionActive()` |
| `app/api/stripe/checkout/route.ts` | Creates Stripe Checkout Session |
| `app/api/stripe/webhook/route.ts` | Handles Stripe webhook events, updates CompanyProfile |
| `components/UpgradePrompt.tsx` | Reusable upgrade prompt for locked features |
| `components/TrialBanner.tsx` | Trial countdown banner (used in AppLayout) |
| `components/PlanBadge.tsx` | Small badge showing current plan (used in nav/settings) |

### Modified Files

| File | Changes |
|---|---|
| `amplify/data/resource.ts` | Add subscription fields to CompanyProfile, add enum types, update auth rules |
| `app/page.tsx` | Replace pricing placeholder section with full plan comparison grid |
| `components/AppLayout.tsx` | Add trial banner, filter nav links by plan, load subscription state |
| `lib/auth-context.tsx` | Optionally extend User type to include plan info (or use a separate subscription context) |
| `app/settings/company/page.tsx` | Show current plan info, link to billing/pricing |
| `.env.local` | Add `STRIPE_WEBHOOK_SECRET` |
| `package.json` | Add `stripe` dependency |

---

## 4. API Routes Detail

### `POST /api/stripe/checkout`

```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Auth: Validate Cognito session server-side using Amplify
// Extract userId and email from the session

// Request body:
interface CheckoutRequest {
  priceId: string;       // Stripe price ID
  planName: string;      // 'STARTER' | 'BUSINESS' | 'BUSINESS_PRO'
  interval: 'monthly' | 'annual';
}

// Logic:
// 1. Validate the priceId is one of our known price IDs (whitelist)
// 2. Look up CompanyProfile for the authenticated user
// 3. Determine if trial should be offered (trialStartDate === null)
// 4. Create Stripe Checkout Session
// 5. Return { url: session.url }

// Price ID whitelist (security — never trust client-provided price IDs blindly):
const VALID_PRICE_IDS = new Set([
  'price_1TJmsCRRCRfUSdl91ZT8ytWM', // Starter monthly
  'price_1TJmsnRRCRfUSdl9gOIVZBBZ', // Starter annual
  'price_1TJmsCRRCRfUSdl9kyVgb8Da', // Business monthly
  'price_1TJmsnRRCRfUSdl9qQtOEzXl', // Business annual
  'price_1TJmsnRRCRfUSdl9mHR8Mf6s', // Pro monthly
  'price_1TJmsnRRCRfUSdl99pkQutB8', // Pro annual
]);
```

### `POST /api/stripe/webhook`

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// CRITICAL: Disable Next.js body parsing for this route (Stripe needs raw body)
// Export: export const config = { api: { bodyParser: false } };
// In App Router, use request.text() to get raw body.

// Logic:
// 1. Read raw body from request
// 2. Verify Stripe signature using STRIPE_WEBHOOK_SECRET
// 3. Switch on event.type
// 4. For each handled event, update CompanyProfile via DynamoDB SDK
// 5. Return 200

// Product ID → Plan mapping:
const PRODUCT_TO_PLAN = {
  'prod_UINcOjzo9FGPIc': 'STARTER',
  'prod_UINcDnUQuxSwga': 'BUSINESS',
  'prod_UINcPSlDVttHpn': 'BUSINESS_PRO',
} as const;
```


---

## 5. Feature Gating Utility Detail

### `lib/subscription.ts`

```typescript
export type PlanTier = 'STARTER' | 'BUSINESS' | 'BUSINESS_PRO';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export type Feature =
  | 'invoices' | 'clients' | 'templates_all' | 'templates_custom'
  | 'client_portal' | 'recurring' | 'auto_reminders' | 'expenses'
  | 'receipt_ocr' | 'email_ingest' | 'reports_full' | 'reports_export'
  | 'ai_insights_basic' | 'ai_insights_full' | 'multi_user';

export interface PlanLimits {
  maxInvoicesPerMonth: number;   // -1 = unlimited
  maxClients: number;            // -1 = unlimited
  maxOcrPerMonth: number;        // -1 = unlimited, 0 = none
  maxUsers: number;
}

// Feature access matrix
const PLAN_FEATURES: Record<PlanTier, Set<Feature>> = {
  STARTER: new Set([
    'invoices', 'clients', 'client_portal',
  ]),
  BUSINESS: new Set([
    'invoices', 'clients', 'templates_all', 'client_portal',
    'recurring', 'auto_reminders', 'expenses', 'receipt_ocr',
    'reports_full', 'ai_insights_basic',
  ]),
  BUSINESS_PRO: new Set([
    'invoices', 'clients', 'templates_all', 'templates_custom',
    'client_portal', 'recurring', 'auto_reminders', 'expenses',
    'receipt_ocr', 'email_ingest', 'reports_full', 'reports_export',
    'ai_insights_basic', 'ai_insights_full', 'multi_user',
  ]),
};

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER:      { maxInvoicesPerMonth: 10, maxClients: 5,  maxOcrPerMonth: 0,  maxUsers: 1 },
  BUSINESS:     { maxInvoicesPerMonth: -1, maxClients: -1, maxOcrPerMonth: 30, maxUsers: 1 },
  BUSINESS_PRO: { maxInvoicesPerMonth: -1, maxClients: -1, maxOcrPerMonth: -1, maxUsers: 5 },
};

export function canAccess(plan: PlanTier | null, feature: Feature): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

export function getPlanLimits(plan: PlanTier | null): PlanLimits {
  if (!plan) return { maxInvoicesPerMonth: 0, maxClients: 0, maxOcrPerMonth: 0, maxUsers: 0 };
  return PLAN_LIMITS[plan];
}

export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  return status === 'TRIALING' || status === 'ACTIVE' || status === 'PAST_DUE';
}
```

### Usage in Components

```tsx
// In any page/component:
import { canAccess, isSubscriptionActive } from '@/lib/subscription';

// userPlan and subscriptionStatus come from CompanyProfile (loaded via context or prop)
if (!isSubscriptionActive(subscriptionStatus)) {
  return <TrialExpiredBanner />;
}

if (!canAccess(userPlan, 'expenses')) {
  return <UpgradePrompt feature="Expense Tracking" requiredPlan="Business" />;
}
```

---

## 6. Subscription Context (Optional Enhancement)

To avoid loading CompanyProfile subscription fields in every page, create a lightweight context:

```typescript
// lib/subscription-context.tsx
interface SubscriptionState {
  plan: PlanTier | null;
  status: SubscriptionStatus | null;
  trialEndDate: string | null;
  loading: boolean;
}
```

Load once in `AppLayout` (or root layout), provide via context. Pages consume via `useSubscription()` hook. This keeps subscription checks fast and avoids redundant API calls.

**For MVP:** Loading subscription state inside `AppLayout` and passing it down is sufficient. A dedicated context can be added later if needed.

---

## 7. Edge Cases & Error Scenarios

### Checkout Errors

| Scenario | Handling |
|---|---|
| User not authenticated when hitting checkout API | Return 401. Frontend should not show checkout CTA to unauthenticated users. |
| Invalid priceId sent to checkout API | Return 400 with error. Whitelist validation prevents this. |
| Stripe API error (network, rate limit) | Return 500 with generic error. Frontend shows toast: "Something went wrong. Please try again." |
| User already has an active subscription | Allow — Stripe handles subscription updates. The checkout creates a new subscription; the old one should be cancelled via webhook or Stripe's behaviour. **For MVP:** warn the user and proceed. |
| User closes Stripe Checkout without completing | No action needed. Session expires after 24 hours. User can try again. |

### Webhook Errors

| Scenario | Handling |
|---|---|
| Invalid webhook signature | Return 400. Do not process. Log the attempt. |
| CompanyProfile not found for userId in metadata | Log error, return 200 (acknowledge to Stripe to prevent retries). Create a monitoring alert for this. |
| Duplicate event (Stripe retries) | Idempotent: check if `stripeSubscriptionId` already matches. If state is already correct, skip update. |
| Unknown event type | Return 200, no action. |
| Webhook route times out | Keep processing minimal. If needed, queue work for async processing (future). |

### Feature Gating Edge Cases

| Scenario | Handling |
|---|---|
| User's CompanyProfile has no subscription fields (legacy user) | Treat as no plan. Show pricing page / upgrade prompt. |
| User is on trial and trial expires mid-session | Frontend checks `trialEndDate` on each page load. If expired, show trial-expired banner. Webhook will update status async. |
| User downgrades from Business Pro to Starter | Features are gated immediately on next page load. Data created on higher plan (e.g., expenses) remains accessible read-only but no new records can be created. |
| `PAST_DUE` status | User retains access but sees a warning banner. Stripe retries payment for up to 3 attempts over ~2 weeks. If all fail, Stripe cancels → webhook sets `CANCELLED`. |
| User has `CANCELLED` status but `subscriptionCurrentPeriodEnd` is in the future | User retains access until period end. `canAccess` should check both status and period end date. |

### Security Edge Cases

| Scenario | Handling |
|---|---|
| User tampers with plan value in frontend | Feature gating is enforced server-side for critical operations (future). For MVP, frontend gating is acceptable since all data is owner-scoped. |
| Webhook called without valid Stripe signature | Rejected with 400. Never process unsigned webhooks. |
| STRIPE_SECRET_KEY exposed | Key is server-side only (API routes). Never import in client components. Never prefix with `NEXT_PUBLIC_`. |
| Race condition: webhook and user both update CompanyProfile | Webhook writes specific subscription fields only. User edits (company name, etc.) don't overlap. No conflict. |


---

## 8. Impact on Existing Features

### Landing Page (`app/page.tsx`)

- The `#pricing` section currently shows a "contact for pricing" placeholder. Replace it entirely with the plan comparison grid.
- Update the FAQ to include pricing-related questions:
  - "How much does Ledgr cost?" → Brief plan summary with link to pricing section.
  - "Is there a free trial?" → "Yes, 14 days with full access. No credit card required."
  - "Can I change plans?" → "Yes, upgrade or downgrade anytime."
- Hero CTA "Start Free Trial" remains — links to `/auth/signup`.

### AppLayout (`components/AppLayout.tsx`)

- Nav links become plan-aware. The `navLinks` array is filtered based on the user's plan.
- Trial banner and past-due banner are added above `<main>`.
- Subscription state must be loaded here (fetch CompanyProfile on mount).

### Settings (`app/settings/`)

- Add a new settings sub-page or section: `/settings/billing` or add billing info to `/settings/company`.
- Shows: current plan name, status, next billing date, "Change Plan" button.
- For MVP, a simple section on the company settings page is sufficient.

### Auth Flow (`app/auth/signup/page.tsx`)

- After signup, user is redirected to dashboard (existing behaviour).
- Dashboard or AppLayout detects no subscription → shows a prompt to start trial or pick a plan.
- No changes to the signup page itself.

### Existing Data

- No data migration required. New fields are nullable and additive.
- Existing users (pre-subscription) will have `null` subscription fields.
- **Decision needed:** Should existing users be grandfathered with full access, or should they be prompted to choose a plan? **Recommendation:** Grandfather existing users as `BUSINESS` plan for 30 days, then require plan selection. Implementation: a one-time script or check based on `createdAt` date.

---

## 9. Environment Variables

Add to `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard → Webhooks)
```

Already present:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

For production (set in Amplify Console environment variables):
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 10. Dependencies

Add to `package.json`:

```
"stripe": "^17.0.0"
```

This is the official Stripe Node.js SDK. Used server-side only (API routes).

No client-side Stripe SDK needed for MVP (we redirect to Stripe's hosted Checkout page, not embedded).

---

## 11. Pricing Page Component Structure

```
app/page.tsx (landing page)
  └── #pricing section
       ├── Monthly/Annual toggle
       ├── PlanCard × 3 (Starter, Business, Business Pro)
       │    ├── Plan name + price
       │    ├── Feature list (✅/✕)
       │    └── CTA button
       └── "All prices in NZD, GST inclusive" note
```

Each `PlanCard` receives:
- `name`, `monthlyPrice`, `annualPrice`, `features[]`, `highlighted` (boolean for "Most Popular")
- `currentPlan` (user's current plan, if any)
- `onSelect(priceId)` callback

The pricing data is defined as a constant (not fetched from Stripe) for fast rendering:

```typescript
const PLANS = [
  {
    name: 'Starter',
    tier: 'STARTER' as PlanTier,
    monthlyPrice: 9,
    annualPrice: 90,
    monthlyPriceId: 'price_1TJmsCRRCRfUSdl91ZT8ytWM',
    annualPriceId: 'price_1TJmsnRRCRfUSdl9gOIVZBBZ',
    features: [
      { name: '10 invoices/month', included: true },
      { name: '5 clients', included: true },
      { name: '1 template', included: true },
      { name: 'Client portal', included: true },
      { name: 'Recurring invoices', included: false },
      { name: 'Expenses', included: false },
      { name: 'Auto reminders', included: false },
      { name: 'Reports', included: 'Invoice only' },
    ],
  },
  // ... Business, Business Pro
];
```

---

## 12. Testing Checklist

### Manual Testing (Stripe Test Mode)

- [ ] Visit pricing section on landing page — 3 plans visible, toggle works
- [ ] Click "Start Free Trial" as logged-out user → redirected to signup
- [ ] Sign up → land on dashboard → see trial prompt or auto-start trial
- [ ] Click plan CTA as logged-in user → redirected to Stripe Checkout
- [ ] Complete Stripe Checkout with test card `4242 4242 4242 4242` → return to app with success
- [ ] Verify CompanyProfile updated with subscription fields
- [ ] Verify nav links filtered correctly for Starter plan
- [ ] Verify upgrade from Starter to Business works
- [ ] Verify trial banner shows with correct countdown
- [ ] Verify past-due banner shows when payment fails (use Stripe test card `4000 0000 0000 0341`)
- [ ] Verify webhook processes `checkout.session.completed` correctly
- [ ] Verify webhook processes `customer.subscription.deleted` correctly
- [ ] Verify feature gating: Starter user cannot access `/expenses`
- [ ] Verify feature gating: Business user can access expenses but not email ingest
- [ ] Dark mode: all new UI elements render correctly

### Unit Tests

- [ ] `lib/subscription.ts` — test `canAccess()` for every plan × feature combination
- [ ] `lib/subscription.ts` — test `getPlanLimits()` for each plan
- [ ] `lib/subscription.ts` — test `isSubscriptionActive()` for each status
- [ ] `lib/subscription.ts` — test null/undefined plan handling

### Stripe Webhook Testing

Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 13. Implementation Order

1. **`lib/subscription.ts`** — Feature gating utility + unit tests. No dependencies.
2. **Schema changes** — Add subscription fields to CompanyProfile in `amplify/data/resource.ts`.
3. **`app/api/stripe/checkout/route.ts`** — Checkout session creation API.
4. **`app/api/stripe/webhook/route.ts`** — Webhook handler.
5. **Pricing section** — Update `app/page.tsx` with plan comparison grid.
6. **`components/UpgradePrompt.tsx`** + **`components/TrialBanner.tsx`** — UI components.
7. **`components/AppLayout.tsx`** — Integrate subscription state, nav gating, banners.
8. **Page-level gating** — Add upgrade prompts to gated pages (expenses, recurring, reports, etc.).
9. **Settings billing section** — Show current plan on company settings page.

---

## 14. Stripe Webhook Setup

### Local Development

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret from CLI output → set as `STRIPE_WEBHOOK_SECRET` in `.env.local`

### Production

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://{your-domain}/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy signing secret → set as `STRIPE_WEBHOOK_SECRET` in Amplify Console env vars

---

## 15. Open Questions / Decisions Needed

1. **Grandfathering existing users:** Should pre-subscription users get free access for a grace period? Recommendation: yes, 30 days as Business plan.
2. **Trial without card:** Confirmed no card required. This means some trials will expire without conversion. Acceptable for growth — reduces friction.
3. **Webhook data access:** Use AppSync API key auth (simpler) or direct DynamoDB SDK (more secure)? Recommendation: direct DynamoDB SDK to avoid loosening AppSync auth rules.
4. **Billing settings page:** Separate `/settings/billing` page or section within `/settings/company`? Recommendation: section within company settings for MVP, separate page later.
5. **Cancelled but period remaining:** Should `canAccess` check `subscriptionCurrentPeriodEnd` in addition to status? Recommendation: yes — `CANCELLED` with future period end = still active.
