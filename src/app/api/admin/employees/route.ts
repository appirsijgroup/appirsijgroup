import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/services/database.types';
import { createClient } from '@/lib/supabase/server';

// Service role client - bypasses RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const serviceRoleClient = supabaseServiceKey
  ? createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Parse Supabase error and return user-friendly message
 */
function parseSupabaseError(error: any): string {
  // Handle PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        if (error.details) {
          if (error.details.includes('email')) {
            return 'Email sudah terdaftar. Gunakan email lain.';
          }
          if (error.details.includes('nip')) {
            return 'NIP sudah terdaftar. Gunakan NIP lain.';
          }
          if (error.details.includes('id')) {
            return 'Terjadi kesalahan sistem. Silakan coba lagi atau hubungi IT support.';
          }
        }
        return 'Data sudah terdaftar. Silakan periksa kembali data Anda.';

      case '23503': // Foreign key violation
        return 'Data referensi tidak valid. Silakan periksa kembali.';

      case '23502': // Not null violation
        return 'Semua field wajib diisi. Lengkapi semua data yang diperlukan.';

      case '22001': // String data too long
        return 'Data terlalu panjang. Persingkat beberapa field.';

      case '08XXX': // Connection error
      case '57XXX': // System error
        return 'Terjadi kesalahan koneksi database. Silakan coba lagi.';

      default:
        return 'Terjadi kesalahan database. Silakan coba lagi.';
    }
  }

  // Handle Supabase Auth errors
  if (error.message) {
    if (error.message.includes('User already registered')) {
      return 'Email sudah terdaftar. Gunakan email lain.';
    }
    if (error.message.includes('Invalid email')) {
      return 'Format email tidak valid.';
    }
    if (error.message.includes('Password')) {
      return 'Password tidak memenuhi syarat. Gunakan minimal 6 karakter.';
    }
  }

  // Default error message
  return error.message || 'Terjadi kesalahan tak terduga. Silakan coba lagi.';
}

/**
 * POST /api/admin/employees
 *
 * Create new employee (by Admin)
 *
 * Flow:
 * 1. Verify admin authentication
 * 2. Create user in Supabase Auth (auth.users)
 * 3. Create employee record (linked via auth_user_id)
 * 4. Return created employee
 */
export async function POST(request: NextRequest) {
  try {
    if (!serviceRoleClient) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Verify session and check admin role
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: adminEmployee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminEmployee || !['admin', 'super-admin', 'owner'].includes(adminEmployee.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create employees' },
        { status: 403 }
      );
    }

    // Parse the request body
    const employeeData = await request.json();

    // Validate required fields
    const { name, email, nip, password, role, ...otherFields } = employeeData;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nama dan Email wajib diisi' },
        { status: 400 }
      );
    }

    // Validate NIP if provided
    if (nip && nip.trim() === '') {
      return NextResponse.json(
        { error: 'NIP tidak boleh kosong' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: `Email ${email} sudah terdaftar. Gunakan email lain.` },
        { status: 409 }
      );
    }

    // Check if NIP already exists (if provided)
    if (nip && nip.trim()) {
      const { data: existingNIP } = await supabase
        .from('employees')
        .select('id, nip')
        .eq('nip', nip.trim())
        .single();

      if (existingNIP) {
        return NextResponse.json(
          { error: `NIP ${nip} sudah terdaftar. Gunakan NIP lain.` },
          { status: 409 }
        );
      }
    }

    // STEP 1: Create user in Supabase Auth

    // Generate temporary password if not provided
    const tempPassword = password || Math.random().toString(36).slice(-8);

    const { data: authData, error: createAuthError } = await serviceRoleClient.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email (admin created)
      user_metadata: {
        name: name,
        created_by: user.id,
        created_by_email: user.email,
      },
    });

    if (createAuthError) {

      const userFriendlyError = parseSupabaseError(createAuthError);

      return NextResponse.json(
        { error: userFriendlyError },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Gagal membuat user. Silakan coba lagi.' },
        { status: 500 }
      );
    }


    // STEP 2: Create employee record
    const employeeRecord = {
      id: authData.user.id, // Use auth user ID as employee ID
      auth_user_id: authData.user.id, // Link to auth.users
      email: email,
      name: name,
      nip: nip?.trim() || null, // NIP (Nomor Pegawai) - separate from UUID id
      password: tempPassword, // Store for reference (will be hashed by Supabase)
      role: role || 'user',
      is_active: true, // Admin-created users are auto-active
      is_profile_complete: true, // Admin-created users are considered complete
      email_verified: true, // Admin-created users are verified
      phone: otherFields.phone || null,
      address: otherFields.address || null,
      position: otherFields.position || null,
      department: otherFields.department || null,
      join_date: otherFields.join_date || new Date().toISOString().split('T')[0],
      ...otherFields,
    };

    const { data: newEmployee, error: insertError } = await serviceRoleClient
      .from('employees')
      .insert(employeeRecord)
      .select()
      .single();

    if (insertError) {

      // Rollback: Delete auth user if employee creation fails
      await serviceRoleClient.auth.admin.deleteUser(authData.user.id);

      const userFriendlyError = parseSupabaseError(insertError);

      return NextResponse.json(
        { error: userFriendlyError },
        { status: 400 }
      );
    }


    // STEP 3: Return success response
    return NextResponse.json({
      success: true,
      data: newEmployee,
      tempPassword: tempPassword, // Include temp password so admin can share it
      message: 'Karyawan berhasil ditambahkan'
    }, { status: 201 });

  } catch (error: any) {

    const userFriendlyError = parseSupabaseError(error);

    return NextResponse.json(
      { error: userFriendlyError },
      { status: 500 }
    );
  }
}
