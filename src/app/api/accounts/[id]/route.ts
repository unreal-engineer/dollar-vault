import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accounts, transactions, recurringTransactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { customName, owner } = await req.json();

    const updates: any = {};
    if (customName !== undefined) {
      updates.customName = customName.trim() === '' ? null : customName.trim();
    }
    if (owner !== undefined) {
      updates.owner = owner;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(accounts)
        .set(updates)
        .where(eq(accounts.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
