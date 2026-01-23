import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/jwt'

/**
 * GET /api/employees
 * Get all employees (requires authentication)
 * Uses service role to bypass RLS policies
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated via session token
    const sessionCookie = request.cookies.get('session')?.value

    if (!sessionCookie) {
      console.warn('❌ [/api/employees] No session cookie found')
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const session = await verifyToken(sessionCookie)

    if (!session) {
      console.warn('❌ [/api/employees] Invalid session token')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      )
    }

    console.log('🔍 [/api/employees] Fetching employees for user:', session.userId)


    // 🔥 FIX: Add defensive check for environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [/api/employees] Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role client to bypass RLS
    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Check for limit parameter
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : null;

    // Fetch all employees
    let query = supabaseService
      .from('employees')
      .select('*')
      .order('name', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: employees, error } = await query;

    if (error) {
      console.error('❌ [/api/employees] Database query failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to fetch employees', details: error.message },
        { status: 500 }
      )
    }

    // 🔥 FIX: NO CACHE - activities are loaded separately via /api/monthly-activities
    // Map employees and set monthly_activities to empty object
    const mergedEmployees = (employees || []).map(emp => ({
      ...emp,
      monthly_activities: {} // Will be loaded separately via /api/monthly-activities
    }));


    // 🔥 DEBUG: Log first few employees to verify data
    if (process.env.NODE_ENV === "development") {
      console.log('✅ [/api/employees] Returning', mergedEmployees.length, 'employees')
    }

    return NextResponse.json({
      employees: mergedEmployees
    })

  } catch (error) {
    console.error('❌ [/api/employees] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
