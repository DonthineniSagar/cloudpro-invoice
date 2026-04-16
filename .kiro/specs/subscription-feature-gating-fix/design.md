# Subscription Feature Gating Fix — Bugfix Design

## Overview

The app's feature gating is incomplete and inconsistent. Navigation filtering in `AppLayout` uses per-link `requiredFeature` properties checked against `PLAN_FEATURES`, but this approach has three gaps: (1) Clients has no `requiredFeature` so it's always visible to STARTER users, (2) there is no page-level gating so users can bypass nav filtering via direct URL navigation, and (3) the gating logic is scattered across `PLAN_FEATURES`, individual nav link definitions, and page files with no single source of truth.

The fix introduces a centralized `PLAN_VISIBLE_ROUTES` configuration in `lib/subscription.ts` that maps each plan tier to its allowed route prefixes. `AppLayout` will use this config for nav filtering (replacing the per-link `requiredFeature` approach), and each gated page will check route access and render `UpgradePrompt` when unauthorized.

## Glossary

- **Bug_Condition (C)**: A STARTER-plan user viewing or navigating to a route that should be restricted to higher tiers (Clients, Recurring, Expenses, Reports)
- **Property (P)**: Gated routes are hidden from navigation and show `UpgradePrompt` at the page level for unauthorized tiers
- **Preservation**: BUSINESS/BUSINESS_PRO full access, trial-as-PRO behavior, no-subscription fallback showing all links, numeric usage limits via `checkLimit()`/`LimitReachedPrompt`
- **PLAN_VISIBLE_ROUTES**: New centralized config map in `lib/subscription.ts` — maps each `PlanTier` to an array of allowed route prefixes
- **canAccessRoute()**: New helper function in `lib/subscription.ts` that checks if a given pathname is allowed for a plan tier using `PLAN_VISIBLE_ROUTES`
- **effectivePlan**: The resolved plan tier after applying trial logic — TRIALING users are treated as BUSINESS_PRO

## Bug Details

### Fault Condition

The bug manifests when a STARTER-plan user can see or access routes that should be restricted to BUSINESS or higher tiers. The current gating has three failure modes: (1) the Clients nav link has no `requiredFeature` so it's never filtered, (2) no page-level check exists so direct URL navigation bypasses nav filtering entirely, and (3) adding/changing gated routes requires editing multiple files.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { pathname: string, plan: PlanTier | null, status: SubscriptionStatus | null }
  OUTPUT: boolean

  effectivePlan := IF input.status == 'TRIALING' THEN 'BUSINESS_PRO' ELSE input.plan
  
  RETURN effectivePlan == 'STARTER'
         AND input.pathname IN ['/clients', '/expenses', '/reports', '/invoices/recurring']
         AND (navLinkIsVisible(input.pathname) OR pageContentIsRendered(input.pathname))
END FUNCTION
```

### Examples

- STARTER user sees "Clients" in the nav sidebar → bug (should be hidden)
- STARTER user types `/expenses` in the browser URL bar → sees full Expenses page content → bug (should see UpgradePrompt)
- STARTER user types `/reports` in the browser URL bar → sees full Reports page content → bug (should see UpgradePrompt)
- STARTER user types `/clients/new` in the browser URL bar → sees client creation form → bug (should see UpgradePrompt)
- STARTER user sees Dashboard, Invoices, Settings in nav → correct (these are allowed)
- BUSINESS user sees all nav links and can access all pages → correct (no restriction)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- BUSINESS and BUSINESS_PRO users see all navigation links and can access all pages without restriction
- TRIALING users are treated as BUSINESS_PRO with full feature visibility and access
- Users with no subscription data (null plan, null status) see all navigation links as a fallback
- Numeric usage limits (invoice count, client count, OCR scans) continue to be enforced via `checkLimit()` and `LimitReachedPrompt` independently of route gating
- STARTER users can create and manage invoices up to the plan limit (10/month) without any upgrade prompt on invoices pages
- Mouse/keyboard navigation, mobile hamburger menu, theme toggle, sign out, and all other AppLayout functionality remain unchanged
- `PLAN_FEATURES` and `canAccess()` continue to work for non-route feature checks (e.g., template access, OCR eligibility)

**Scope:**
All inputs where the user is on BUSINESS, BUSINESS_PRO, TRIALING, or has no subscription data should be completely unaffected by this fix. The fix only changes behavior for STARTER-plan users accessing routes outside their tier's allowed set.

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Missing `requiredFeature` on Clients nav link**: In `AppLayout`, the Clients entry in `ALL_NAV_LINKS` has no `requiredFeature` property, so the filter logic `if (!link.requiredFeature) return true` always shows it regardless of plan tier

2. **No page-level gating mechanism**: Pages like `app/clients/page.tsx`, `app/expenses/page.tsx`, and `app/reports/page.tsx` render their full content unconditionally — there is no subscription check before rendering page content, so direct URL navigation bypasses nav filtering entirely

3. **Decentralized gating configuration**: Feature visibility is controlled by three separate mechanisms — `PLAN_FEATURES` sets in `lib/subscription.ts`, `requiredFeature` on individual nav links in `AppLayout`, and (missing) page-level checks — with no single config that maps plan tiers to allowed routes

4. **Route-level vs feature-level mismatch**: `PLAN_FEATURES` includes `'clients'` for STARTER (because STARTER users can have up to 5 clients for invoice purposes), but the intent is that the Clients management page should not be accessible to STARTER users. The feature-level `canAccess()` check conflates data-model access with route-level visibility.

## Correctness Properties

Property 1: Fault Condition — STARTER users cannot see or access gated routes

_For any_ input where the user is on the STARTER plan (not trialing) and the pathname matches a gated route (`/clients`, `/expenses`, `/reports`, `/invoices/recurring` or any sub-path), the system SHALL hide the corresponding navigation link AND render `UpgradePrompt` instead of page content when the route is accessed directly.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Higher tiers and fallback retain full access

_For any_ input where the user is on BUSINESS, BUSINESS_PRO, TRIALING, or has no subscription data, the system SHALL show all navigation links and render full page content for all routes, producing the same behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lib/subscription.ts`

**Changes**:
1. **Add `PLAN_VISIBLE_ROUTES` config**: A `Record<PlanTier, string[]>` mapping each tier to its allowed route prefixes. STARTER gets `['/dashboard', '/invoices', '/settings']` (note: `/invoices` covers the invoices list/create/edit but NOT `/invoices/recurring` which needs explicit exclusion). BUSINESS and BUSINESS_PRO get all routes.
2. **Add `canAccessRoute()` function**: Takes `(plan: PlanTier | null, pathname: string)` and returns `boolean`. Returns `true` if plan is null (fallback). For STARTER, checks that pathname starts with an allowed prefix AND does not start with `/invoices/recurring`. For BUSINESS/BUSINESS_PRO, always returns `true`.
3. **Export both** so AppLayout and page components can import them.

**File**: `components/AppLayout.tsx`

**Changes**:
1. **Replace `requiredFeature` nav filtering** with `canAccessRoute()` — the `navLinks` filter should call `canAccessRoute(effectivePlan, link.href)` instead of checking `link.requiredFeature` + `canAccess()`
2. **Keep the fallback logic** — if no subscription data (`!sub.plan && !sub.status`), show all links
3. **Remove `requiredFeature` from `NavLink` interface and `ALL_NAV_LINKS`** — no longer needed since route visibility is driven by `PLAN_VISIBLE_ROUTES`

**Files**: `app/clients/page.tsx`, `app/expenses/page.tsx`, `app/reports/page.tsx`, `app/invoices/recurring/page.tsx`

**Changes**:
1. **Add page-level gating**: Each page loads the user's subscription state (plan + status) and calls `canAccessRoute()` with the current pathname
2. **Render `UpgradePrompt`** when `canAccessRoute()` returns `false`, passing the feature name and minimum required plan ("Business")
3. **Wrap in AppLayout** as before — the UpgradePrompt renders inside AppLayout so the user still sees the app shell with navigation

**File**: `components/FeatureGate.tsx` (new, optional)

**Changes**:
1. **Create a reusable wrapper component** that encapsulates the subscription check + UpgradePrompt rendering, to avoid duplicating the gating logic in each page. Takes `featureName`, `requiredPlan`, and `children` props. Loads subscription state internally or accepts it as props.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render AppLayout and gated pages with a mocked STARTER subscription, then assert nav link visibility and page content rendering. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Clients Nav Visibility Test**: Render AppLayout with STARTER plan, assert "Clients" link is present in nav (will pass on unfixed code, demonstrating the bug — it should be hidden)
2. **Direct URL Access Test**: Render `/expenses` page with STARTER plan, assert full page content is rendered (will pass on unfixed code, demonstrating the bug — should show UpgradePrompt)
3. **Reports Direct Access Test**: Render `/reports` page with STARTER plan, assert full page content is rendered (will pass on unfixed code, demonstrating the bug)
4. **Recurring Direct Access Test**: Render `/invoices/recurring` page with STARTER plan, assert full page content is rendered (will pass on unfixed code, demonstrating the bug)

**Expected Counterexamples**:
- STARTER user can see Clients in navigation (no `requiredFeature` on the link)
- STARTER user can access `/expenses`, `/reports`, `/clients` via direct URL (no page-level gating)
- Root cause confirmed: missing route-level visibility config and page-level checks

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderWithFixedCode(input)
  ASSERT navLinkHidden(result, input.pathname)
  ASSERT pageShowsUpgradePrompt(result, input.pathname)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderOriginal(input) = renderFixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of plan tier, subscription status, and route to verify no regressions
- It catches edge cases like null plan + null status fallback, PAST_DUE status, EXPIRED status
- It provides strong guarantees that BUSINESS/BUSINESS_PRO/TRIALING behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code first for BUSINESS/BUSINESS_PRO/TRIALING users and no-subscription users, then write property-based tests capturing that behavior.

**Test Cases**:
1. **BUSINESS Full Access Preservation**: Verify BUSINESS users see all nav links and can access all pages — observe on unfixed code, then verify after fix
2. **BUSINESS_PRO Full Access Preservation**: Verify BUSINESS_PRO users see all nav links and can access all pages — observe on unfixed code, then verify after fix
3. **Trial Preservation**: Verify TRIALING users are treated as BUSINESS_PRO — observe on unfixed code, then verify after fix
4. **No Subscription Fallback Preservation**: Verify users with null plan/status see all nav links — observe on unfixed code, then verify after fix
5. **Numeric Limits Preservation**: Verify `checkLimit()` and `LimitReachedPrompt` continue to work independently of route gating

### Unit Tests

- Test `canAccessRoute()` with all plan tiers and all route prefixes
- Test `PLAN_VISIBLE_ROUTES` config contains correct routes per tier
- Test that STARTER is denied `/clients`, `/expenses`, `/reports`, `/invoices/recurring`
- Test that STARTER is allowed `/dashboard`, `/invoices`, `/invoices/new`, `/settings`
- Test that BUSINESS and BUSINESS_PRO are allowed all routes
- Test null plan returns true (fallback)

### Property-Based Tests

- Generate random (planTier, pathname) pairs and verify `canAccessRoute()` matches expected visibility rules
- Generate random subscription states (plan, status, trialEndDate) and verify nav link filtering produces correct visible links
- Generate random non-STARTER plans and verify all routes are accessible (preservation)

### Integration Tests

- Test full page render of `/clients` with STARTER plan shows UpgradePrompt inside AppLayout
- Test full page render of `/clients` with BUSINESS plan shows normal client list
- Test navigation filtering in AppLayout with STARTER plan hides Clients, Recurring, Expenses, Reports
- Test navigation filtering in AppLayout with BUSINESS plan shows all links
- Test that STARTER user on `/invoices` sees normal invoice page (not gated)
