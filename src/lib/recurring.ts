import { getPlaidClient } from './plaid';
import { db } from './db';
import { items, accounts, recurringTransactions } from './db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decrypt } from './crypto';

export async function syncRecurringTransactions() {
  const plaidClient = await getPlaidClient();
  const allItems = await db.select().from(items).where(eq(items.status, 'active'));
  let totalStreams = 0;

  for (const item of allItems) {
    try {
      const token = decrypt(item.plaidAccessToken);
      const accs = await db.select().from(accounts).where(eq(accounts.itemId, item.id));
      const accIdMap = new Map(accs.map(a => [a.plaidAccountId, a.id]));

      const response = await plaidClient.transactionsRecurringGet({
        access_token: token,
        account_ids: accs.map(a => a.plaidAccountId)
      });

      const { inflow_streams, outflow_streams } = response.data;
      
      const allStreams = [
        ...inflow_streams.map(s => ({ ...s, isIncome: true })),
        ...outflow_streams.map(s => ({ ...s, isIncome: false }))
      ];

      for (const stream of allStreams) {
        if (!accIdMap.has(stream.account_id)) continue;
        
        const data = {
          id: stream.stream_id,
          plaidStreamId: stream.stream_id,
          accountId: accIdMap.get(stream.account_id)!,
          merchantName: stream.merchant_name || null,
          description: stream.description,
          amountAverage: Math.abs(stream.average_amount?.amount || 0),
          amountLast: stream.last_amount?.amount ? Math.abs(stream.last_amount.amount) : null,
          frequency: stream.frequency,
          categoryPrimary: stream.personal_finance_category?.primary || null,
          isActive: stream.is_active,
          isIncome: stream.isIncome,
          lastDate: stream.last_date,
          nextExpectedDate: stream.predicted_next_date,
        };

        // Upsert
        const existing = await db.select().from(recurringTransactions).where(eq(recurringTransactions.plaidStreamId, stream.stream_id));
        if (existing.length > 0) {
          await db.update(recurringTransactions).set(data).where(eq(recurringTransactions.plaidStreamId, stream.stream_id));
        } else {
          await db.insert(recurringTransactions).values(data);
        }
        totalStreams++;
      }
    } catch (err: any) {
      console.error(`Error syncing recurring for item ${item.id}:`, err.response?.data || err);
    }
  }
  return { success: true, count: totalStreams };
}
