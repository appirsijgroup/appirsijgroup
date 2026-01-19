import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get userId from cookie
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No userId cookie' },
        { status: 401 }
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
    if (process.env.NODE_ENV === 'development') {
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
