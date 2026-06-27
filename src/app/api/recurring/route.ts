import { db } from '@/lib/db';
import { recurringTransactions, accounts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db
      .select({
        id: recurringTransactions.id,
        accountId: recurringTransactions.accountId,
        accountName: sql`COALESCE(${accounts.customName}, ${accounts.name})`.as('accountName'),
        merchantName: recurringTransactions.merchantName,
        description: recurringTransactions.description,
        amountAverage: recurringTransactions.amountAverage,
        amountLast: recurringTransactions.amountLast,
        frequency: recurringTransactions.frequency,
        isActive: recurringTransactions.isActive,
        isIncome: recurringTransactions.isIncome,
        nextExpectedDate: recurringTransactions.nextExpectedDate,
        lastDate: recurringTransactions.lastDate,
      })
      .from(recurringTransactions)
      .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id));

    return Response.json({ items: data });
  } catch (error: any) {
    console.error('Failed to get recurring transactions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
