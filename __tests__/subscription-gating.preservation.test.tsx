/**
 * Preservation Property Tests — Subscription Feature Gating
 *
 * Property 2: Preservation — Higher Tiers and Fallback Retain Full Access
 *
 * These tests capture the BASELINE behavior on UNFIXED code. They must PASS
 * on the current code and continue to PASS after the fix is applied, ensuring
 * no regressions for BUSINESS, BUSINESS_PRO, TRIALING, and null-plan users.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mutable subscription state for per-test configuration
let mockSubscriptionPlan: string | null = 'BUSINESS';
let mockSubscriptionStatus: string | null = 'ACTIVE';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

// Mock useAuth
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', firstName: 'Test' },
    loading: false,
    needsCompanyProfile: false,
    signOut: jest.fn(),
  }),
}));

// Mock useTheme
jest.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

// Mock NotificationBell
jest.mock('@/components/NotificationBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell">Bell</div>,
}));

// Mock TrialBanner
jest.mock('@/components/TrialBanner', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock UsageMeter
jest.mock('@/components/UsageMeter', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock usage helpers
jest.mock('@/lib/usage', () => ({
  getInvoiceCount: jest.fn().mockResolvedValue(0),
  getClientCount: jest.fn().mockResolvedValue(0),
  getEffectiveOcrCount: jest.fn().mockReturnValue(0),
  getBillingPeriodStart: jest.fn().mockReturnValue('2025-01-01'),
  checkLimit: jest.requireActual('@/lib/usage').checkLimit,
}));

// Mock Amplify generateClient — uses mutable subscription state
jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      CompanyProfile: {
        list: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: [{
              subscriptionPlan: mockSubscriptionPlan,
              subscriptionStatus: mockSubscriptionStatus,
              trialEndDate: mockSubscriptionStatus === 'TRIALING' ? '2025-02-15' : null,
              subscriptionCurrentPeriodEnd: null,
              subscriptionInterval: null,
              ocrUsageCount: 0,
              ocrUsageResetDate: null,
            }],
          })
        ),
      },
    },
  }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import AppLayout from '@/components/AppLayout';
import { act } from '@testing-library/react';
import {
  canAccess,
  PLAN_FEATURES,
  PLAN_LIMITS,
  getPlanLimits,
  isSubscriptionActive,
} from '@/lib/subscription';
import type { PlanTier, Feature } from '@/lib/subscription';
import { checkLimit } from '@/lib/usage';

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_NAV_LABELS = [
  'Dashboard',
  'Invoices',
  'Recurring',
  'Clients',
  'Expenses',
  'Reports',
  'Settings',
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Render AppLayout and wait for subscription state to load */
async function renderAppLayout() {
  await act(async () => {
    render(
      <AppLayout>
        <div data-testid="page-content">Page content</div>
      </AppLayout>
    );
  });
  // Wait for async subscription load
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

/** Get all visible nav link labels from the rendered AppLayout */
function getVisibleNavLabels(): string[] {
  const nav = screen.getAllByRole('link');
  const navLabels = nav
    .map((el) => el.textContent?.trim() || '')
    .filter((label) => ALL_NAV_LABELS.includes(label));
  // Deduplicate (desktop + mobile may render same links)
  return [...new Set(navLabels)];
}

// ── fast-check arbitraries ─────────────────────────────────────────────────

const nonStarterPlanArb = fc.constantFrom<PlanTier>('BUSINESS', 'BUSINESS_PRO');
const allPlanArb = fc.constantFrom<PlanTier>('STARTER', 'BUSINESS', 'BUSINESS_PRO');
const resourceArb = fc.constantFrom<'invoices' | 'clients' | 'ocr'>('invoices', 'clients', 'ocr');
const countArb = fc.integer({ min: 0, max: 100 });

// ── Test Suite 1: Nav Visibility for Higher Tiers ──────────────────────────

describe('Preservation: Higher Tiers See All Nav Links', () => {
  afterEach(() => {
    // Reset mocks between tests
    mockSubscriptionPlan = 'BUSINESS';
    mockSubscriptionStatus = 'ACTIVE';
  });

  /**
   * BUSINESS user sees all 7 nav links.
   * **Validates: Requirements 3.1**
   */
  it('BUSINESS user sees all 7 nav links', async () => {
    mockSubscriptionPlan = 'BUSINESS';
    mockSubscriptionStatus = 'ACTIVE';

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    for (const label of ALL_NAV_LABELS) {
      expect(visibleLabels).toContain(label);
    }
    expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
  });

  /**
   * BUSINESS_PRO user sees all 7 nav links.
   * **Validates: Requirements 3.1**
   */
  it('BUSINESS_PRO user sees all 7 nav links', async () => {
    mockSubscriptionPlan = 'BUSINESS_PRO';
    mockSubscriptionStatus = 'ACTIVE';

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    for (const label of ALL_NAV_LABELS) {
      expect(visibleLabels).toContain(label);
    }
    expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
  });

  /**
   * TRIALING user (treated as BUSINESS_PRO) sees all 7 nav links.
   * **Validates: Requirements 3.2**
   */
  it('TRIALING user sees all 7 nav links', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'TRIALING';

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    for (const label of ALL_NAV_LABELS) {
      expect(visibleLabels).toContain(label);
    }
    expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
  });

  /**
   * User with null plan/null status sees all 7 nav links (fallback).
   * **Validates: Requirements 3.3**
   */
  it('null plan/null status user sees all 7 nav links (fallback)', async () => {
    mockSubscriptionPlan = null;
    mockSubscriptionStatus = null;

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    for (const label of ALL_NAV_LABELS) {
      expect(visibleLabels).toContain(label);
    }
    expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
  });
});

// ── Test Suite 2: Property-Based — Non-STARTER Plans Full Access ───────────

describe('Preservation PBT: Non-STARTER plans and TRIALING retain full nav access', () => {
  afterEach(() => {
    mockSubscriptionPlan = 'BUSINESS';
    mockSubscriptionStatus = 'ACTIVE';
  });

  /**
   * Property: For all non-STARTER plan tiers (BUSINESS, BUSINESS_PRO) with
   * ACTIVE status, all 7 nav links are visible.
   * **Validates: Requirements 3.1**
   */
  it('property: non-STARTER active plans see all nav links', async () => {
    await fc.assert(
      fc.asyncProperty(nonStarterPlanArb, async (plan) => {
        mockSubscriptionPlan = plan;
        mockSubscriptionStatus = 'ACTIVE';

        await renderAppLayout();

        const visibleLabels = getVisibleNavLabels();
        for (const label of ALL_NAV_LABELS) {
          expect(visibleLabels).toContain(label);
        }
        expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For TRIALING status (any underlying plan), user is treated as
   * BUSINESS_PRO and sees all 7 nav links.
   * **Validates: Requirements 3.2**
   */
  it('property: TRIALING status sees all nav links regardless of underlying plan', async () => {
    await fc.assert(
      fc.asyncProperty(allPlanArb, async (plan) => {
        mockSubscriptionPlan = plan;
        mockSubscriptionStatus = 'TRIALING';

        await renderAppLayout();

        const visibleLabels = getVisibleNavLabels();
        for (const label of ALL_NAV_LABELS) {
          expect(visibleLabels).toContain(label);
        }
        expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: For null plan (no subscription data), all nav links are visible
   * as fallback behavior.
   * **Validates: Requirements 3.3**
   */
  it('property: null plan shows all nav links as fallback', async () => {
    mockSubscriptionPlan = null;
    mockSubscriptionStatus = null;

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    for (const label of ALL_NAV_LABELS) {
      expect(visibleLabels).toContain(label);
    }
    expect(visibleLabels).toHaveLength(ALL_NAV_LABELS.length);
  });
});

// ── Test Suite 3: canAccess() and PLAN_FEATURES Preservation ───────────────

describe('Preservation: canAccess() and PLAN_FEATURES work for non-route feature checks', () => {
  /**
   * canAccess('STARTER', 'invoices') returns true — STARTER has invoice access.
   * canAccess('STARTER', 'clients') returns true — STARTER has client data access
   * (Clients page route is also accessible to STARTER for invoice creation).
   * **Validates: Requirements 3.5**
   */
  it('canAccess() returns correct values for STARTER features', () => {
    expect(canAccess('STARTER', 'invoices')).toBe(true);
    expect(canAccess('STARTER', 'clients')).toBe(true);
    expect(canAccess('STARTER', 'client_portal')).toBe(true);
    // STARTER does NOT have these features
    expect(canAccess('STARTER', 'recurring')).toBe(false);
    expect(canAccess('STARTER', 'expenses')).toBe(false);
    expect(canAccess('STARTER', 'reports_full')).toBe(false);
  });

  /**
   * Property: For all plan tiers, canAccess() correctly reflects PLAN_FEATURES.
   * **Validates: Requirements 3.4**
   */
  it('property: canAccess() matches PLAN_FEATURES for all plans and features', () => {
    const allFeatures: Feature[] = [
      'invoices', 'clients', 'templates_all', 'templates_custom',
      'client_portal', 'recurring', 'auto_reminders', 'expenses',
      'receipt_ocr', 'email_ingest', 'reports_full', 'reports_export',
      'ai_insights_basic', 'ai_insights_full', 'multi_user',
    ];
    const featureArb = fc.constantFrom(...allFeatures);

    fc.assert(
      fc.property(allPlanArb, featureArb, (plan, feature) => {
        const expected = PLAN_FEATURES[plan].has(feature);
        expect(canAccess(plan, feature)).toBe(expected);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * canAccess(null, feature) returns false for all features.
   */
  it('canAccess(null, feature) returns false for all features', () => {
    expect(canAccess(null, 'invoices')).toBe(false);
    expect(canAccess(null, 'clients')).toBe(false);
    expect(canAccess(null, 'expenses')).toBe(false);
  });

  /**
   * PLAN_FEATURES sets are unchanged — verify key entries exist.
   */
  it('PLAN_FEATURES contains expected feature sets', () => {
    expect(PLAN_FEATURES.STARTER.has('invoices')).toBe(true);
    expect(PLAN_FEATURES.STARTER.has('clients')).toBe(true);
    expect(PLAN_FEATURES.STARTER.size).toBe(3);

    expect(PLAN_FEATURES.BUSINESS.has('expenses')).toBe(true);
    expect(PLAN_FEATURES.BUSINESS.has('recurring')).toBe(true);
    expect(PLAN_FEATURES.BUSINESS.has('reports_full')).toBe(true);

    expect(PLAN_FEATURES.BUSINESS_PRO.has('multi_user')).toBe(true);
    expect(PLAN_FEATURES.BUSINESS_PRO.has('reports_export')).toBe(true);
    expect(PLAN_FEATURES.BUSINESS_PRO.has('ai_insights_full')).toBe(true);
  });
});

// ── Test Suite 4: checkLimit() / Numeric Limits Preservation ───────────────

describe('Preservation: checkLimit() numeric limits unaffected by route gating', () => {
  /**
   * checkLimit() returns correct limits for all plan tiers.
   * **Validates: Requirements 3.4**
   */
  it('checkLimit() returns correct invoice limits per plan', () => {
    // STARTER: 10 invoices/month
    const starterInvoice = checkLimit('invoices', 5, 'STARTER');
    expect(starterInvoice.allowed).toBe(true);
    expect(starterInvoice.max).toBe(10);

    const starterAtLimit = checkLimit('invoices', 10, 'STARTER');
    expect(starterAtLimit.allowed).toBe(false);
    expect(starterAtLimit.max).toBe(10);

    // BUSINESS: unlimited
    const businessInvoice = checkLimit('invoices', 999, 'BUSINESS');
    expect(businessInvoice.allowed).toBe(true);
    expect(businessInvoice.max).toBe(-1);
  });

  it('checkLimit() returns correct client limits per plan', () => {
    // STARTER: 5 clients
    const starterClient = checkLimit('clients', 3, 'STARTER');
    expect(starterClient.allowed).toBe(true);
    expect(starterClient.max).toBe(5);

    const starterAtLimit = checkLimit('clients', 5, 'STARTER');
    expect(starterAtLimit.allowed).toBe(false);
    expect(starterAtLimit.max).toBe(5);

    // BUSINESS: unlimited
    const businessClient = checkLimit('clients', 999, 'BUSINESS');
    expect(businessClient.allowed).toBe(true);
    expect(businessClient.max).toBe(-1);
  });

  it('checkLimit() returns correct OCR limits per plan', () => {
    // STARTER: 0 OCR
    const starterOcr = checkLimit('ocr', 0, 'STARTER');
    expect(starterOcr.allowed).toBe(false);
    expect(starterOcr.max).toBe(0);

    // BUSINESS: 30/month
    const businessOcr = checkLimit('ocr', 15, 'BUSINESS');
    expect(businessOcr.allowed).toBe(true);
    expect(businessOcr.max).toBe(30);

    // BUSINESS_PRO: unlimited
    const proOcr = checkLimit('ocr', 999, 'BUSINESS_PRO');
    expect(proOcr.allowed).toBe(true);
    expect(proOcr.max).toBe(-1);
  });

  /**
   * Property: For all plan tiers and resources, checkLimit() returns consistent
   * results based on PLAN_LIMITS — unaffected by any route gating changes.
   * **Validates: Requirements 3.4**
   */
  it('property: checkLimit() is consistent with PLAN_LIMITS for all plans and resources', () => {
    fc.assert(
      fc.property(allPlanArb, resourceArb, countArb, (plan, resource, count) => {
        const result = checkLimit(resource, count, plan);
        const limits = getPlanLimits(plan);

        let expectedMax: number;
        switch (resource) {
          case 'invoices': expectedMax = limits.maxInvoicesPerMonth; break;
          case 'clients': expectedMax = limits.maxClients; break;
          case 'ocr': expectedMax = limits.maxOcrPerMonth; break;
        }

        expect(result.max).toBe(expectedMax);
        expect(result.current).toBe(count);

        if (expectedMax === -1) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(count < expectedMax);
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * checkLimit(null) returns zero limits.
   */
  it('checkLimit() with null plan returns zero limits', () => {
    const result = checkLimit('invoices', 0, null);
    expect(result.allowed).toBe(false);
    expect(result.max).toBe(0);
  });
});

// ── Test Suite 5: STARTER on /invoices sees normal content ─────────────────

describe('Preservation: STARTER user on /invoices sees normal page content', () => {
  afterEach(() => {
    mockSubscriptionPlan = 'BUSINESS';
    mockSubscriptionStatus = 'ACTIVE';
  });

  /**
   * STARTER user on /invoices sees the Invoices nav link and page content
   * renders normally (not gated).
   * **Validates: Requirements 3.5**
   */
  it('STARTER user sees Invoices in nav and page content renders', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'ACTIVE';

    await renderAppLayout();

    const visibleLabels = getVisibleNavLabels();
    expect(visibleLabels).toContain('Invoices');
    expect(visibleLabels).toContain('Dashboard');
    expect(visibleLabels).toContain('Clients');
    expect(visibleLabels).toContain('Settings');

    // Page content should render normally (not replaced by UpgradePrompt)
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  /**
   * isSubscriptionActive() continues to work correctly for all statuses.
   */
  it('isSubscriptionActive() returns correct values', () => {
    expect(isSubscriptionActive('TRIALING')).toBe(true);
    expect(isSubscriptionActive('ACTIVE')).toBe(true);
    expect(isSubscriptionActive('PAST_DUE')).toBe(true);
    expect(isSubscriptionActive('CANCELLED')).toBe(false);
    expect(isSubscriptionActive('EXPIRED')).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
