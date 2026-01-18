import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createToken, setSessionCookie } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase environment variables not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'ID/NIP/Email dan password wajib diisi' }, { status: 400 })
    }

    console.log(`🔐 Login attempt: ${identifier}`)

    // Cari employee by id atau email
    // Note: id IS the NIP/NOPEG, there's no separate nip column
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq."${identifier}",email.eq.${identifier}`)
      .single()

    if (error || !employee) {
      console.log('❌ Employee not found:', error?.message)
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

    // Create session payload
    const sessionPayload = {
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      nip: employee.id, // id IS the NIP/NOPEG
      role: employee.role,
    }

    // Generate JWT
    const token = await createToken(sessionPayload)

    // Prepare response
    const response = NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        nip: employee.id, // id IS the NIP/NOPEG
        role: employee.role,
      }
    })

    // Set secure session cookie
    setSessionCookie(response, token)

    console.log('🍪 Secure session cookie set for user:', employee.id)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
