import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Register New User API
 *
 * Flow:
 * 1. Validate input
 * 2. Check if email/NIP already exists (using service role)
 * 3. Create user in Supabase Auth (auth.users)
 * 4. Create employee record manually (using service role to bypass RLS)
 * 5. Return success
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, dan nama wajib diisi.' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      )
    }

    // Validate password strength (min 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS policies
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if email already exists in employees (bypass RLS)
    const { data: existingEmployee, error: checkError } = await supabaseService
      .from('employees')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // STEP 1: Create user in Supabase Auth
    console.log(`📝 Creating Supabase Auth user for: ${email}`)

    const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm for manual registration
      user_metadata: {
        name: name,
        registered_at: new Date().toISOString(),
      },
    })

    if (authError) {
      console.error('Supabase Auth error:', authError)

      // Handle specific errors
      if (authError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar di Supabase Auth. Silakan login.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Gagal mendaftar. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Gagal membuat user. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    console.log(`✅ Supabase Auth user created: ${authData.user.id}`)

    // STEP 2: Create employee record manually using service role (bypasses RLS)
    console.log('📝 Creating employee record...')

    const { error: employeeError } = await supabaseService
      .from('employees')
      .insert({
        id: authData.user.id,
        auth_user_id: authData.user.id,
        email: email,
        name: name,
        is_active: false, // Require admin approval
        is_profile_complete: false, // Require profile completion
        email_verified: true, // Auto-verified since admin-created
        role: 'user', // Default role
      })

    if (employeeError) {
      console.error('Employee creation failed:', employeeError)

      // Rollback: Delete auth user if employee creation fails
      await supabaseService.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: `Gagal membuat data employee: ${employeeError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Employee created successfully')

    // STEP 3: Return success response
    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
      },
      redirect: '/login',
    }, { status: 201 })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
