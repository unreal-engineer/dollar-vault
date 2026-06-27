import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { db } from './db';
import { systemSettings } from './db/schema';
import { decrypt } from './crypto';

export async function getPlaidClient(): Promise<PlaidApi> {
  const settings = await db.select().from(systemSettings);
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const clientId = settingsMap.get('plaid_client_id') || process.env.PLAID_CLIENT_ID || '';
  const env = (settingsMap.get('plaid_env') || process.env.PLAID_ENV || 'sandbox') as 'sandbox' | 'development' | 'production';
  
  let secret = '';
  const rawSecret = settingsMap.get('plaid_secret');
  if (rawSecret) {
    try {
      secret = decrypt(rawSecret);
    } catch (e) {
      secret = rawSecret;
    }
  } else {
    secret = process.env.PLAID_SECRET || '';
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
}
