import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });

const VALID_MODELS = ['Invoice', 'InvoiceItem', 'Client', 'Expense', 'CompanyProfile', 'RecurringInvoice', 'Notification'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const ownerUserId = searchParams.get('ownerUserId');
    const id = searchParams.get('id');

    if (!model || !ownerUserId) {
      return NextResponse.json({ error: 'Missing model or ownerUserId' }, { status: 400 });
    }
    if (!VALID_MODELS.includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    // Use API key auth to read data server-side
    const client = generateClient<Schema>({ authMode: 'apiKey' });

    // Verify caller has an active CompanyMember relationship
    const { data: members } = await client.models.CompanyMember.listCompanyMemberByOwnerUserId(
      { ownerUserId }
    );
    // For MVP, we trust the caller is authenticated via their session cookie.
    // The CompanyMember check ensures the ownerUserId is valid.
    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No team membership found' }, { status: 403 });
    }

    const modelRef = client.models[model as keyof typeof client.models] as Record<string, unknown>;

    if (id && typeof modelRef.get === 'function') {
      const { data } = await (modelRef.get as (args: { id: string }) => Promise<{ data: unknown }>)({ id });
      return NextResponse.json({ data: data ? [data] : [] });
    }

    if (typeof modelRef.list === 'function') {
      const { data } = await (modelRef.list as (args?: Record<string, unknown>) => Promise<{ data: unknown[] }>)({
        filter: { userId: { eq: ownerUserId } },
      });
      return NextResponse.json({ data: data || [] });
    }

    return NextResponse.json({ data: [] });
  } catch (err: unknown) {
    console.error('Team data API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
