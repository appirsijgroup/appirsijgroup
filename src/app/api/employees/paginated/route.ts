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

    // 🔥 ROLE-BASED ACCESS CONTROL
    const isSuperAdmin = session.role === 'super-admin'
    const managedHospitalIds = session.managedHospitalIds || []

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 100)
    const search = searchParams.get('search') || ''
    const hospitalId = searchParams.get('hospitalId') || ''
    const role = searchParams.get('role') || ''
    const isActive = searchParams.get('isActive')

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseService
      .from('employees')
      .select(`
        *,
        mutabaah_activations (
          month_key
        )
      `, { count: 'exact' })

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

    // 🔥 ENFORCE HOSPITAL SCOPING
    if (!isSuperAdmin) {
      // If regular admin, they can ONLY see their managed hospitals
      if (hospitalId) {
        // If they filtered by a specific hospital, check if they have access to it
        if (!managedHospitalIds.includes(hospitalId)) {
          // No access to this hospital, return empty result or force filter to managed ones
          query = query.in('hospital_id', managedHospitalIds)
        } else {
          query = query.eq('hospital_id', hospitalId)
        }
      } else {
        // No filter provided, show all hospitals THEY MANAGE
        if (managedHospitalIds.length > 0) {
          query = query.in('hospital_id', managedHospitalIds)
        } else {
          // Admin with no assigned hospitals? Return nothing for safety
          return NextResponse.json({
            employees: [],
            pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
          })
        }
      }
    } else {
      // Super Admin can see everything or filter by any hospital
      if (hospitalId) query = query.eq('hospital_id', hospitalId)
    }

    if (role) query = query.eq('role', role)
    if (isActive !== null && isActive !== undefined && isActive !== '') query = query.eq('is_active', isActive === 'true')

    const { data: employees, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to)

    if (error) return NextResponse.json({ error: 'Database query failed' }, { status: 500 })

    // 🔥 BANDWIDTH SAFETY + ACTIVATION MAPPING
    const sanitizedEmployees = (employees || []).map((emp: any) => {
      // Map nested mutabaah_activations to activated_months array for compatibility
      let activatedMonths: string[] = [];
      if (emp.mutabaah_activations && Array.isArray(emp.mutabaah_activations)) {
        activatedMonths = emp.mutabaah_activations.map((a: any) => a.month_key);
      }

      const { profile_picture, password, mutabaah_activations, ...rest } = emp;
      return {
        ...rest,
        profilePicture: rest.avatar_url || null,
        activated_months: activatedMonths
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
