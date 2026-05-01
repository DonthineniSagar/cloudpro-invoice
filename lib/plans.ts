// Shared plan definitions — used by landing page and in-app pricing page

export interface PlanFeatureItem {
  name: string;
  included: boolean | string;
}

export interface Plan {
  name: string;
  tier: string;
  displayPrice: number;    // "was" price (before discount)
  monthlyPrice: number;    // actual charge incl GST
  monthlyPriceId: string;
  annualPrice?: number;    // annual charge incl GST (10 months for 12)
  annualPriceId?: string;
  highlighted: boolean;
  discount: string | null;
  features: PlanFeatureItem[];
}

export const PLANS: Plan[] = [
  {
    name: 'Starter',
    tier: 'STARTER',
    displayPrice: 19.99,
    monthlyPrice: 11.49,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || '',
    annualPrice: 114.90,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || '',
    highlighted: false,
    discount: '50% off',
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
    displayPrice: 59.99,
    monthlyPrice: 34.49,
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || '',
    annualPrice: 344.90,
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL || '',
    highlighted: true,
    discount: '50% off',
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
