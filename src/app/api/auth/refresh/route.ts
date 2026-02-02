import { NextRequest, NextResponse } from 'next/server'
import { getSession, createToken } from '@/lib/auth'

/**
 * Refresh token endpoint
 * This extends the session by creating a new token with updated expiration
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const currentSession = await getSession()

    if (!currentSession) {
      return NextResponse.json(
        { error: 'No valid session to refresh' },
        { status: 401 }
      )
    }

    // Create new token with same payload but fresh expiration
    const newToken = await createToken({
      userId: currentSession.userId,
      email: currentSession.email,
      name: currentSession.name,
      nip: currentSession.nip,
      role: currentSession.role,
    })

    // Set new session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Session refreshed successfully'
    })

    // Set the cookie on the response
    response.cookies.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}
