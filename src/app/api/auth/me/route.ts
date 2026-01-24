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
    lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp ? (typeof emp.last_announcement_read_timestamp === 'string' ? new Date(emp.last_announcement_read_timestamp).getTime() : Number(emp.last_announcement_read_timestamp)) : undefined,
    managedHospitalIds: emp.managed_hospital_ids || [],
    mustChangePassword: emp.must_change_password,
    hospitalId: emp.hospital_id,
    professionCategory: emp.profession_category,
  };
};

import { getSession } from '@/lib/auth'
import { getFullEmployeeData } from '@/services/employeeServerService'

export async function GET(request: NextRequest) {
  try {
    // Get secure session
    const session = await getSession()

    if (!session) {
      console.warn('❌ [/api/auth/me] No session found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const userId = session.userId
    console.log('🔍 [/api/auth/me] Fetching user data for userId:', userId)

    const fullEmployeeData = await getFullEmployeeData(userId)

    if (!fullEmployeeData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 🔥 DEBUG: Log hasil akhir SEBELUM return
    console.log('🔍 [/api/auth/me] User data returned:', {
      userId: fullEmployeeData.id,
      name: fullEmployeeData.name,
      role: fullEmployeeData.role,
      email: fullEmployeeData.email,
    });

    return NextResponse.json({ employee: fullEmployeeData })

  } catch (error) {
    console.error('❌ [/api/auth/me] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    )
  }
}
