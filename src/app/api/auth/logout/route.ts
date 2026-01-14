import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    await clearSession();

    return NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    }, { status: 200 });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Logout API error:', error);
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout.' },
      { status: 500 }
    );
  }
}
