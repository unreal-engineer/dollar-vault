import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'budget_session';

// Paths that are publicly accessible without authentication or setup
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/setup', '/api/setup'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Validate the session token using the Web Crypto API (Edge runtime compatible).
 * Token format: `nonce.hmac-sha256-hex-signature`
 */
async function isValidSessionToken(token: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const dotIdx = token.lastIndexOf('.');
  const nonce = token.substring(0, dotIdx);
  const sig = token.substring(dotIdx + 1);
  if (!nonce || !sig) return false;

  const encoder = new TextEncoder();
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    return false;
  }

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time string comparison to prevent timing attacks
  if (sig.length !== expectedHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function proxy(request: NextRequest) {
  // ── Auth bypass toggle ──────────────────────────────────────────────
  // Set AUTH_DISABLED=true in .env.local to skip password protection.
  // Remove or set to false when ready to re-enable authentication.
  if (process.env.AUTH_DISABLED === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static files through
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  // Allow public auth and setup paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 1. Check if the application has been configured (Plaid keys + Password)
  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.nextUrl.protocol || 'http:';
    const statusRes = await fetch(`${proto}//${host}/api/setup/status`, {
      cache: 'no-store',
    });
    
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (!statusData.configured) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Setup required', setupRequired: true }, { status: 400 });
        }
        return NextResponse.redirect(new URL('/setup', request.url));
      }
    }
  } catch (err) {
    console.error('Error checking setup status in proxy:', err);
  }

  // 2. Check for session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = token ? await isValidSessionToken(token) : false;

  if (!authenticated) {
    // API routes: return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Pages: redirect to /login with the original destination as a query param
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
