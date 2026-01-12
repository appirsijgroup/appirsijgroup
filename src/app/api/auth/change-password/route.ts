import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/services/database.types';

/**
 * API Endpoint untuk mengubah password
 * Menerima: userId, oldPassword, newPassword
 * Memvalidasi old password dan update dengan new password di server side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, oldPassword, newPassword } = body;

    // Validate input
    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'User ID, password lama, dan password baru wajib diisi.' },
        { status: 400 }
      );
    }

    console.log('🔑 Password change attempt for user:', userId);

    // Fetch employee from Supabase with password
    const { data: employeeData, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    const employee = employeeData as any;

    if (error || !employee) {
      console.error('❌ Employee not found:', error);
      return NextResponse.json(
        { error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Validate old password
    let isOldPasswordValid = false;
    const storedPassword = employee.password;

    if (storedPassword.startsWith('$2')) {
      try {
        isOldPasswordValid = bcrypt.compareSync(oldPassword, storedPassword);
      } catch (e) {
        console.error('❌ Bcrypt error:', e);
        return NextResponse.json(
          { error: 'Error validasi password. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    } else {
      // Legacy plain text fallback
      isOldPasswordValid = (oldPassword === storedPassword || oldPassword === `hashed_${storedPassword}`);
    }

    if (!isOldPasswordValid) {
      console.error('❌ Old password mismatch for user:', userId);
      return NextResponse.json(
        { error: 'Password lama salah.' },
        { status: 401 }
      );
    }

    // Check if old and new password are the same
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password lama.' },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

    // Update password in database
    const { error: updateError } = await (supabase as any)
      .from('employees')
      .update({
        password: hashedPassword,
        must_change_password: false
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Update password error:', updateError);
      return NextResponse.json(
        { error: 'Gagal mengupdate password. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    console.log('✅ Password changed successfully for user:', employee.name);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah.'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Change password API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
