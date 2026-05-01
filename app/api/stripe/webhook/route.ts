import { NextRequest, NextResponse } from 'next/server';

/**
 * Stripe webhook proxy — forwards to the Lambda function URL.
 * Stripe should be configured to call the Lambda URL directly.
 * This route exists only as a fallback during migration.
 */
const LAMBDA_WEBHOOK_URL = process.env.STRIPE_WEBHOOK_LAMBDA_URL;

export async function POST(request: NextRequest) {
  if (!LAMBDA_WEBHOOK_URL) {
    console.error('STRIPE_WEBHOOK_LAMBDA_URL not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  const res = await fetch(LAMBDA_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'stripe-signature': signature } : {}),
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
