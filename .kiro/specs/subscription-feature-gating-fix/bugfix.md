# Bugfix Requirements Document

## Introduction

The app lacks proper feature visibility gating based on subscription tier. Currently, the navigation filtering in `AppLayout` only hides a few links (Recurring, Expenses, Reports) for STARTER users via `requiredFeature` + `canAccess()`, but this is incomplete and inconsistent:

- Clients is always visible to STARTER users (no `requiredFeature` set on the nav link), even though the user's intent is that STARTER should only see invoices
- There is no page-level gating — a STARTER user can navigate directly to `/expenses` or `/reports` via URL and see the full page content
- The gating logic is scattered: `PLAN_FEATURES` sets in `lib/subscription.ts`, `requiredFeature` on individual nav links in `AppLayout`, and no centralized visibility config

The desired behavior: for the minimum subscription (STARTER), only invoices-related pages (Dashboard, Invoices, Settings) should be visible. All other features (Clients, Recurring, Expenses, Reports) should be hidden from navigation and gated at the page level. The solution should be configurable — a single config map that controls which features are visible per tier.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user is on the STARTER plan THEN the system only hides Recurring, Expenses, and Reports from navigation but still shows Clients, Dashboard, Invoices, and Settings — it does not properly restrict STARTER to invoices-only visibility

1.2 WHEN a user is on the STARTER plan and navigates directly to a gated feature URL (e.g. `/expenses`, `/reports`, `/clients`) THEN the system renders the full page content without any access restriction or upgrade prompt, because feature gating only exists at the nav-link filtering level in AppLayout

1.3 WHEN a developer needs to change which features are visible per plan tier THEN they must modify multiple files — the `PLAN_FEATURES` set in `lib/subscription.ts`, the `requiredFeature` property on individual nav links in `AppLayout`, and potentially add page-level checks — there is no single configurable source of truth for feature visibility

### Expected Behavior (Correct)

2.1 WHEN a user is on the STARTER plan THEN the system SHALL show only Dashboard, Invoices, and Settings in the navigation — Clients, Recurring, Expenses, and Reports navigation links SHALL be hidden, driven by a centralized feature-visibility configuration

2.2 WHEN a user is on the STARTER plan and navigates directly to a gated feature URL (e.g. `/expenses`, `/reports`, `/clients`) THEN the system SHALL display an UpgradePrompt component instead of the page content, informing the user which plan is required to access that feature

2.3 WHEN a developer needs to change which features are visible per plan tier THEN they SHALL only need to update a single centralized configuration (e.g. a `PLAN_VISIBLE_ROUTES` map in `lib/subscription.ts`) that defines which routes/nav items are accessible per tier — no changes to AppLayout nav link definitions or individual page files should be needed for visibility changes

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is on the BUSINESS or BUSINESS_PRO plan THEN the system SHALL CONTINUE TO show all navigation links (Dashboard, Invoices, Recurring, Clients, Expenses, Reports, Settings) and allow full access to all pages

3.2 WHEN a user is trialing THEN the system SHALL CONTINUE TO treat them as BUSINESS_PRO tier with full feature visibility and access

3.3 WHEN a user has no subscription data (new user, no profile) THEN the system SHALL CONTINUE TO show all navigation links as a fallback

3.4 WHEN a user is on any plan THEN the system SHALL CONTINUE TO enforce numeric usage limits (invoice count, client count, OCR scans) via `checkLimit()` and `LimitReachedPrompt` as they do today

3.5 WHEN a user is on the STARTER plan THEN the system SHALL CONTINUE TO allow creating and managing invoices up to the plan limit (10/month) without any upgrade prompt on the invoices pages
