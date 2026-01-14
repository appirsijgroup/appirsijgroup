import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface SessionPayload {
    userId: string;
    name: string;
    role: string;
    exp?: number;
}

/**
 * Create JWT token for user session
 */
export async function createToken(payload: SessionPayload): Promise<string> {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h') // Session expires in 8 hours
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verify JWT token (can be used in middleware and server components)
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as SessionPayload;
    } catch (error) {
        // Silently fail - token is invalid or expired
        return null;
    }
}

/**
 * Set session cookie (for use in Server Actions and Route Handlers)
 */
export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60, // 8 hours
        path: '/',
    });
}

/**
 * Get session from cookie (for use in Server Components and Route Handlers)
 */
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
        return null;
    }

    return verifyToken(sessionCookie.value);
}

/**
 * Clear session cookie (for use in Server Actions and Route Handlers)
 */
export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return session !== null;
}

/**
 * Check if user has required role
 */
export async function hasRole(requiredRoles: string[]): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;
    return requiredRoles.includes(session.role);
}
