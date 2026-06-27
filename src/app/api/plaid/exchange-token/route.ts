import { getPlaidClient } from '@/lib/plaid';
import { db } from '@/lib/db';
import { items, accounts, syncCursors } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const plaidClient = await getPlaidClient();
    const { public_token } = await request.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // 1. Exchange the public token for an access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // 2. Fetch institution info (optional, for better UI)
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });
    
    let institutionName = 'Unknown Institution';
    if (itemResponse.data.item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: itemResponse.data.item.institution_id,
          country_codes: ['US' as any],
        });
        institutionName = instResponse.data.institution.name;
      } catch (e) {
        console.warn('Could not fetch institution name', e);
      }
    }

    // 3. Encrypt the access token before storing
    const encryptedAccessToken = encrypt(accessToken);

    // 4. Store Item in DB
    const itemIdDb = crypto.randomUUID();
    await db.insert(items).values({
      id: itemIdDb,
      plaidItemId: itemId,
      plaidAccessToken: encryptedAccessToken,
      institutionId: itemResponse.data.item.institution_id,
      institutionName,
    });

    // Initialize sync cursor
    await db.insert(syncCursors).values({
      itemId: itemIdDb,
      cursor: '',
    });

    // 5. Fetch and store accounts for this item
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountsToInsert = accountsResponse.data.accounts.map((acc) => ({
      id: crypto.randomUUID(),
      plaidAccountId: acc.account_id,
      itemId: itemIdDb,
      name: acc.name,
      officialName: acc.official_name,
      type: acc.type,
      subtype: acc.subtype,
      mask: acc.mask,
      currentBalance: acc.balances.current,
      availableBalance: acc.balances.available,
      isoCurrencyCode: acc.balances.iso_currency_code || 'USD',
      balanceUpdatedAt: new Date().toISOString(),
    }));

    if (accountsToInsert.length > 0) {
      await db.insert(accounts).values(accountsToInsert);
    }

    return NextResponse.json({ success: true, itemId: itemIdDb });
  } catch (error: any) {
    console.error('Error exchanging public token:', error.response?.data || error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
