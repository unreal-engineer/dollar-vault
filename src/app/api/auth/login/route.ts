import crypto from 'crypto';
import { createSessionToken, COOKIE_NAME, SESSION_COOKIE_OPTIONS, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    let isValid = false;
    let appPasswordHash = null;

    try {
      const { eq } = await import('drizzle-orm');
      const { db } = await import('@/lib/db');
      const { systemSettings } = await import('@/lib/db/schema');
      const settings = await db.select().from(systemSettings).where(eq(systemSettings.key, 'app_password_hash')).limit(1);
      if (settings.length > 0) {
        appPasswordHash = settings[0].value;
      }
    } catch (e) {
      console.warn('Could not read app_password_hash from SQLite settings:', e);
    }

    // Fallback to environment variables
    if (!appPasswordHash) {
      appPasswordHash = process.env.APP_PASSWORD_HASH;
    }

    if (appPasswordHash) {
      isValid = await verifyPassword(password, appPasswordHash);
    } else {
      const appPassword = process.env.APP_PASSWORD;
      if (!appPassword) {
        console.error('Neither APP_PASSWORD nor APP_PASSWORD_HASH is configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      // Constant-time comparison to prevent timing attacks
      // Pad both buffers to the same length before comparing so timingSafeEqual doesn't throw
      const a = Buffer.from(password);
      const b = Buffer.from(appPassword);
      const maxLen = Math.max(a.length, b.length);
      const aPadded = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
      const bPadded = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);

      isValid = a.length === b.length && crypto.timingSafeEqual(aPadded, bPadded);
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create a signed session token and set it as an HTTP-only cookie
    const token = createSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

