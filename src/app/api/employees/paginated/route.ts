import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/jwt'

/**
 * GET /api/employees/paginated
 *
 * Get employees with pagination and filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (filter by name/email)
 * - role: string (filter by role)
 * - isActive: boolean (filter by active status)
 *
 * Example:
 * GET /api/employees/paginated?page=1&limit=20&search=budi&role=employee&isActive=true
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session')?.value

    if (!sessionCookie) {
      console.error('❌ /api/employees/paginated - No session cookie found')
      return NextResponse.json(
        { error: 'Unauthorized - No session cookie found. Please login again.' },
        { status: 401 }
      )
    }

    const session = await verifyToken(sessionCookie)

    if (!session) {
      console.error('❌ /api/employees/paginated - Invalid session token')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session. Please login again.' },
        { status: 401 }
      )
    }

    console.log(`✅ /api/employees/paginated - Authenticated user:`, session.userId || session.email)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 100) // Default 15, Max 100
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    // Calculate offset for pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    console.log(`📄 /api/employees/paginated - page: ${page}, limit: ${limit}`)

    // Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      console.error('❌ /api/employees/paginated - NEXT_PUBLIC_SUPABASE_URL not configured')
      return NextResponse.json(
        { error: 'Server configuration error - Missing Supabase URL' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      console.error('❌ /api/employees/paginated - SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error - Missing Supabase service key' },
        { status: 500 }
      )
    }

    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Build query
    let query = supabaseService
      .from('employees')
      .select('*', { count: 'exact' }) // ✅ Get ALL employee fields for complete data

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    }

    // Apply pagination and ordering
    const { data: employees, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('❌ /api/employees/paginated - Supabase query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        {
          error: 'Database query failed',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      console.warn('⚠️ /api/employees/paginated - No employees found (count:', count, ')')
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    console.log(`✅ /api/employees/paginated - Returning ${employees?.length || 0} of ${count} employees (page ${page}/${totalPages})`)

    return NextResponse.json({
      employees: employees || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
