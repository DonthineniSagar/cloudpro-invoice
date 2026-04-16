# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** — STARTER Users Can See and Access Gated Routes
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — STARTER plan with gated routes `/clients`, `/expenses`, `/reports`, `/invoices/recurring`
  - Create test file `__tests__/subscription-gating.exploration.test.ts`
  - Mock `useAuth`, `useTheme`, `usePathname`, and Amplify `generateClient` to simulate a STARTER-plan user
  - Test 1: Render `AppLayout` with STARTER plan, assert that "Clients" nav link is NOT visible (currently it IS visible because no `requiredFeature` is set — this will FAIL, confirming the bug)
  - Test 2: For each gated route (`/clients`, `/expenses`, `/reports`, `/invoices/recurring`), assert that `canAccessRoute('STARTER', route)` returns `false` (function doesn't exist yet — will FAIL)
  - Test 3: Assert that `canAccessRoute('STARTER', '/dashboard')` returns `true` and `canAccessRoute('STARTER', '/invoices')` returns `true` (allowed routes)
  - The test assertions match the Expected Behavior from design: gated routes hidden from nav AND show UpgradePrompt for STARTER
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found: STARTER user sees Clients in nav, no `canAccessRoute()` function exists, no page-level gating
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Higher Tiers and Fallback Retain Full Access
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `__tests__/subscription-gating.preservation.test.ts`
  - Observe on UNFIXED code: BUSINESS user sees all 7 nav links (Dashboard, Invoices, Recurring, Clients, Expenses, Reports, Settings)
  - Observe on UNFIXED code: BUSINESS_PRO user sees all 7 nav links
  - Observe on UNFIXED code: TRIALING user (treated as BUSINESS_PRO) sees all 7 nav links
  - Observe on UNFIXED code: User with null plan/null status sees all 7 nav links (fallback)
  - Write property-based tests: for all non-STARTER plan tiers (BUSINESS, BUSINESS_PRO) and for TRIALING status, all nav links are visible and all routes are accessible
  - Write property-based test: for null plan (no subscription), all nav links are visible as fallback
  - Write preservation test: `canAccess()` and `PLAN_FEATURES` continue to work for non-route feature checks (e.g., `canAccess('STARTER', 'invoices')` still returns `true`)
  - Write preservation test: `checkLimit()` / `LimitReachedPrompt` numeric limits are unaffected by route gating changes
  - Write preservation test: STARTER user on `/invoices` sees normal invoice page content (not gated)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix subscription feature gating

  - [x] 3.1 Add `PLAN_VISIBLE_ROUTES` config and `canAccessRoute()` to `lib/subscription.ts`
    - Add `PLAN_VISIBLE_ROUTES: Record<PlanTier, string[]>` mapping each tier to allowed route prefixes
    - STARTER: `['/dashboard', '/invoices', '/settings']` — note `/invoices` covers list/create/edit but NOT `/invoices/recurring`
    - BUSINESS and BUSINESS_PRO: all routes (full access)
    - Add `canAccessRoute(plan: PlanTier | null, pathname: string): boolean`
    - Returns `true` if plan is `null` (fallback for no subscription data)
    - For STARTER: checks pathname starts with an allowed prefix AND does not start with `/invoices/recurring`
    - For BUSINESS/BUSINESS_PRO: always returns `true`
    - Export both `PLAN_VISIBLE_ROUTES` and `canAccessRoute`
    - _Bug_Condition: isBugCondition(input) where effectivePlan == 'STARTER' AND pathname IN ['/clients', '/expenses', '/reports', '/invoices/recurring']_
    - _Expected_Behavior: canAccessRoute('STARTER', gatedRoute) returns false; canAccessRoute('STARTER', allowedRoute) returns true_
    - _Preservation: canAccess() and PLAN_FEATURES unchanged; null plan returns true; BUSINESS/BUSINESS_PRO always return true_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Update `AppLayout.tsx` nav filtering to use `canAccessRoute()`
    - Import `canAccessRoute` from `@/lib/subscription`
    - Replace the `requiredFeature`-based nav filtering logic with `canAccessRoute(effectivePlan, link.href)`
    - Keep fallback logic: if no subscription data (`!sub.plan && !sub.status`), show all links
    - Remove `requiredFeature` from `NavLink` interface and `ALL_NAV_LINKS` entries — no longer needed
    - The `navLinks` filter becomes: `ALL_NAV_LINKS.filter(link => { if (!sub.plan && !sub.status) return true; if (!isSubscriptionActive(sub.status)) return true; return canAccessRoute(effectivePlan, link.href); })`
    - _Bug_Condition: STARTER user sees Clients in nav because no requiredFeature is set on that link_
    - _Expected_Behavior: Nav filtering driven by PLAN_VISIBLE_ROUTES — Clients hidden for STARTER_
    - _Preservation: BUSINESS/BUSINESS_PRO/TRIALING/null-plan users see all nav links unchanged_
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.3 Add page-level gating to `app/clients/page.tsx`, `app/expenses/page.tsx`, `app/reports/page.tsx`, `app/invoices/recurring/page.tsx`
    - Each page loads subscription state (plan + status) and calls `canAccessRoute()` with the current pathname
    - When `canAccessRoute()` returns `false`, render an UpgradePrompt component inside AppLayout instead of page content
    - UpgradePrompt shows the feature name and minimum required plan ("Business")
    - Consider creating a reusable `FeatureGate` wrapper component in `components/FeatureGate.tsx` to avoid duplicating gating logic
    - STARTER user on `/invoices` is NOT gated (invoices is an allowed route)
    - _Bug_Condition: STARTER user navigates directly to /expenses via URL and sees full page content_
    - _Expected_Behavior: STARTER user sees UpgradePrompt instead of page content for gated routes_
    - _Preservation: BUSINESS/BUSINESS_PRO/TRIALING users see full page content on all routes_
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.5_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — STARTER Users Cannot See or Access Gated Routes
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** — Higher Tiers and Fallback Retain Full Access
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite to verify no regressions
  - Run `npm run build` to verify the project compiles
  - Ensure all exploration tests pass (bug is fixed)
  - Ensure all preservation tests pass (no regressions)
  - Ensure `canAccessRoute()` unit tests pass
  - Ask the user if questions arise
