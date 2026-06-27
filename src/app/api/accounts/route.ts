import { db } from '@/lib/db';
import { items, accounts } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allItems = await db.select().from(items).where(eq(items.status, 'active'));
    const allAccounts = await db.select().from(accounts);
    
    // Group accounts by item
    const itemsWithAccounts = allItems.map(item => ({
      ...item,
      accounts: allAccounts.filter(acc => acc.itemId === item.id)
    }));

    return NextResponse.json({ items: itemsWithAccounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
