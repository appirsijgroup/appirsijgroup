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
      console.log('❌ /api/employees - No session cookie found')
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const session = await verifyToken(sessionCookie)

    if (!session) {
      console.log('❌ /api/employees - Invalid session token')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      )
    }

    console.log('✅ /api/employees - Authenticated userId:', session.userId)

    // 🔥 FIX: Add defensive check for environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase environment variables not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role client to bypass RLS
    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Fetch all employees
    const { data: employees, error } = await supabaseService
      .from('employees')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    console.log('✅ /api/employees - Returning', employees?.length || 0, 'employees')

    return NextResponse.json({
      employees: employees || []
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
