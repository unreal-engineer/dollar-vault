import { db } from '@/lib/db';
import { transactions, accounts } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { desc, eq, and, or, like, gte, lte, SQL } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const accountId = searchParams.get('account')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';

    // Build dynamic WHERE conditions
    const conditions: SQL[] = [];
    if (search) {
      const searchParam = `%${search}%`;
      conditions.push(or(like(transactions.name, searchParam), like(transactions.merchantName, searchParam))!);
    }
    if (category) {
      conditions.push(or(eq(transactions.customCategory, category), eq(transactions.categoryPrimary, category))!);
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }
    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }

    const query = db
      .select()
      .from(transactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date));

    const allTransactions = await query;
    const allAccounts = await db.select().from(accounts);
    
    // Fetch profiles mapping
    const { profiles } = await import('@/lib/db/schema');
    const allProfiles = await db.select().from(profiles);
    const profilesMap = new Map(allProfiles.map(p => [p.name, p.icon]));

    const accountsMap = new Map(allAccounts.map((a) => [a.id, a]));

    const transactionsWithDetails = allTransactions.map((t) => {
      const acc = accountsMap.get(t.accountId);
      const owner = acc?.owner || 'Joint';
      return {
        ...t,
        accountName: acc?.customName || acc?.name || 'Unknown Account',
        accountOwner: owner,
        ownerIcon: profilesMap.get(owner) || '👥',
      };
    });

    return NextResponse.json({ transactions: transactionsWithDetails });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

