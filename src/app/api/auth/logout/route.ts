import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    })

    // Hapus cookie session
    clearSessionCookie(response)

    // Also delete legacy userId cookie just in case
    response.cookies.delete('userId')

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    )
  }
}
