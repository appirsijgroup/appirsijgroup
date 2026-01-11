import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

// Rate limiting: Store attempts in memory (in production, use Redis)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (attempts) {
    if (now > attempts.resetTime) {
      // Reset the counter if lockout period has passed
      loginAttempts.delete(identifier);
      return { allowed: true };
    }

    if (attempts.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((attempts.resetTime - now) / 1000);
      return {
        allowed: false,
        error: `Terlalu banyak percobaan login. Coba lagi dalam ${remainingTime} detik.`
      };
    }
  }

  return { allowed: true };
}

function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || { count: 0, resetTime: now + LOCKOUT_DURATION };

  attempts.count++;
  loginAttempts.set(identifier, attempts);

  if (attempts.count >= MAX_ATTEMPTS) {
    console.warn(`🚨 Account locked for identifier: ${identifier} due to too many failed attempts`);
  }
}

function resetAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    // Validate input
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'NIP/Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(identifier);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    console.log('🔑 Login attempt:', identifier);

    // Fetch employee from Supabase
    const { data: employeeData, error } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq.${identifier},email.eq.${identifier}`)
      .single();

    const employee = employeeData as any;

    if (error) {
      console.error('❌ Supabase error:', error);

      if (error.code === 'PGRST116') {
        recordFailedAttempt(identifier);
        return NextResponse.json(
          { error: `NIP/Email "${identifier}" tidak ditemukan.` },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Database error. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    if (!employee) {
      recordFailedAttempt(identifier);
      console.error('❌ Employee not found for identifier:', identifier);
      return NextResponse.json(
        { error: `NIP/Email "${identifier}" tidak ditemukan.` },
        { status: 401 }
      );
    }

    // Check if account is active
    const dbIsActive = employee.is_active;
    const isActive = dbIsActive !== false && employee.isActive !== false;

    if (!isActive) {
      recordFailedAttempt(identifier);
      console.error('❌ Account inactive:', employee.id);
      return NextResponse.json(
        { error: `Akun untuk ${employee.name} dinonaktifkan. Hubungi Admin.` },
        { status: 403 }
      );
    }

    // Password verification
    let isMatch = false;

    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isHashed = employee.password &&
      (employee.password.startsWith('$2a$') ||
       employee.password.startsWith('$2b$') ||
       employee.password.startsWith('$2y$'));

    if (isHashed) {
      try {
        isMatch = bcrypt.compareSync(password, employee.password);
      } catch (err) {
        console.error('❌ Bcrypt error:', err);
        return NextResponse.json(
          { error: 'Error validasi password. Silakan coba lagi.' },
          { status: 500 }
        );
      }
    } else {
      // Legacy plain text fallback
      if (employee.password === password || employee.password === `hashed_${password}`) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      recordFailedAttempt(identifier);
      console.error('❌ Password mismatch for user:', employee.id);
      return NextResponse.json(
        { error: 'Password salah. Silakan coba lagi.' },
        { status: 401 }
      );
    }

    // Successful login - reset attempts
    resetAttempts(identifier);

    // Remove sensitive data before sending to client
    const { password: _, ...safeEmployeeData } = employee;

    console.log('✅ Login successful for:', employee.name);

    return NextResponse.json({
      success: true,
      employee: safeEmployeeData
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Login API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
