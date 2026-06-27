import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { initDatabaseSchema } from '@/lib/db/init';
import { eq } from 'drizzle-orm';
import path from 'path';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, secret, env, ai_url, password } = body;

    if (!client_id || !secret || !env || !ai_url || !password) {
      return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
    }

    // 1. Initialize SQLite Database Schema
    const dbPath = path.join(process.cwd(), 'data', 'budget.db');
    initDatabaseSchema(dbPath);

    // 2. Encrypt Plaid secret
    const encryptedSecret = encrypt(secret);

    // 3. Hash the application master password
    const passwordHash = await bcrypt.hash(password, 10);

    // Helper to upsert settings in SQLite
    const saveSetting = async (key: string, value: string) => {
      await db.delete(systemSettings).where(eq(systemSettings.key, key));
      await db.insert(systemSettings).values({ key, value });
    };

    // 4. Write all configurations to database
    await saveSetting('plaid_client_id', client_id);
    await saveSetting('plaid_secret', encryptedSecret);
    await saveSetting('plaid_env', env);
    await saveSetting('ai_api_url', ai_url);
    await saveSetting('app_password_hash', passwordHash);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving system settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to save configurations' }, { status: 500 });
  }
}
