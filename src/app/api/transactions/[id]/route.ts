import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow patching user-controlled fields
    const { customCategory, notes, excluded } = body;
    const updates: Record<string, unknown> = {};

    if (customCategory !== undefined) updates.customCategory = customCategory;
    if (notes !== undefined) updates.notes = notes;
    if (excluded !== undefined) updates.excluded = Boolean(excluded);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction: updated[0] });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
