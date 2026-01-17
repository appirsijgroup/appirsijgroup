import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // 🔥 FIX: Create Supabase client inside function to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase environment variables not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    // Baca cookie userId
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      console.log('🔍 /api/auth/me - No userId cookie found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔍 /api/auth/me - userId:', userId)

    // Ambil data employee lengkap berdasarkan id
    const { data: employee, error: employeeError, status } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single()

    if (employeeError || !employee) {
      console.error('❌ Employee not found:', employeeError?.message)
      return NextResponse.json(
        { error: 'User not found', details: employeeError?.message },
        { status: 404 }
      )
    }

    // Ambil data monthly activities dari tabel terpisah
    const { data: monthlyActivitiesData, error: activitiesError } = await supabase
      .from('employee_monthly_activities')
      .select('activities')
      .eq('employee_id', userId)
      .maybeSingle() // Gunakan maybeSingle untuk handle case dimana data belum ada

    // Log jika ada error (bukan critical error, karena monthly activities mungkin belum ada)
    if (activitiesError && activitiesError.code !== 'PGRST116') {
      console.log('⚠️ Warning: Could not fetch monthly activities:', activitiesError.message)
    }

    // Combine employee data dengan monthly activities
    // 🔥 FIX: Prioritaskan data dari employee_monthly_activities, bukan dari employees.monthly_activities
    const monthlyActivitiesFromNewTable = monthlyActivitiesData?.activities || {};

    const employeeWithActivities = {
      ...employee,
      // Prioritaskan data dari tabel baru
      monthly_activities: Object.keys(monthlyActivitiesFromNewTable).length > 0
        ? monthlyActivitiesFromNewTable
        : (employee.monthly_activities || {}),
      // Untuk kompatibilitas dengan kode yang lama
      employee_monthly_activities: monthlyActivitiesFromNewTable,
    }

    console.log('✅ /api/auth/me - Found:', employee.name)
    console.log('  - Months in new table:', Object.keys(monthlyActivitiesFromNewTable).length)
    console.log('  - Using activities from:', Object.keys(monthlyActivitiesFromNewTable).length > 0 ? 'NEW table (employee_monthly_activities)' : 'OLD column (employees.monthly_activities)')

    return NextResponse.json({ employee: employeeWithActivities })

  } catch (error) {
    console.error('Error /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Failed to get user data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
