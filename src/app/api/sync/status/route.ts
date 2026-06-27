import { db } from '@/lib/db';
import { syncCursors } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const cursors = await db.select().from(syncCursors).orderBy(desc(syncCursors.lastSyncedAt));
    // Return the most recent sync time across all Items
    const lastSyncedAt = cursors.length > 0 ? cursors[0].lastSyncedAt : null;
    return NextResponse.json({ lastSyncedAt });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}
