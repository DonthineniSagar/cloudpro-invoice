// Shared plan definitions — used by landing page and in-app pricing page

export interface PlanFeatureItem {
  name: string;
  included: boolean | string;
}

export interface Plan {
  name: string;
  tier: string;
  fullPrice: number;       // full monthly price incl GST (before discount)
  monthlyPriceId: string;
  annualPrice: number;     // full annual price incl GST (before discount)
  annualPriceId: string;
  highlighted: boolean;
  features: PlanFeatureItem[];
}

// Launch discount — 50% off, applied automatically via Stripe coupon
export const LAUNCH_DISCOUNT = 0.5;
export const LAUNCH_DISCOUNT_LABEL = '50% off';

export const PLANS: Plan[] = [
  {
    name: 'Starter',
    tier: 'STARTER',
    fullPrice: 19.99,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || '',
    annualPrice: 199.90,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || '',
    highlighted: false,
    features: [
      { name: 'Unlimited invoices', included: true },
      { name: 'Unlimited clients', included: true },
      { name: 'Email sending', included: true },
      { name: 'Client portal', included: true },
      { name: '1 template (Modern)', included: true },
      { name: 'Expenses', included: false },
      { name: 'Reports', included: false },
    ],
  },
  {
    name: 'Business',
    tier: 'BUSINESS',
    fullPrice: 59.99,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || '',
    annualPrice: 599.90,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL || '',
    highlighted: true,
    features: [
      { name: 'Unlimited invoices', included: true },
      { name: 'Unlimited clients', included: true },
      { name: 'Email sending', included: true },
      { name: 'Client portal', included: true },
      { name: 'All templates', included: true },
      { name: 'Expenses', included: true },
      { name: 'Full reports', included: true },
      { name: 'Recurring invoices', included: true },
      { name: 'Auto reminders', included: true },
    ],
  },
];
