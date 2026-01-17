import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Helper function to convert snake_case to camelCase for employee objects
// 🔥 SAME as employeeService.convertToCamelCase for consistency
const convertToCamelCase = (emp: any): any => {
  return {
    ...emp,
    lastVisitDate: emp.last_visit_date,
    isActive: emp.is_active,
    notificationEnabled: emp.notification_enabled,
    profilePicture: emp.profile_picture,
    monthlyActivities: emp.monthly_activities, // 🔥 Convert to camelCase
    activatedMonths: emp.activated_months, // 🔥 Convert to camelCase
    kaUnitId: emp.ka_unit_id,
    supervisorId: emp.supervisor_id,
    mentorId: emp.mentor_id,
    dirutId: emp.dirut_id,
    canBeMentor: emp.can_be_mentor,
    canBeSupervisor: emp.can_be_supervisor,
    canBeKaUnit: emp.can_be_ka_unit,
    canBeDirut: emp.can_be_dirut,
    functionalRoles: emp.functional_roles,
    managerScope: emp.manager_scope,
    locationId: emp.location_id,
    locationName: emp.location_name,
    readingHistory: emp.reading_history,
    quranReadingHistory: emp.quran_reading_history,
    todoList: emp.todo_list,
    signature: emp.signature,
    lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp,
    managedHospitalIds: emp.managed_hospital_ids,
    mustChangePassword: emp.must_change_password,
    hospitalId: emp.hospital_id,
    professionCategory: emp.profession_category,
  };
};

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

    // 🔥 FIX: Gunakan data dari tabel employee_monthly_activities
    const monthlyActivitiesFromNewTable = monthlyActivitiesData?.activities || {};

    // Gabungkan dengan employee data
    const employeeWithActivities = {
      ...employee,
      monthly_activities: monthlyActivitiesFromNewTable, // Temporarily use snake_case
    }

    console.log('✅ /api/auth/me - Found:', employee.name)
    console.log('  - Months in employee_monthly_activities table:', Object.keys(monthlyActivitiesFromNewTable).length)

    // 🔥 FIX: Convert to camelCase BEFORE returning (consistent with employeeService)
    const employeeInCamelCase = convertToCamelCase(employeeWithActivities);

    return NextResponse.json({ employee: employeeInCamelCase })

  } catch (error) {
    console.error('Error /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Failed to get user data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
