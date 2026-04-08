// Shared plan definitions — used by landing page and in-app pricing page

export interface PlanFeatureItem {
  name: string;
  included: boolean | string;
}

export interface Plan {
  name: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceId: string;
  annualPriceId: string;
  highlighted: boolean;
  features: PlanFeatureItem[];
}

export const PLANS: Plan[] = [
  {
    name: 'Starter',
    tier: 'STARTER',
    monthlyPrice: 10.35,
    annualPrice: 113.85,
    monthlyPriceId: 'price_1TJndVRRCRfUSdl9rivSIDKQ',
    annualPriceId: 'price_1TJndWRRCRfUSdl9baePpusb',
    highlighted: false,
    features: [
      { name: '10 invoices/month', included: true },
      { name: '5 clients', included: true },
      { name: '1 template (Modern)', included: true },
      { name: 'Client portal', included: true },
      { name: 'Recurring invoices', included: false },
      { name: 'Auto reminders', included: false },
      { name: 'Expenses', included: false },
      { name: 'Receipt OCR', included: false },
      { name: 'Reports', included: 'Invoice only' },
    ],
  },
  {
    name: 'Business',
    tier: 'BUSINESS',
    monthlyPrice: 33.35,
    annualPrice: 333.50,
    monthlyPriceId: 'price_1TJndYRRCRfUSdl9IlFTYGBn',
    annualPriceId: 'price_1TJndZRRCRfUSdl9eWRqEycI',
    highlighted: true,
    features: [
      { name: 'Unlimited invoices', included: true },
      { name: 'Unlimited clients', included: true },
      { name: 'All 3 templates', included: true },
      { name: 'Client portal', included: true },
      { name: 'Recurring invoices', included: true },
      { name: 'Auto reminders', included: true },
      { name: 'Expenses', included: true },
      { name: '30 receipt OCR/month', included: true },
      { name: 'Full reports', included: true },
    ],
  },
  {
    name: 'Business Pro',
    tier: 'BUSINESS_PRO',
    monthlyPrice: 90.85,
    annualPrice: 908.50,
    monthlyPriceId: 'price_1TJndaRRCRfUSdl9TaFc2RrI',
    annualPriceId: 'price_1TJndbRRCRfUSdl9B6Kl1YAu',
    highlighted: false,
    features: [
      { name: 'Unlimited invoices', included: true },
      { name: 'Unlimited clients', included: true },
      { name: 'All templates + custom', included: true },
      { name: 'Client portal', included: true },
      { name: 'Recurring invoices', included: true },
      { name: 'Auto reminders', included: true },
      { name: 'Expenses + email ingest', included: true },
      { name: 'Unlimited receipt OCR', included: true },
      { name: 'Full reports + CSV export', included: true },
      { name: '2 users included', included: true },
    ],
  },
];
