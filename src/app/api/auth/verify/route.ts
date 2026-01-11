import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID diperlukan.' },
        { status: 400 }
      );
    }

    // Fetch employee data from Supabase
    const { data: employeeData, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !employeeData) {
      return NextResponse.json(
        { error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Check if account is active
    const dbIsActive = (employeeData as any).is_active;
    const isActive = dbIsActive !== false && (employeeData as any).isActive !== false;

    if (!isActive) {
      return NextResponse.json(
        { error: 'Akun dinonaktifkan.' },
        { status: 403 }
      );
    }

    // Remove sensitive data
    const { password: _, ...safeEmployeeData } = employeeData as any;

    return NextResponse.json({
      success: true,
      employee: safeEmployeeData
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Verify session API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
