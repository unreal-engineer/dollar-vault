import { getPlaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const plaidClient = await getPlaidClient();
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'personal-user' },
      client_name: 'Dollar Vault',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Webhooks are not used; polling via node-cron is used instead
      transactions: {
        days_requested: 730, // Request max 2 years of history
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error creating link token:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
