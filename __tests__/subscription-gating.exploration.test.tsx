/**
 * Bug Condition Exploration Test — Subscription Feature Gating
 *
 * Property 1: Fault Condition — STARTER Users Can See and Access Gated Routes
 *
 * These tests encode the EXPECTED (correct) behavior. They are designed to
 * FAIL on unfixed code, confirming the bug exists. Once the fix is applied,
 * these same tests will PASS, validating the fix.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock next/navigation
const mockPathname = '/dashboard';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

// Mock useAuth — simulate a logged-in user
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', firstName: 'Test' },
    loading: false,
    needsCompanyProfile: false,
    signOut: jest.fn(),
  }),
}));

// Mock useTheme — light mode
jest.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

// Mock NotificationBell — avoid Amplify calls
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
}));

// Mock Amplify generateClient — return a STARTER plan CompanyProfile
jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      CompanyProfile: {
        list: jest.fn().mockResolvedValue({
          data: [{
            subscriptionPlan: 'STARTER',
            subscriptionStatus: 'ACTIVE',
            trialEndDate: null,
            subscriptionCurrentPeriodEnd: null,
            subscriptionInterval: null,
            ocrUsageCount: 0,
            ocrUsageResetDate: null,
          }],
        }),
      },
    },
  }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import AppLayout from '@/components/AppLayout';
import { act } from '@testing-library/react';

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('Bug Condition Exploration: STARTER Feature Gating', () => {
  /**
   * Test 1: STARTER plan SHOULD see "Clients" in navigation
   *
   * Clients is now allowed for STARTER users because they need client access
   * to create invoices. The 5-client limit is enforced by checkLimit().
   *
   * **Validates: Requirements 2.1**
   */
  it('should show "Clients" nav link for STARTER plan users', async () => {
    await act(async () => {
      render(
        <AppLayout>
          <div>Page content</div>
        </AppLayout>
      );
    });

    // Wait for subscription state to load (useEffect)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Clients should be visible for STARTER users (needed for invoice creation)
    const clientsLink = screen.queryByRole('link', { name: 'Clients' });
    expect(clientsLink).toBeInTheDocument();
  });

  /**
   * Test 2: canAccessRoute should deny STARTER users access to gated routes
   *
   * The canAccessRoute() function does not exist yet in lib/subscription.ts.
   * This test will FAIL because the import will throw — confirming the bug
   * that there is no centralized route-level gating mechanism.
   *
   * **Validates: Requirements 1.2, 1.3, 2.2**
   */
  it('should deny STARTER plan access to gated routes via canAccessRoute()', async () => {
    // This import will fail on unfixed code because canAccessRoute doesn't exist
    const { canAccessRoute } = await import('@/lib/subscription');

    const gatedRoutes = ['/expenses', '/reports', '/invoices/recurring'];

    for (const route of gatedRoutes) {
      expect(canAccessRoute('STARTER', route)).toBe(false);
    }
  });

  /**
   * Test 3: canAccessRoute should allow STARTER users access to permitted routes
   *
   * The canAccessRoute() function does not exist yet in lib/subscription.ts.
   * This test will FAIL because the import will throw — confirming the bug
   * that there is no centralized route-level gating mechanism.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('should allow STARTER plan access to permitted routes via canAccessRoute()', async () => {
    // This import will fail on unfixed code because canAccessRoute doesn't exist
    const { canAccessRoute } = await import('@/lib/subscription');

    expect(canAccessRoute('STARTER', '/dashboard')).toBe(true);
    expect(canAccessRoute('STARTER', '/invoices')).toBe(true);
    expect(canAccessRoute('STARTER', '/invoices/new')).toBe(true);
    expect(canAccessRoute('STARTER', '/clients')).toBe(true);
    expect(canAccessRoute('STARTER', '/clients/new')).toBe(true);
    expect(canAccessRoute('STARTER', '/settings')).toBe(true);
    expect(canAccessRoute('STARTER', '/settings/profile')).toBe(true);
  });
});
