import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createToken, setSessionCookie } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const jwtSecret = process.env.JWT_SECRET

    // 1. Initial Diagnostic Check
    if (!supabaseUrl || !supabaseServiceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

      console.error('❌ Configuration Missing:', missing.join(', '));
      return NextResponse.json({
        error: 'Konfigurasi server tidak lengkap',
        details: `Missing: ${missing.join(', ')}. Check Vercel Environment Variables.`
      }, { status: 500 });
    }

    // JWT Secret check for Production
    if (!jwtSecret && process.env.NODE_ENV === 'production') {
      console.error('❌ JWT_SECRET is missing in production environment');
      return NextResponse.json({
        error: 'Security Configuration Error',
        details: 'JWT_SECRET must be set in Vercel. Code Version: 2026-01-18 11:15. If you already set it, please REDEPLOY your project on Vercel Dashboard because environment variables only take effect after a new build.',
        env_keys_present: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('JWT') || k.includes('NEXT_PUBLIC'))
      }, { status: 500 });
    }

    // 2. Parse payload safely
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('❌ Failed to parse login request body');
      return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
    }

    const { identifier, password } = body;
    if (!identifier || !password) {
      return NextResponse.json({ error: 'NIP/Email dan Password wajib diisi' }, { status: 400 });
    }

    console.log(`🔐 Login attempt for: "${identifier.substring(0, 4)}..."`);

    // 3. Database operation
    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    // We use .maybeSingle() to be more resilient and get a clean null if not found
    const { data: employee, error: dbError } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq."${identifier}",email.eq."${identifier}"`)
      .maybeSingle();

    if (dbError) {
      console.error('❌ Supabase Query Error:', dbError);
      return NextResponse.json({
        error: 'Database connection error',
        details: dbError.message
      }, { status: 500 });
    }

    if (!employee) {
      console.log(`❌ No employee found for identifier: ${identifier}`);
      return NextResponse.json({ error: 'Karyawan tidak ditemukan. Periksa NIP/Email Anda.' }, { status: 401 });
    }

    // 4. Password validation
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, employee.password);
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison failed:', bcryptError);
      throw new Error(`Auth internal error: ${bcryptError instanceof Error ? bcryptError.message : 'Encryption fail'}`);
    }

    if (!passwordMatch) {
      console.log('❌ Password mismatch for user:', employee.id);
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    // 5. Active status check
    if (employee.is_active === false) {
      return NextResponse.json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi Admin.' }, { status: 403 });
    }

    console.log(`✅ Authentication Success for: ${employee.name}`);

    // 6. Token Generation
    const sessionPayload = {
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      nip: employee.id,
      role: employee.role,
    };

    let token;
    try {
      token = await createToken(sessionPayload);
    } catch (jwtError) {
      console.error('❌ JWT Token generation failed:', jwtError);
      throw new Error(`Token generation failed: ${jwtError instanceof Error ? jwtError.message : 'Unknown reason'}`);
    }

    // 7. Success Response
    const response = NextResponse.json({
      success: true,
      message: 'Berhasil masuk',
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      }
    });

    // Set cookie
    setSessionCookie(response, token);

    return response;

  } catch (err: any) {
    console.error('🔥 CRITICAL LOGIN ERROR:', err);
    return NextResponse.json({
      error: 'Kesalahan internal sistem',
      details: err?.message || 'Unknown crash'
    }, { status: 500 });
  }
}
