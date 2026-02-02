import 'server-only';
import { cookies } from 'next/headers';
import type { SessionPayload } from './jwt';
import { createToken, verifyToken } from './jwt';

// Re-export types and functions for convenience
export type { SessionPayload };
export { createToken, verifyToken };

/**
 * Extended session payload with additional role and activation information
 */
export interface ExtendedSessionPayload extends SessionPayload {
  userId: string;
  email: string;
  name: string;
  nip: string;
  role: string;
  canBeMentor?: boolean;
  canBeSupervisor?: boolean;
  canBeKaUnit?: boolean;
  canBeDirut?: boolean;
  functionalRoles?: string[];
  activatedMonths?: string[];
  mentorId?: string;
  supervisorId?: string;
  kaUnitId?: string;
  dirutId?: string;
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
export async function getSession(): Promise<ExtendedSessionPayload | null> {
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

/**
 * Check if user has specific extended role
 */
export async function hasExtendedRole(roleField: keyof ExtendedSessionPayload): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;

    const roleValue = session[roleField];
    if (typeof roleValue === 'boolean') {
        return roleValue;
    }
    if (Array.isArray(roleValue)) {
        return roleValue.length > 0;
    }
    return !!roleValue;
}

/**
 * Get user's extended role information
 */
export async function getUserExtendedInfo(): Promise<Partial<ExtendedSessionPayload> | null> {
    const session = await getSession();
    if (!session) return null;

    return {
        role: session.role,
        canBeMentor: session.canBeMentor,
        canBeSupervisor: session.canBeSupervisor,
        canBeKaUnit: session.canBeKaUnit,
        canBeDirut: session.canBeDirut,
        functionalRoles: session.functionalRoles,
        activatedMonths: session.activatedMonths,
        mentorId: session.mentorId,
        supervisorId: session.supervisorId,
        kaUnitId: session.kaUnitId,
        dirutId: session.dirutId,
    };
}
