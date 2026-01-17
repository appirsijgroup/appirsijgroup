import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Simple Supabase client with service role
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'ID/NIP/Email dan password wajib diisi' }, { status: 400 })
    }

    console.log(`🔐 Login attempt: ${identifier}`)

    // Cari employee by id, nip, atau email
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq.${identifier},nip.eq.${identifier},email.eq.${identifier}`)
      .single()

    if (error || !employee) {
      console.log('❌ Employee not found')
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 401 })
    }

    // Cek password
    const passwordMatch = await bcrypt.compare(password, employee.password)
    if (!passwordMatch) {
      console.log('❌ Wrong password')
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Cek aktif
    if (!employee.is_active) {
      return NextResponse.json({ error: 'Akun tidak aktif' }, { status: 403 })
    }

    console.log(`✅ Login success: ${employee.name}`)

    // Simpan ke cookie
    const response = NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        nip: employee.nip,
        role: employee.role,
      }
    })

    // Set cookie dengan benar untuk development
    response.cookies.set('userId', employee.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false di development
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 jam
      path: '/' // penting!
    })

    console.log('🍪 Cookie set for userId:', employee.id)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
