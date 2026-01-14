import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch employee data from Supabase
    const { data: employeeData, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', session.userId)
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
      console.error('Verify session API error:', error);
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
