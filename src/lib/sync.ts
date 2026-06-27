import { getPlaidClient } from './plaid';
import { db } from './db';
import { items, syncCursors, transactions, accounts } from './db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decrypt } from './crypto';
import { autoCategorize, isExcludedTransaction } from './auto-categorize';

export async function syncTransactions(itemId: string, encryptedAccessToken: string) {
  const plaidClient = await getPlaidClient();
  const accessToken = decrypt(encryptedAccessToken);

  // 1. Get the current cursor from the database
  const cursorRecord = await db.select().from(syncCursors).where(eq(syncCursors.itemId, itemId));
  let cursor = cursorRecord.length > 0 ? cursorRecord[0].cursor : '';

  let hasMore = true;
  let added: any[] = [];
  let modified: any[] = [];
  let removed: any[] = [];

  // 2. Paginate through the Plaid sync API
  while (hasMore) {
    const request: any = {
      access_token: accessToken,
      cursor: cursor || undefined,
      count: 500,
    };

    try {
      const response = await plaidClient.transactionsSync(request);
      const data = response.data;

      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed);

      hasMore = data.has_more;
      cursor = data.next_cursor;
    } catch (err: any) {
      console.error('Error syncing transactions:', err.response?.data || err);
      throw err;
    }
  }

  // Fetch all accounts for this item to map plaid_account_id -> our internal db account.id
  const itemAccounts = await db.select().from(accounts).where(eq(accounts.itemId, itemId));
  const accountIdMap = new Map(itemAccounts.map(a => [a.plaidAccountId, a.id]));

  // Fetch all active category rules
  const { categoryRules } = await import('./db/schema');
  const activeRules = await db.select().from(categoryRules).where(eq(categoryRules.isActive, true));

  // 3. Process database updates if there are any changes
  if (added.length > 0 || modified.length > 0) {
    const incomingTxs = [...added, ...modified].filter(t => accountIdMap.has(t.account_id));
    const txIds = incomingTxs.map(t => t.transaction_id);
    
    let existingMap = new Map();
    if (txIds.length > 0) {
      const existingTxs = await db.select().from(transactions).where(inArray(transactions.plaidTransactionId, txIds));
      existingMap = new Map(existingTxs.map(t => [t.plaidTransactionId, t]));
    }

    const toUpsert = incomingTxs.map((t) => {
      const existing = existingMap.get(t.transaction_id);
      
      const autoExcluded = isExcludedTransaction(
        t.name, 
        t.merchant_name || null, 
        t.personal_finance_category?.primary || null, 
        t.personal_finance_category?.detailed || null
      );
      
      const autoCat = autoCategorize(
        t.name, 
        t.merchant_name || null, 
        t.personal_finance_category?.primary || null, 
        t.personal_finance_category?.detailed || null,
        activeRules
      );

      return {
        id: existing ? existing.id : crypto.randomUUID(),
        plaidTransactionId: t.transaction_id,
        accountId: accountIdMap.get(t.account_id)!,
        amount: t.amount,
        date: t.date,
        datetime: t.datetime || null,
        name: t.name,
        merchantName: t.merchant_name || null,
        pending: t.pending,
        categoryPrimary: t.personal_finance_category?.primary || null,
        categoryDetailed: t.personal_finance_category?.detailed || null,
        categoryConfidence: t.personal_finance_category?.confidence_level || null,
        paymentChannel: t.payment_channel,
        isoCurrencyCode: t.iso_currency_code || 'USD',
        excluded: existing ? existing.excluded : autoExcluded,
        customCategory: existing ? existing.customCategory : autoCat,
        notes: existing ? existing.notes : null,
      };
    });

    if (txIds.length > 0) {
      // Clean up modified so we can re-insert
      await db.delete(transactions).where(inArray(transactions.plaidTransactionId, txIds));
      await db.insert(transactions).values(toUpsert);
    }
  }

  if (removed.length > 0) {
    const removedIds = removed.map((r) => r.transaction_id);
    await db.delete(transactions).where(inArray(transactions.plaidTransactionId, removedIds));
  }

  // 4. Save the new cursor
  if (cursorRecord.length > 0) {
    await db.update(syncCursors).set({ cursor, lastSyncedAt: new Date().toISOString() }).where(eq(syncCursors.itemId, itemId));
  } else {
    await db.insert(syncCursors).values({ itemId, cursor, lastSyncedAt: new Date().toISOString() });
  }

  // 5. Update Account Balances
  try {
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccounts = accountsResponse.data.accounts;
    const now = new Date().toISOString();
    
    for (const pa of plaidAccounts) {
      if (accountIdMap.has(pa.account_id)) {
        await db.update(accounts)
          .set({
            currentBalance: pa.balances.current,
            availableBalance: pa.balances.available,
            balanceUpdatedAt: now
          })
          .where(eq(accounts.plaidAccountId, pa.account_id));
      }
    }
  } catch (err) {
    console.error('Failed to update account balances during sync', err);
  }

  return { added: added.length, modified: modified.length, removed: removed.length };
}

export async function syncAllItems() {
  const allItems = await db.select().from(items).where(eq(items.status, 'active'));
  const results = [];

  for (const item of allItems) {
    try {
      const result = await syncTransactions(item.id, item.plaidAccessToken);
      results.push({ institution: item.institutionName, status: 'success', ...result });
    } catch (err: any) {
      if (err.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
        await db.update(items).set({ status: 'error', errorCode: 'ITEM_LOGIN_REQUIRED' }).where(eq(items.id, item.id));
      }
      results.push({ institution: item.institutionName, status: 'error', error: err.message });
    }
  }

  return results;
}
