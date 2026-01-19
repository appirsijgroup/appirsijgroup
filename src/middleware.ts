import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware untuk API dan static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Cek cookie session
  const sessionCookie = request.cookies.get('session')?.value

  // Verify token
  let session = null
  if (sessionCookie) {
    // We can't import verifyToken directly securely in middleware if it depends on node modules that aren't edge compatible
    // But jose is edge compatible.
    // However, importing from @/lib/jwt might bring in other dependencies if not careful.
    // Let's assume verifyToken is safe for middleware (it uses jose which is safe).
    try {
      // We need to import verifyToken at the top level
      session = await verifyToken(sessionCookie)
    } catch (e) {
    }
  }

  const userId = session?.userId
  const isAuthenticated = !!userId

  // Protect API routes
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth/login') && !pathname.startsWith('/api/auth/register') && !pathname.startsWith('/api/auth/verify')) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Jika belum login dan bukan di halaman login, redirect ke login
  if (!isAuthenticated && pathname !== '/login' && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika sudah login dan di halaman login, redirect ke dashboard
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
