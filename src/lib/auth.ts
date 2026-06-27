import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const COOKIE_NAME = 'budget_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── HMAC session token helpers (Node.js runtime only) ────────────────────────

function hmac(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

/**
 * Create a signed session token: `nonce.signature`
 * The nonce is a cryptographically random 32-byte hex string.
 */
export function createSessionToken(): string {
  const nonce = crypto.randomBytes(32).toString('hex');
  const sig = hmac(nonce);
  return `${nonce}.${sig}`;
}

/**
 * Validate a session token. Returns true if the HMAC signature is correct.
 */
export function validateSessionToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const dotIdx = token.lastIndexOf('.');
  const nonce = token.substring(0, dotIdx);
  const sig = token.substring(dotIdx + 1);
  if (!nonce || !sig) return false;
  const expected = hmac(nonce);
  // Timing-safe comparison — both buffers must be the same length
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ─── Password helpers ─────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Cookie option helpers ────────────────────────────────────────────────────

/** Standard options to apply when setting the session cookie. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: false, // LAN app — no HTTPS
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};
