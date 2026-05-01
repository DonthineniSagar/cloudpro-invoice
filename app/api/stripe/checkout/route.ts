import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { VALID_PRICE_IDS } from '@/lib/subscription';

const stripeKey = process.env.STRIPE_SECRET_KEY;

interface CheckoutRequestBody {
  priceId: string;
  planName: string;
  interval: 'monthly' | 'annual';
  userId: string;
  userEmail: string;
  companyProfileId: string;
  hasExistingTrial: boolean;
}

export async function POST(request: NextRequest) {
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeKey);

  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const { priceId, planName, interval, userId, userEmail, companyProfileId, hasExistingTrial } = body;

    if (!priceId || !userId || !userEmail || !companyProfileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!VALID_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const subscriptionData: Stripe.Checkout.SessionCreateParams['subscription_data'] = {
      metadata: { userId, companyProfileId, planName, interval },
    };

    if (!hasExistingTrial) {
      subscriptionData.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      payment_method_collection: 'if_required',
      discounts: [{ coupon: process.env.STRIPE_LAUNCH_COUPON_ID || '' }],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      metadata: { userId, companyProfileId, planName, interval },
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
