import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    })

    // Hapus cookie session dengan path yang sesuai
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    // Also delete legacy cookies
    response.cookies.delete('userId')

    return response

  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    )
  }
}
