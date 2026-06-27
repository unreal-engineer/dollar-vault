import { syncAllItems } from '@/lib/sync';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const results = await syncAllItems();
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in manual sync:', error);
    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 });
  }
}
