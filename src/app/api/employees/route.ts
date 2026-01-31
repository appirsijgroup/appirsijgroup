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
    const sessionCookie = request.cookies.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await verifyToken(sessionCookie)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // Check for limit parameter
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : null;

    // Build query for ALL employees with mutabaah_activations
    let query = supabaseService
      .from('employees')
      .select(`
        *,
        mutabaah_activations (
          month_key
        )
      `)
      .order('name', { ascending: true })
      .limit(10000); // 🔥 Increase limit to ensure all employees are fetched for reports/analytics

    if (limit) {
      query = query.limit(limit);
    }

    const { data: employees, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Database query failed', details: error.message }, { status: 500 })
    }

    // 🔥 ROBUST BANDWIDTH OPTIMIZATION + ACTIVATION MAPPING
    // Instead of choosing columns (which might fail if schema changes),
    // we programmatically remove heavy keys from the result objects.
    const sanitizedEmployees = (employees || []).map((emp: any) => {
      // Map nested mutabaah_activations to activated_months array for compatibility
      let activatedMonths: string[] = [];
      if (emp.mutabaah_activations && Array.isArray(emp.mutabaah_activations)) {
        activatedMonths = emp.mutabaah_activations.map((a: any) => a.month_key);
      }

      // Exclude password and old profile_picture blobs, but KEEP signature
      const { profile_picture, password, mutabaah_activations, ...rest } = emp;
      return {
        ...rest,
        profilePicture: rest.avatar_url || null, // Keep UI compatibility 
        monthly_activities: {}, // Force empty, loaded separately
        activated_months: activatedMonths // Add activated_months for compatibility
      };
    });

    return NextResponse.json({
      employees: sanitizedEmployees
    })

  } catch (error) {
    console.error('❌ [/api/employees] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
