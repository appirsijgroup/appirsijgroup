import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/jwt'

/**
 * GET /api/employees/paginated
 * Get employees with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await verifyToken(sessionCookie)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 100)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseService
      .from('employees')
      .select('*', { count: 'exact' })

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    if (role) query = query.eq('role', role)
    if (isActive !== null && isActive !== undefined && isActive !== '') query = query.eq('is_active', isActive === 'true')

    const { data: employees, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to)

    if (error) return NextResponse.json({ error: 'Database query failed' }, { status: 500 })

    // 🔥 BANDWIDTH SAFETY
    const sanitizedEmployees = (employees || []).map(emp => {
      const { profile_picture, password, ...rest } = emp;
      return {
        ...rest,
        profilePicture: rest.avatar_url || null
      };
    });

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      employees: sanitizedEmployees,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
