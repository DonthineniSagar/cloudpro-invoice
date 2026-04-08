import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { PRODUCT_TO_PLAN } from '@/lib/subscription';
import type { PlanTier, SubscriptionStatus } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// DynamoDB direct access — bypasses AppSync auth for server-side webhook writes
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Table name from Amplify — set via env var or derive from amplify_outputs
const COMPANY_PROFILE_TABLE = process.env.COMPANY_PROFILE_TABLE_NAME || 'CompanyProfile';

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('Webhook signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Unknown events — acknowledge and ignore
        break;
    }
  } catch (err: unknown) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    // Still return 200 to prevent Stripe retries on processing errors
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyProfileId = session.metadata?.companyProfileId;
  const planName = session.metadata?.planName as PlanTier | undefined;
  const interval = session.metadata?.interval as 'monthly' | 'annual' | undefined;

  if (!companyProfileId) {
    console.error('checkout.session.completed: missing companyProfileId in metadata');
    return;
  }

  // Retrieve the subscription to get trial dates
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    console.error('checkout.session.completed: no subscription ID');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const isTrialing = subscription.status === 'trialing';

  const updateExpression: string[] = [
    'SET stripeCustomerId = :customerId',
    'stripeSubscriptionId = :subId',
    'subscriptionPlan = :plan',
    'subscriptionStatus = :status',
    'subscriptionInterval = :interval',
    'subscriptionCurrentPeriodEnd = :periodEnd',
  ];

  const expressionValues: Record<string, unknown> = {
    ':customerId': typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
    ':subId': subscriptionId,
    ':plan': isTrialing ? 'BUSINESS_PRO' : (planName || 'STARTER'),
    ':status': mapStripeStatus(subscription.status),
    ':interval': interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
    ':periodEnd': new Date(subscription.current_period_end * 1000).toISOString(),
  };

  if (isTrialing && subscription.trial_start && subscription.trial_end) {
    updateExpression.push('trialStartDate = :trialStart');
    updateExpression.push('trialEndDate = :trialEnd');
    expressionValues[':trialStart'] = new Date(subscription.trial_start * 1000).toISOString();
    expressionValues[':trialEnd'] = new Date(subscription.trial_end * 1000).toISOString();
  }

  await ddbClient.send(new UpdateCommand({
    TableName: COMPANY_PROFILE_TABLE,
    Key: { id: companyProfileId },
    UpdateExpression: updateExpression.join(', '),
    ExpressionAttributeValues: expressionValues,
  }));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const companyProfileId = subscription.metadata?.companyProfileId;
  if (!companyProfileId) {
    // Try to find by stripeSubscriptionId — fallback
    console.error('subscription.updated: missing companyProfileId in metadata, skipping');
    return;
  }

  // Determine plan from product ID
  const productId = typeof subscription.items.data[0]?.price?.product === 'string'
    ? subscription.items.data[0].price.product
    : subscription.items.data[0]?.price?.product?.id;

  const plan: PlanTier = productId ? (PRODUCT_TO_PLAN[productId] || 'STARTER') : 'STARTER';
  const status = mapStripeStatus(subscription.status);
  const isTrialing = subscription.status === 'trialing';
  const interval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'ANNUAL' : 'MONTHLY';

  const updateExpression: string[] = [
    'SET subscriptionPlan = :plan',
    'subscriptionStatus = :status',
    'subscriptionInterval = :interval',
    'subscriptionCurrentPeriodEnd = :periodEnd',
  ];

  const expressionValues: Record<string, unknown> = {
    ':plan': isTrialing ? 'BUSINESS_PRO' : plan,
    ':status': status,
    ':interval': interval,
    ':periodEnd': new Date(subscription.current_period_end * 1000).toISOString(),
  };

  await ddbClient.send(new UpdateCommand({
    TableName: COMPANY_PROFILE_TABLE,
    Key: { id: companyProfileId },
    UpdateExpression: updateExpression.join(', '),
    ExpressionAttributeValues: expressionValues,
  }));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const companyProfileId = subscription.metadata?.companyProfileId;
  if (!companyProfileId) {
    console.error('subscription.deleted: missing companyProfileId in metadata, skipping');
    return;
  }

  await ddbClient.send(new UpdateCommand({
    TableName: COMPANY_PROFILE_TABLE,
    Key: { id: companyProfileId },
    UpdateExpression: 'SET subscriptionStatus = :status REMOVE stripeSubscriptionId',
    ExpressionAttributeValues: {
      ':status': 'CANCELLED' as SubscriptionStatus,
    },
  }));
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  // Retrieve subscription to get metadata
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const companyProfileId = subscription.metadata?.companyProfileId;

  if (!companyProfileId) {
    console.error('invoice.payment_failed: cannot find companyProfileId');
    return;
  }

  await ddbClient.send(new UpdateCommand({
    TableName: COMPANY_PROFILE_TABLE,
    Key: { id: companyProfileId },
    UpdateExpression: 'SET subscriptionStatus = :status',
    ExpressionAttributeValues: {
      ':status': 'PAST_DUE' as SubscriptionStatus,
    },
  }));
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled':
    case 'cancelled': return 'CANCELLED';
    case 'unpaid':
    case 'incomplete_expired': return 'EXPIRED';
    default: return 'EXPIRED';
  }
}
