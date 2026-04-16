// Feature gating utility — plan matrix, canAccess(), getPlanLimits(), isSubscriptionActive()

export type PlanTier = 'STARTER' | 'BUSINESS' | 'BUSINESS_PRO';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export type Feature =
  | 'invoices'
  | 'clients'
  | 'templates_all'
  | 'templates_custom'
  | 'client_portal'
  | 'recurring'
  | 'auto_reminders'
  | 'expenses'
  | 'receipt_ocr'
  | 'email_ingest'
  | 'reports_full'
  | 'reports_export'
  | 'ai_insights_basic'
  | 'ai_insights_full'
  | 'multi_user';

export interface PlanLimits {
  maxInvoicesPerMonth: number; // -1 = unlimited
  maxClients: number;          // -1 = unlimited
  maxOcrPerMonth: number;      // -1 = unlimited, 0 = none
  maxUsers: number;
}

export const PLAN_FEATURES: Record<PlanTier, Set<Feature>> = {
  STARTER: new Set<Feature>([
    'invoices',
    'clients',
    'client_portal',
  ]),
  BUSINESS: new Set<Feature>([
    'invoices',
    'clients',
    'templates_all',
    'client_portal',
    'recurring',
    'auto_reminders',
    'expenses',
    'receipt_ocr',
    'reports_full',
    'ai_insights_basic',
  ]),
  BUSINESS_PRO: new Set<Feature>([
    'invoices',
    'clients',
    'templates_all',
    'templates_custom',
    'client_portal',
    'recurring',
    'auto_reminders',
    'expenses',
    'receipt_ocr',
    'email_ingest',
    'reports_full',
    'reports_export',
    'ai_insights_basic',
    'ai_insights_full',
    'multi_user',
  ]),
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER:      { maxInvoicesPerMonth: 10, maxClients: 5,  maxOcrPerMonth: 0,  maxUsers: 1 },
  BUSINESS:     { maxInvoicesPerMonth: -1, maxClients: -1, maxOcrPerMonth: 30, maxUsers: 1 },
  BUSINESS_PRO: { maxInvoicesPerMonth: -1, maxClients: -1, maxOcrPerMonth: -1, maxUsers: 2 },
};

/** Check if a plan has access to a specific feature */
export function canAccess(plan: PlanTier | null, feature: Feature): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

/** Get numeric limits for a plan */
export function getPlanLimits(plan: PlanTier | null): PlanLimits {
  if (!plan) return { maxInvoicesPerMonth: 0, maxClients: 0, maxOcrPerMonth: 0, maxUsers: 0 };
  return PLAN_LIMITS[plan];
}

/** Returns true for statuses that should retain app access */
export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  return status === 'TRIALING' || status === 'ACTIVE' || status === 'PAST_DUE';
}

// Stripe product → internal plan mapping
export const PRODUCT_TO_PLAN: Record<string, PlanTier> = {
  'prod_UINcOjzo9FGPIc': 'STARTER',
  'prod_UINcDnUQuxSwga': 'BUSINESS',
  'prod_UINcPSlDVttHpn': 'BUSINESS_PRO',
};

// Whitelist of valid Stripe price IDs
export const VALID_PRICE_IDS = new Set([
  'price_1TJndVRRCRfUSdl9rivSIDKQ', // Starter monthly $10.35
  'price_1TJndWRRCRfUSdl9baePpusb', // Starter annual $113.85
  'price_1TJndYRRCRfUSdl9IlFTYGBn', // Business monthly $33.35
  'price_1TJndZRRCRfUSdl9eWRqEycI', // Business annual $333.50
  'price_1TJndaRRCRfUSdl9TaFc2RrI', // Pro monthly $90.85
  'price_1TJndbRRCRfUSdl9B6Kl1YAu', // Pro annual $908.50
]);

// Price ID → plan tier mapping
export const PRICE_TO_PLAN: Record<string, PlanTier> = {
  'price_1TJndVRRCRfUSdl9rivSIDKQ': 'STARTER',
  'price_1TJndWRRCRfUSdl9baePpusb': 'STARTER',
  'price_1TJndYRRCRfUSdl9IlFTYGBn': 'BUSINESS',
  'price_1TJndZRRCRfUSdl9eWRqEycI': 'BUSINESS',
  'price_1TJndaRRCRfUSdl9TaFc2RrI': 'BUSINESS_PRO',
  'price_1TJndbRRCRfUSdl9B6Kl1YAu': 'BUSINESS_PRO',
};


// Route-level visibility per plan tier — centralized config for nav filtering and page gating
export const PLAN_VISIBLE_ROUTES: Record<PlanTier, string[]> = {
  STARTER: ['/dashboard', '/invoices', '/clients', '/settings'],
  BUSINESS: ['/dashboard', '/invoices', '/settings', '/clients', '/expenses', '/reports'],
  BUSINESS_PRO: ['/dashboard', '/invoices', '/settings', '/clients', '/expenses', '/reports'],
};

/** Check if a plan tier is allowed to access a given route pathname */
export function canAccessRoute(plan: PlanTier | null, pathname: string): boolean {
  // Fallback: no subscription data → allow all routes
  if (!plan) return true;

  // BUSINESS and BUSINESS_PRO have full access
  if (plan === 'BUSINESS' || plan === 'BUSINESS_PRO') return true;

  // STARTER: explicitly block /invoices/recurring even though /invoices is allowed
  if (pathname.startsWith('/invoices/recurring')) return false;

  // STARTER: check if pathname starts with any allowed prefix
  return PLAN_VISIBLE_ROUTES[plan].some((prefix) => pathname.startsWith(prefix));
}
