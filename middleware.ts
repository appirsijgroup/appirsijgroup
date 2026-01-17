import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware untuk API dan static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Cek cookie userId
  const userId = request.cookies.get('userId')?.value

  // Debug log
  if (pathname === '/dashboard' || pathname === '/login') {
    console.log(`🔐 Middleware: ${pathname} - userId: ${userId ? '✅ ' + userId.substring(0, 8) + '...' : '❌ none'}`)
  }

  // Jika belum login dan bukan di halaman login, redirect ke login
  if (!userId && pathname !== '/login') {
    console.log('➡️ Redirecting to /login (no userId)')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika sudah login dan di halaman login, redirect ke dashboard
  if (userId && pathname === '/login') {
    console.log('➡️ Redirecting to /dashboard (already logged in)')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
