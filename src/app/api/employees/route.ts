import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GET /api/employees
 * Get all employees (requires authentication)
 * Uses service role to bypass RLS policies
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated via userId cookie
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      console.log('❌ /api/employees - No userId cookie found')
      return NextResponse.json(
        { error: 'Unauthorized - No userId cookie' },
        { status: 401 }
      )
    }

    console.log('✅ /api/employees - Authenticated userId:', userId)

    // Use service role client to bypass RLS
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
