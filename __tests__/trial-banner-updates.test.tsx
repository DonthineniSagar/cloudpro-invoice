/**
 * TrialBanner Update Tests
 *
 * Tests for the two behavior changes to TrialBanner:
 * 1. TRIALING without payment setup: shows "Add payment details" nudge instead of countdown
 * 2. PAST_DUE: non-dismissable banner with direct "Update payment method" link
 *
 * These are isolated component tests — no AppLayout or Amplify needed.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import TrialBanner from '@/components/TrialBanner';

// ── Helpers ────────────────────────────────────────────────────────────────

function futureDateISO(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

// ── Test Suite 1: TRIALING without payment setup ──────────────────────────

describe('TrialBanner: TRIALING without payment setup', () => {
  it('shows "Add payment details before your trial ends" message', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={null}
        hasPaymentSetup={false}
        stripeCustomerId={null}
        dark={false}
      />
    );
    expect(screen.getByText(/Add payment details before your trial ends/)).toBeInTheDocument();
  });

  it('shows a "Set up payment" link to /pricing', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={null}
        hasPaymentSetup={false}
        stripeCustomerId={null}
        dark={false}
      />
    );
    expect(screen.getByRole('link', { name: 'Set up payment' })).toHaveAttribute('href', '/pricing');
  });

  it('does not show the day countdown when payment is not set up', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(5)}
        hasPaymentSetup={false}
        stripeCustomerId={null}
        dark={false}
      />
    );
    expect(screen.queryByText(/days? left in your free trial/)).not.toBeInTheDocument();
  });

  it('is dismissable', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={null}
        hasPaymentSetup={false}
        stripeCustomerId={null}
        dark={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss trial banner/i }));
    expect(screen.queryByText(/Add payment details/)).not.toBeInTheDocument();
  });
});

// ── Test Suite 2: TRIALING with payment setup ──────────────────────────────

describe('TrialBanner: TRIALING with payment setup', () => {
  it('shows the day countdown when payment is set up', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(5)}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.getByText(/5 days? left in your free trial/)).toBeInTheDocument();
  });

  it('shows a "Choose a plan" link to /pricing', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(3)}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.getByRole('link', { name: 'Choose a plan' })).toHaveAttribute('href', '/pricing');
  });

  it('shows "1 day left" when exactly 1 day remains', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(1)}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.getByText(/1 day left in your free trial/)).toBeInTheDocument();
  });

  it('does not show "Add payment details" message when payment is set up', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(7)}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.queryByText(/Add payment details/)).not.toBeInTheDocument();
  });

  it('is dismissable', () => {
    render(
      <TrialBanner
        status="TRIALING"
        trialEndDate={futureDateISO(4)}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss trial banner/i }));
    expect(screen.queryByText(/days? left/)).not.toBeInTheDocument();
  });
});

// ── Test Suite 3: PAST_DUE — non-dismissable with direct fix link ──────────

describe('TrialBanner: PAST_DUE banner', () => {
  it('shows "Your last payment failed" message', () => {
    render(
      <TrialBanner
        status="PAST_DUE"
        trialEndDate={null}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.getByText(/Your last payment failed/)).toBeInTheDocument();
  });

  it('shows "Update payment method" link pointing to /settings/subscription', () => {
    render(
      <TrialBanner
        status="PAST_DUE"
        trialEndDate={null}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.getByRole('link', { name: 'Update payment method' })).toHaveAttribute(
      'href',
      '/settings/subscription'
    );
  });

  it('has no dismiss button — banner is persistent', () => {
    render(
      <TrialBanner
        status="PAST_DUE"
        trialEndDate={null}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(screen.queryByRole('button', { name: /dismiss payment banner/i })).not.toBeInTheDocument();
  });

  it('remains visible after attempting to interact — no dismiss mechanism', () => {
    render(
      <TrialBanner
        status="PAST_DUE"
        trialEndDate={null}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    // Confirm the banner is present and cannot be dismissed (no button exists)
    expect(screen.getByText(/Your last payment failed/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ── Test Suite 4: Non-rendering statuses ──────────────────────────────────

describe('TrialBanner: renders nothing for non-applicable statuses', () => {
  it('renders nothing for ACTIVE status', () => {
    const { container } = render(
      <TrialBanner
        status="ACTIVE"
        trialEndDate={null}
        hasPaymentSetup={true}
        stripeCustomerId="cus_abc123"
        dark={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for null status', () => {
    const { container } = render(
      <TrialBanner
        status={null}
        trialEndDate={null}
        hasPaymentSetup={false}
        stripeCustomerId={null}
        dark={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
