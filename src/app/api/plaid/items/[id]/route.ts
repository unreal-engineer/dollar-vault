import { getPlaidClient } from '@/lib/plaid';
import { db } from '@/lib/db';
import { items, accounts, transactions, syncCursors } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const plaidClient = await getPlaidClient();
    const { id } = await params;
    
    // Find item
    const itemQuery = await db.select().from(items).where(eq(items.id, id));
    if (itemQuery.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const item = itemQuery[0];

    // Remove from Plaid
    try {
      const accessToken = decrypt(item.plaidAccessToken);
      await plaidClient.itemRemove({ access_token: accessToken });
    } catch (plaidError) {
      console.warn('Error removing item from Plaid, proceeding to remove from DB locally', plaidError);
    }

    // Since we don't have ON DELETE CASCADE set up seamlessly in our Drizzle schema, let's delete manually
    // 1. Get accounts
    const relatedAccounts = await db.select().from(accounts).where(eq(accounts.itemId, id));
    for (const acc of relatedAccounts) {
      // Delete transactions
      await db.delete(transactions).where(eq(transactions.accountId, acc.id));
    }
    // Delete accounts
    await db.delete(accounts).where(eq(accounts.itemId, id));
    // Delete cursor
    await db.delete(syncCursors).where(eq(syncCursors.itemId, id));
    // Delete item
    await db.delete(items).where(eq(items.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking item:', error);
    return NextResponse.json({ error: 'Failed to unlink item' }, { status: 500 });
  }
}
