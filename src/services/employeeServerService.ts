import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getAggregatedMonthlyActivities } from './monthlyActivityServerService'

// Helper function to convert snake_case to camelCase for employee objects
const convertToCamelCase = (emp: any): any => {
    return {
        ...emp,
        lastVisitDate: emp.last_visit_date,
        isActive: emp.is_active,
        notificationEnabled: emp.notification_enabled,
        profilePicture: emp.profile_picture,
        monthlyActivities: emp.monthly_activities,
        // activatedMonths: emp.activated_months, // ❌ REMOVED: Column dropped
        kaUnitId: emp.ka_unit_id,
        supervisorId: emp.supervisor_id,
        mentorId: emp.mentor_id,
        dirutId: emp.dirut_id,
        canBeMentor: emp.can_be_mentor,
        canBeSupervisor: emp.can_be_supervisor,
        canBeKaUnit: emp.can_be_ka_unit,
        canBeDirut: emp.can_be_dirut,
        canBeManager: emp.can_be_manager,
        managerId: emp.manager_id,
        functionalRoles: emp.functional_roles,
        managerScope: typeof emp.manager_scope === 'string' ? JSON.parse(emp.manager_scope) : emp.manager_scope,
        locationId: emp.location_id,
        locationName: emp.location_name,
        signature: emp.signature,
        lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp ? (typeof emp.last_announcement_read_timestamp === 'string' ? new Date(emp.last_announcement_read_timestamp).getTime() : Number(emp.last_announcement_read_timestamp)) : undefined,
        managedHospitalIds: emp.managed_hospital_ids || [],
        mustChangePassword: emp.must_change_password,
        hospitalId: emp.hospital_id,
        professionCategory: emp.profession_category,
        isProfileComplete: emp.is_profile_complete,
        emailVerified: emp.email_verified,
        avatarUrl: emp.profile_picture, // Map profile_picture to avatarUrl too
        authUserId: emp.auth_user_id,
    };
};

/**
 * Get full employee data with all linked records (history, todos, etc.)
 * This is used for login and session verification to provide a fast initial load.
 */
export async function getFullEmployeeData(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration');
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch basic employee data
    const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single()

    if (employeeError || !employee) {
        console.error('Error fetching employee basic data:', employeeError);
        return null;
    }

    // 2. Fetch linked data and monthly activities in parallel
    const [
        { data: readingHistoryData },
        { data: quranHistoryData },
        { data: todosData },
        aggregatedActivities,
        { data: activationData }
    ] = await Promise.all([
        supabase
            .from('employee_reading_history')
            .select('*')
            .eq('employee_id', userId)
            .order('created_at', { ascending: false }),
        supabase
            .from('employee_quran_reading_history')
            .select('*')
            .eq('employee_id', userId)
            .order('date', { ascending: false }),
        supabase
            .from('employee_todos')
            .select('*')
            .eq('employee_id', userId)
            .order('created_at', { ascending: false }),
        getAggregatedMonthlyActivities(userId),
        supabase
            .from('mutabaah_activations')
            .select('month_key')
            .eq('employee_id', userId)
    ]);

    // 3. Convert formats
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

    // Extract activated months from new table
    const realActivatedMonths = (activationData || []).map((row: any) => row.month_key);

    const basicEmployeeInCamelCase = convertToCamelCase(employee);

    // 4. Combine and return
    return {
        ...basicEmployeeInCamelCase,
        activatedMonths: realActivatedMonths, // Override with data from new table
        activated_months: realActivatedMonths, // Override explicit snake_case too for compatibility
        monthlyActivities: aggregatedActivities, // Now populated from the server!
        readingHistory: convertedReadingHistory,
        quranReadingHistory: convertedQuranHistory,
        todoList: convertedTodos,
    };
}
