import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes yang memerlukan autentikasi
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/analytics',
  '/aktivitas-bulanan',
  '/presensi',
  '/pengumuman',
  '/kegiatan',
  '/alquran',
  '/panduan-doa',
  '/profile',
];

// Routes yang boleh diakses tanpa login
const publicRoutes = [
  '/login',
  '/test', // Hanya di development
  '/test-supabase', // Hanya di development
  '/migrate-employees', // Hanya di development
];

// Test routes - HANYA di development
const testRoutes = ['/test', '/test-supabase', '/migrate-employees'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    // Block test routes in production
    if (testRoutes.includes(pathname) && process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('loggedInUserId');

  // If trying to access protected route without session
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and trying to access login page
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Block access to test files in production
  if (process.env.NODE_ENV === 'production') {
    // Block any route containing test, debug, or migrate
    if (pathname.includes('/test') || pathname.includes('/migrate')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
