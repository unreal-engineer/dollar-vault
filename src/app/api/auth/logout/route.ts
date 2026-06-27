import { COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  // Expire the cookie immediately
  cookieStore.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return NextResponse.json({ success: true });
}
