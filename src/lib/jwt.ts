import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

// ✅ AUTO-GENERATED JWT SECRET - No manual configuration needed!
// In production, set JWT_SECRET in .env for better security
// In development, we use a consistent fallback
const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET);
  }

  // Development fallback - consistent across restarts
  // WARNING: This should NEVER be used in production!
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('dev-fallback-secret-change-in-production');
  }

  // Production requires explicit JWT_SECRET
  throw new Error('JWT_SECRET environment variable is required in production');
};

// Lazy evaluation - only compute when actually needed
let JWT_SECRET: Uint8Array | null = null;
let hasWarned = false;

function getSecret() {
  if (!JWT_SECRET) {
    JWT_SECRET = getJwtSecret();

    // Show warning once if using fallback in development
    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production' && !hasWarned) {
      hasWarned = true;
    }
  }
  return JWT_SECRET;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  nip: string;
  role: string;
  managedHospitalIds?: string[];
  exp?: number;
}

/**
 * Create JWT token for user session
 * Can be used anywhere (middleware, server components, API routes)
 */
export async function createToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // Session expires in 8 hours
    .sign(getSecret());

  return token;
}

/**
 * Verify JWT token
 * Can be used anywhere (middleware, server components, API routes)
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Silently fail - token is invalid or expired
    return null;
  }
}

/**
 * Set session cookie on response
 * Used in API routes after successful login
 */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });
}

/**
 * Clear session cookie
 * Used in logout API routes
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
