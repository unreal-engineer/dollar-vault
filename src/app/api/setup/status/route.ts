import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt to query system settings
    const settings = await db.select().from(systemSettings);
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    
    const hasPlaid = !!settingsMap.get('plaid_client_id');
    const hasPassword = !!settingsMap.get('app_password_hash');
    
    if (hasPlaid && hasPassword) {
      return NextResponse.json({ configured: true });
    }
    
    return NextResponse.json({ configured: false });
  } catch (error) {
    // If table doesn't exist or database is uninitialized, return unconfigured
    console.log('Database check during status returned unconfigured or error:', error);
    return NextResponse.json({ configured: false });
  }
}
