import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Clear session cookie if exists
    const cookieStore = await cookies();
    cookieStore.delete('session');

    console.log('🚪 User logged out successfully');

    return NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Logout API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat logout.' },
      { status: 500 }
    );
  }
}
