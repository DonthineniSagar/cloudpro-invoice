import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { VALID_PRICE_IDS } from '@/lib/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

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
  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const { priceId, planName, interval, userId, userEmail, companyProfileId, hasExistingTrial } = body;

    // Validate required fields
    if (!priceId || !userId || !userEmail || !companyProfileId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Whitelist validation — never trust client-provided price IDs blindly
    if (!VALID_PRICE_IDS.has(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Build subscription data — offer 14-day trial only for first-time users
    const subscriptionData: Stripe.Checkout.SessionCreateParams['subscription_data'] = {
      metadata: {
        userId,
        companyProfileId,
        planName,
        interval,
      },
    };

    if (!hasExistingTrial) {
      subscriptionData.trial_period_days = 14;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      payment_method_collection: 'if_required',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      metadata: {
        userId,
        companyProfileId,
        planName,
        interval,
      },
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
