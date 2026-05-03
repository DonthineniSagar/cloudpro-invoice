/**
 * Subscription Enforcement Tests — SubscriptionGate + AppLayout Integration
 *
 * Tests the hard-blocking enforcement layer added to AppLayout:
 * - SubscriptionGate: correct copy, CTAs, and Manage Billing visibility per status
 * - AppLayout: gate replaces page content for blocked statuses (CANCELLED, EXPIRED, null)
 * - AppLayout: page content visible for active statuses (ACTIVE, TRIALING, PAST_DUE)
 * - AppLayout: exempt paths (/pricing, /settings/subscription, /settings/company) bypass gate
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mutable state for per-test configuration ───────────────────────────────

let mockSubscriptionPlan: string | null = 'STARTER';
let mockSubscriptionStatus: string | null = 'ACTIVE';
let mockStripeCustomerId: string | null = null;
let mockStripeSubscriptionId: string | null = null;
let mockTrialEndDate: string | null = null;
let mockPathname = '/dashboard';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', firstName: 'Test' },
    loading: false,
    needsCompanyProfile: false,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

jest.mock('@/components/NotificationBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell">Bell</div>,
}));

// TrialBanner is mocked so AppLayout gate tests remain focused on gate logic
jest.mock('@/components/TrialBanner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/UsageMeter', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/usage', () => ({
  getInvoiceCount: jest.fn().mockResolvedValue(0),
  getClientCount: jest.fn().mockResolvedValue(0),
  getEffectiveOcrCount: jest.fn().mockReturnValue(0),
  getBillingPeriodStart: jest.fn().mockReturnValue('2025-01-01'),
  checkLimit: jest.requireActual('@/lib/usage').checkLimit,
}));

jest.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      CompanyProfile: {
        list: jest.fn().mockImplementation(() =>
          Promise.resolve({
            data: [{
              subscriptionPlan: mockSubscriptionPlan,
              subscriptionStatus: mockSubscriptionStatus,
              trialEndDate: mockTrialEndDate,
              stripeCustomerId: mockStripeCustomerId,
              stripeSubscriptionId: mockStripeSubscriptionId,
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
import SubscriptionGate from '@/components/SubscriptionGate';
import { act } from '@testing-library/react';

// ── Helpers ────────────────────────────────────────────────────────────────

async function renderAppLayout() {
  await act(async () => {
    render(
      <AppLayout>
        <div data-testid="page-content">Page content</div>
      </AppLayout>
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

// ── Test Suite 1: SubscriptionGate — copy and CTAs ────────────────────────

describe('SubscriptionGate: copy and CTAs per status', () => {
  it('shows "Choose a plan to get started" heading for null status', () => {
    render(<SubscriptionGate status={null} stripeCustomerId={null} dark={false} />);
    expect(screen.getByText('Choose a plan to get started')).toBeInTheDocument();
  });

  it('null status CTA links to /pricing and reads "View Plans"', () => {
    render(<SubscriptionGate status={null} stripeCustomerId={null} dark={false} />);
    expect(screen.getByRole('link', { name: 'View Plans' })).toHaveAttribute('href', '/pricing');
  });

  it('shows "Subscription cancelled" heading for CANCELLED status', () => {
    render(<SubscriptionGate status="CANCELLED" stripeCustomerId={null} dark={false} />);
    expect(screen.getByText('Subscription cancelled')).toBeInTheDocument();
  });

  it('CANCELLED CTA reads "Reactivate Plan" and links to /pricing', () => {
    render(<SubscriptionGate status="CANCELLED" stripeCustomerId={null} dark={false} />);
    expect(screen.getByRole('link', { name: 'Reactivate Plan' })).toHaveAttribute('href', '/pricing');
  });

  it('shows "Subscription expired" heading for EXPIRED status', () => {
    render(<SubscriptionGate status="EXPIRED" stripeCustomerId={null} dark={false} />);
    expect(screen.getByText('Subscription expired')).toBeInTheDocument();
  });

  it('EXPIRED CTA reads "Renew Plan" and links to /pricing', () => {
    render(<SubscriptionGate status="EXPIRED" stripeCustomerId={null} dark={false} />);
    expect(screen.getByRole('link', { name: 'Renew Plan' })).toHaveAttribute('href', '/pricing');
  });

  it('shows "Manage Billing" link to /settings/subscription when stripeCustomerId is set', () => {
    render(<SubscriptionGate status="CANCELLED" stripeCustomerId="cus_abc123" dark={false} />);
    expect(screen.getByRole('link', { name: 'Manage Billing' })).toHaveAttribute(
      'href',
      '/settings/subscription'
    );
  });

  it('hides "Manage Billing" link when stripeCustomerId is null', () => {
    render(<SubscriptionGate status="CANCELLED" stripeCustomerId={null} dark={false} />);
    expect(screen.queryByRole('link', { name: 'Manage Billing' })).not.toBeInTheDocument();
  });

  it('always renders a Sign out button', () => {
    render(<SubscriptionGate status={null} stripeCustomerId={null} dark={false} />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

// ── Test Suite 2: AppLayout — gate shown for blocked statuses ──────────────

describe('AppLayout: SubscriptionGate shown for inactive statuses on protected paths', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
    mockStripeCustomerId = null;
    mockStripeSubscriptionId = null;
    mockTrialEndDate = null;
  });

  afterEach(() => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'ACTIVE';
  });

  it('CANCELLED status hides page content and renders gate', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'CANCELLED';

    await renderAppLayout();

    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reactivate Plan' })).toBeInTheDocument();
  });

  it('EXPIRED status hides page content and renders gate', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'EXPIRED';

    await renderAppLayout();

    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Renew Plan' })).toBeInTheDocument();
  });

  it('null status (no subscription) hides page content and renders gate', async () => {
    mockSubscriptionPlan = null;
    mockSubscriptionStatus = null;

    await renderAppLayout();

    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Plans' })).toBeInTheDocument();
  });

  it('gate includes Manage Billing link when stripeCustomerId is present', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'CANCELLED';
    mockStripeCustomerId = 'cus_abc123';

    await renderAppLayout();

    expect(screen.getByRole('link', { name: 'Manage Billing' })).toHaveAttribute(
      'href',
      '/settings/subscription'
    );
  });
});

// ── Test Suite 3: AppLayout — page content shown for active statuses ───────

describe('AppLayout: page content visible for active and grace-period statuses', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
    mockStripeCustomerId = 'cus_abc123';
    mockStripeSubscriptionId = 'sub_abc123';
    mockTrialEndDate = null;
  });

  afterEach(() => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'ACTIVE';
    mockTrialEndDate = null;
  });

  it('ACTIVE status renders page content without gate', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'ACTIVE';

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reactivate Plan' })).not.toBeInTheDocument();
  });

  it('TRIALING status renders page content without gate', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'TRIALING';
    mockTrialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('PAST_DUE status renders page content without gate (Stripe grace period)', async () => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'PAST_DUE';

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reactivate Plan' })).not.toBeInTheDocument();
  });
});

// ── Test Suite 4: AppLayout — exempt paths bypass the gate ─────────────────

describe('AppLayout: exempt paths bypass gate even for CANCELLED subscription', () => {
  beforeEach(() => {
    mockSubscriptionPlan = 'STARTER';
    mockSubscriptionStatus = 'CANCELLED';
    mockStripeCustomerId = 'cus_abc123';
    mockStripeSubscriptionId = null;
    mockTrialEndDate = null;
  });

  afterEach(() => {
    mockPathname = '/dashboard';
  });

  it('/pricing is accessible with a CANCELLED subscription', async () => {
    mockPathname = '/pricing';

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('/settings/subscription is accessible with a CANCELLED subscription', async () => {
    mockPathname = '/settings/subscription';

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('/settings/company is accessible with a CANCELLED subscription', async () => {
    mockPathname = '/settings/company';

    await renderAppLayout();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('/dashboard is blocked with a CANCELLED subscription (non-exempt)', async () => {
    mockPathname = '/dashboard';

    await renderAppLayout();

    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });
});
