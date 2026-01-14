import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './src/lib/auth';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin'];
// Routes that require admin role
const adminRoutes = ['/admin'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes, static files, and other system routes
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Get token from cookie
    const sessionCookie = request.cookies.get('session');
    const token = sessionCookie?.value;

    // Verify token
    const session = token ? await verifyToken(token) : null;

    // Check if route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    // Redirect to login if trying to access protected route without session
    if (isProtectedRoute && !session) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check admin role for admin routes
    if (isAdminRoute && session) {
        const allowedRoles = ['admin', 'super-admin', 'owner'];
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes that handle their own auth
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};
