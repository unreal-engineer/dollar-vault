import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export async function POST(request: Request) {
  try {
    const { client_id, secret, env } = await request.json();

    if (!client_id || !secret || !env) {
      return NextResponse.json({ error: 'Missing required Plaid credentials' }, { status: 400 });
    }

    const config = new Configuration({
      basePath: PlaidEnvironments[env] || PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': client_id,
          'PLAID-SECRET': secret,
        },
      },
    });

    const testClient = new PlaidApi(config);
    
    // Retrieve standard sandbox institution (ins_10 = Chase) to test credentials
    await testClient.institutionsGetById({
      institution_id: 'ins_10',
      country_codes: ['US' as any],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Plaid connection test failed:', error.response?.data || error.message);
    const details = error.response?.data?.error_message || error.message || 'Verification failed';
    return NextResponse.json({ success: false, error: details }, { status: 400 });
  }
}
