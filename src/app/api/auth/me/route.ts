// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // 🔥 IMPORTANT: Field-field ini SUDAH di-convert manual dari tabel terpisah!
    // JANGAN di-convert lagi atau menimpa dengan data dari tabel employees lama
    // Biarkan apa adanya (sudah camelCase dari manual conversion)
    // readingHistory: emp.reading_history,         // ❌ REMOVED - already converted manually
    // quranReadingHistory: emp.quran_reading_history, // ❌ REMOVED - already converted manually
    // todoList: emp.todo_list,                     // ❌ REMOVED - already converted manually

    signature: emp.signature,
    lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp,
    managedHospitalIds: emp.managed_hospital_ids,
    mustChangePassword: emp.must_change_password,
    hospitalId: emp.hospital_id,
    professionCategory: emp.profession_category,
  };
};

import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // 🔥 FIX: Create Supabase client inside function to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    // Get secure session
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.userId


    // Ambil data employee lengkap berdasarkan id
    const { data: employee, error: employeeError, status } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'User not found', details: employeeError?.message },
        { status: 404 }
      )
    }

    // 🔥 FIX: Ambil data dari tabel terpisah secara PARALEL untuk performa yang lebih cepat
    // Menggunakan Promise.all agar semua request berjalan bersamaan, bukan antri satu per satu

    const [
      { data: monthlyActivitiesData, error: activitiesError },
      { data: readingHistoryData, error: readingError },
      { data: quranHistoryData, error: quranError },
      { data: todosData, error: todosError }
    ] = await Promise.all([
      // 1. Monthly activities
      supabase
        .from('employee_monthly_activities')
        .select('activities')
        .eq('employee_id', userId)
        .maybeSingle(),

      // 2. Reading history
      supabase
        .from('employee_reading_history')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false }),

      // 3. Quran reading history
      supabase
        .from('employee_quran_reading_history')
        .select('*')
        .eq('employee_id', userId)
        .order('date', { ascending: false }),

      // 4. Todos
      supabase
        .from('employee_todos')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })
    ]);

    // Log warnings if any (non-blocking)

    // 5. Convert format data dari tabel terpisah ke format camelCase seperti di Employee type
    const convertedReadingHistory = (readingHistoryData || []).map((item: any) => ({
      id: item.id,
      bookTitle: item.book_title,
      pagesRead: item.pages_read,
      dateCompleted: item.date_completed,
      createdAt: item.created_at
    }))

    const convertedQuranHistory = (quranHistoryData || []).map((item: any) => ({
      id: item.id,
      date: item.date,
      surahName: item.surah_name,
      surahNumber: item.surah_number,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      createdAt: item.created_at
    }))

    const convertedTodos = (todosData || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      notes: item.description,
      completed: item.is_completed,
      date: item.due_date,
      priority: item.priority,
      completedAt: item.completed_at,
      createdAt: item.created_at
    }))

    // 🔥 FIX: Convert basic employee data first, then attach the additional data
    // This avoids convertToCamelCase overwriting our manually prepared camelCase fields with undefined
    const basicEmployeeInCamelCase = convertToCamelCase(employee);

    const finalEmployeeData = {
      ...basicEmployeeInCamelCase,
      monthlyActivities: monthlyActivitiesData?.activities || {},
      readingHistory: convertedReadingHistory,
      quranReadingHistory: convertedQuranHistory,
      todoList: convertedTodos,
    };

    // 🔥 DEBUG: Log hasil akhir SEBELUM return

    return NextResponse.json({ employee: finalEmployeeData })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get user data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
