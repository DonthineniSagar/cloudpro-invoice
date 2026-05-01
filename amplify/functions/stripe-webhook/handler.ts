/**
 * Stripe Webhook Lambda
 *
 * Processes Stripe webhook events and updates CompanyProfile subscription data in DynamoDB.
 * Invoked via Function URL — Stripe sends events directly here.
 */
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
const TABLE = process.env.COMPANY_PROFILE_TABLE_NAME!;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type PlanTier = 'STARTER' | 'BUSINESS';
type SubStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

const PRODUCT_TO_PLAN: Record<string, PlanTier> = Object.fromEntries(
  [
    [process.env.STRIPE_PRODUCT_STARTER, 'STARTER'],
    [process.env.STRIPE_PRODUCT_BUSINESS, 'BUSINESS'],
  ].filter(([k]) => k)
) as Record<string, PlanTier>;

function mapStatus(s: string): SubStatus {
  switch (s) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled':
    case 'cancelled': return 'CANCELLED';
    default: return 'EXPIRED';
  }
}

export const handler = async (event: { headers: Record<string, string>; body: string; isBase64Encoded?: boolean }) => {
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];

  if (!signature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing stripe-signature' }) };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Signature verification failed:', err);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  console.log(`Stripe webhook: ${stripeEvent.type}`);

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckout(stripeEvent.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubUpdated(stripeEvent.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubDeleted(stripeEvent.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Error processing ${stripeEvent.type}:`, err);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function handleCheckout(session: Stripe.Checkout.Session) {
  const profileId = session.metadata?.companyProfileId;
  const planName = session.metadata?.planName as PlanTier | undefined;
  const interval = session.metadata?.interval as 'monthly' | 'annual' | undefined;

  if (!profileId) { console.error('checkout: missing companyProfileId'); return; }

  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subId) { console.error('checkout: no subscription ID'); return; }

  const sub = await stripe.subscriptions.retrieve(subId);

  const expr = [
    'SET stripeCustomerId = :cid',
    'stripeSubscriptionId = :sid',
    'subscriptionPlan = :plan',
    'subscriptionStatus = :status',
    'subscriptionInterval = :interval',
    'subscriptionCurrentPeriodEnd = :periodEnd',
    'updatedAt = :now',
  ];
  const vals: Record<string, unknown> = {
    ':cid': typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
    ':sid': subId,
    ':plan': planName || 'STARTER',
    ':status': mapStatus(sub.status),
    ':interval': interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
    ':periodEnd': new Date(sub.current_period_end * 1000).toISOString(),
    ':now': new Date().toISOString(),
  };

  if (sub.status === 'trialing' && sub.trial_start && sub.trial_end) {
    expr.push('trialStartDate = :ts', 'trialEndDate = :te');
    vals[':ts'] = new Date(sub.trial_start * 1000).toISOString();
    vals[':te'] = new Date(sub.trial_end * 1000).toISOString();
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { id: profileId },
    UpdateExpression: expr.join(', '), ExpressionAttributeValues: vals,
  }));
  console.log(`checkout: updated ${profileId} → ${planName} (${mapStatus(sub.status)})`);
}

async function handleSubUpdated(sub: Stripe.Subscription) {
  const profileId = sub.metadata?.companyProfileId;
  if (!profileId) { console.error('sub.updated: missing companyProfileId'); return; }

  const productId = typeof sub.items.data[0]?.price?.product === 'string'
    ? sub.items.data[0].price.product : sub.items.data[0]?.price?.product?.id;
  const plan: PlanTier = productId ? (PRODUCT_TO_PLAN[productId] || 'STARTER') : 'STARTER';
  const interval = sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'ANNUAL' : 'MONTHLY';

  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { id: profileId },
    UpdateExpression: 'SET subscriptionPlan = :plan, subscriptionStatus = :status, subscriptionInterval = :interval, subscriptionCurrentPeriodEnd = :pe, updatedAt = :now',
    ExpressionAttributeValues: {
      ':plan': plan, ':status': mapStatus(sub.status), ':interval': interval,
      ':pe': new Date(sub.current_period_end * 1000).toISOString(), ':now': new Date().toISOString(),
    },
  }));
  console.log(`sub.updated: ${profileId} → ${plan} (${mapStatus(sub.status)})`);
}

async function handleSubDeleted(sub: Stripe.Subscription) {
  const profileId = sub.metadata?.companyProfileId;
  if (!profileId) { console.error('sub.deleted: missing companyProfileId'); return; }

  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { id: profileId },
    UpdateExpression: 'SET subscriptionStatus = :s, updatedAt = :now REMOVE stripeSubscriptionId',
    ExpressionAttributeValues: { ':s': 'CANCELLED', ':now': new Date().toISOString() },
  }));
  console.log(`sub.deleted: ${profileId} → CANCELLED`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const profileId = sub.metadata?.companyProfileId;
  if (!profileId) { console.error('payment_failed: missing companyProfileId'); return; }

  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { id: profileId },
    UpdateExpression: 'SET subscriptionStatus = :s, updatedAt = :now',
    ExpressionAttributeValues: { ':s': 'PAST_DUE', ':now': new Date().toISOString() },
  }));
  console.log(`payment_failed: ${profileId} → PAST_DUE`);
}
