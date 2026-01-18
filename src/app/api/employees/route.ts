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

    // 🔥 FIX: Fetch all monthly activities to support analytics
    // Since activities are moved to a separate table, we must fetch and merge them
    const { data: allActivities, error: activitiesError } = await supabaseService
      .from('employee_monthly_activities')
      .select('employee_id, activities')

    if (activitiesError) {
      console.error('⚠️ Warning: Error fetching monthly activities for all employees:', activitiesError)
      // Don't fail the whole request, just proceed with basic employee data
    }

    // Map activities to a lookup object for fast access
    const activitiesLookup = (allActivities || []).reduce((acc: any, item: any) => {
      acc[item.employee_id] = item.activities;
      return acc;
    }, {});

    // Merge activities into employee objects
    const mergedEmployees = (employees || []).map(emp => ({
      ...emp,
      // Favor data from dedicated table, fallback to legacy field if present
      monthly_activities: activitiesLookup[emp.id] || emp.monthly_activities || {}
    }));

    console.log('✅ /api/employees - Returning', mergedEmployees.length, 'employees with merged activities')

    return NextResponse.json({
      employees: mergedEmployees
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
