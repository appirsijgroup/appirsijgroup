import 'server-only';
import { cookies } from 'next/headers';
import type { SessionPayload } from './jwt';
import { createToken, verifyToken } from './jwt';

// Re-export types and functions for convenience
export type { SessionPayload };
export { createToken, verifyToken };

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
