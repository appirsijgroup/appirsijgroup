import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES (SESUAIKAN DENGAN TABEL activities YANG SUDAH ADA)
// =====================================================

export type ActivityType = 'Umum' | 'Kajian Selasa' | 'Pengajian Persyarikatan';
export type AudienceType = 'public' | 'rules' | 'manual';
export type ActivityStatus = 'scheduled' | 'postponed' | 'cancelled';
export type AttendanceStatus = 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';

// Alias untuk compatibility dengan hook
export type ScheduledActivity = Activity;
export type ScheduledActivityAttendance = ActivityAttendance;

export interface Activity {
    id: string;
    name: string;
    description?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    createdBy: string;
    createdByName?: string;
    participantIds: string[]; // Untuk audience_type = 'manual'
    zoomUrl?: string;
    youtubeUrl?: string;
    activityType: ActivityType;
    status: ActivityStatus;
    audienceType: AudienceType;
    audienceRules?: {
        hospitalIds?: string[];
        units?: string[];
        bagians?: string[];
        professionCategories?: string[];
        professions?: string[];
        roles?: string[];
        [key: string]: any;
    };
    createdAt: string;
}

export interface ActivityAttendance {
    id: string;
    activityId: string;
    employeeId: string;
    status: AttendanceStatus;
    reason?: string;
    submittedAt: string;
    isLateEntry: boolean;
    notes?: string;
    ipAddress?: string;
    createdAt: string;
    updatedAt: string;
}

// =====================================================
// ACTIVITIES CRUD (MENGGUNAKAN TABEL activities YANG SUDAH ADA)
// =====================================================

/**
 * Get all activities
 */
export const getAllActivities = async (): Promise<Activity[]> => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }
};

/**
 * Get activities for a specific date range
 */
export const getActivitiesByDateRange = async (
    startDate: string,
    endDate: string
): Promise<Activity[]> => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching activities by date range:', error);
        throw error;
    }
};

/**
 * Get activities visible to a specific employee
 * Berdasarkan audience_type dan audience_rules
 */
export const getActivitiesForEmployee = async (
    employeeId: string,
    startDate?: string,
    endDate?: string
): Promise<Activity[]> => {
    try {
        // 1. Get employee data untuk pengecekan audience rules
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (empError) throw empError;

        // 2. Build query
        let query = supabase
            .from('activities')
            .select('*')
            .eq('status', 'scheduled'); // Hanya yang scheduled

        if (startDate) {
            query = query.gte('date', startDate);
        }

        if (endDate) {
            query = query.lte('date', endDate);
        }

        query = query.order('date', { ascending: true })
                   .order('start_time', { ascending: true });

        const { data: allActivities, error: actError } = await query;

        if (actError) throw actError;

        // 3. Filter berdasarkan audience_type dan rules
        const filteredActivities = (allActivities || []).filter(activity => {
            // Public: Semua bisa lihat
            if (activity.audienceType === 'public') {
                return true;
            }

            // Manual: Cek apakah employee ada di participant_ids
            if (activity.audienceType === 'manual') {
                return activity.participantIds?.includes(employeeId);
            }

            // Rules: Cek apakah employee match dengan audience_rules
            if (activity.audienceType === 'rules') {
                return doesEmployeeMatchRules(employee, activity.audienceRules || {});
            }

            return false;
        });

        return filteredActivities;
    } catch (error) {
        console.error('Error fetching activities for employee:', error);
        throw error;
    }
};

/**
 * Helper: Cek apakah employee match dengan audience rules
 */
const doesEmployeeMatchRules = (employee: any, rules: any): boolean => {
    // Hospital IDs
    if (rules.hospitalIds && rules.hospitalIds.length > 0) {
        if (!rules.hospitalIds.includes(employee.hospital_id)) {
            return false;
        }
    }

    // Units
    if (rules.units && rules.units.length > 0) {
        if (!rules.units.includes(employee.unit)) {
            return false;
        }
    }

    // Bagians
    if (rules.bagians && rules.bagians.length > 0) {
        if (!rules.bagians.includes(employee.bagian)) {
            return false;
        }
    }

    // Profession Categories
    if (rules.professionCategories && rules.professionCategories.length > 0) {
        if (!rules.professionCategories.includes(employee.profession_category)) {
            return false;
        }
    }

    // Professions
    if (rules.professions && rules.professions.length > 0) {
        if (!rules.professions.includes(employee.profession)) {
            return false;
        }
    }

    // Roles
    if (rules.roles && rules.roles.length > 0) {
        if (!rules.roles.includes(employee.role)) {
            return false;
        }
    }

    return true;
};

/**
 * Create new activity
 */
export const createActivity = async (
    activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<Activity> => {
    try {
        console.log('📤 Creating activity in Supabase:', activity);

        // Prepare data for database (convert camelCase to snake_case)
        const dbData = {
            name: activity.name,
            description: activity.description || null,
            date: activity.date,
            start_time: activity.startTime,
            end_time: activity.endTime,
            created_by: activity.createdBy,
            created_by_name: '', // Will be filled by trigger or default
            participant_ids: activity.participantIds || [],
            zoom_url: activity.zoomUrl || null,
            youtube_url: activity.youtubeUrl || null,
            activity_type: activity.activityType || 'Umum',
            status: activity.status || 'scheduled',
            audience_type: activity.audienceType,
            audience_rules: activity.audienceRules || null,
        };

        console.log('📦 Data to insert:', dbData);

        const { data, error } = await supabase
            .from('activities')
            .insert(dbData)
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log('✅ Activity created successfully:', data);
        return data;
    } catch (error) {
        console.error('❌ Error creating activity:', error);
        throw error;
    }
};

/**
 * Update activity
 */
export const updateActivity = async (
    id: string,
    updates: Partial<Activity>
): Promise<Activity> => {
    try {
        const { data, error } = await supabase
            .from('activities')
            .update({
                ...updates,
                // Convert camelCase to snake_case untuk database
                ...(updates.startTime && { start_time: updates.startTime }),
                ...(updates.endTime && { end_time: updates.endTime }),
                ...(updates.participantIds && { participant_ids: updates.participantIds }),
                ...(updates.zoomUrl && { zoom_url: updates.zoomUrl }),
                ...(updates.youtubeUrl && { youtube_url: updates.youtubeUrl }),
                ...(updates.activityType && { activity_type: updates.activityType }),
                ...(updates.audienceType && { audience_type: updates.audienceType }),
                ...(updates.audienceRules && { audience_rules: updates.audienceRules }),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating activity:', error);
        throw error;
    }
};

/**
 * Delete activity
 */
export const deleteActivity = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting activity:', error);
        throw error;
    }
};

// =====================================================
// ATTENDANCE TRACKING (MENGGUNAKAN TABEL activity_attendance)
// =====================================================

/**
 * Get attendance untuk semua employee dalam satu activity
 */
export const getActivityAttendance = async (
    activityId: string
): Promise<ActivityAttendance[]> => {
    try {
        const { data, error } = await supabase
            .from('activity_attendance')
            .select('*')
            .eq('activity_id', activityId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Convert snake_case to camelCase
        return (data || []).map(att => ({
            id: att.id,
            activityId: att.activity_id,
            employeeId: att.employee_id,
            status: att.status,
            reason: att.reason,
            submittedAt: att.submitted_at,
            isLateEntry: att.is_late_entry,
            notes: att.notes,
            ipAddress: att.ip_address,
            createdAt: att.created_at,
            updatedAt: att.updated_at,
        }));
    } catch (error) {
        console.error('Error fetching activity attendance:', error);
        throw error;
    }
};

/**
 * Get attendance untuk satu employee di satu activity
 */
export const getEmployeeActivityAttendance = async (
    activityId: string,
    employeeId: string
): Promise<ActivityAttendance | null> => {
    try {
        const { data, error } = await supabase
            .from('activity_attendance')
            .select('*')
            .eq('activity_id', activityId)
            .eq('employee_id', employeeId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned, employee hasn't submitted attendance yet
                return null;
            }
            throw error;
        }

        // Convert snake_case to camelCase
        return {
            id: data.id,
            activityId: data.activity_id,
            employeeId: data.employee_id,
            status: data.status,
            reason: data.reason,
            submittedAt: data.submitted_at,
            isLateEntry: data.is_late_entry,
            notes: data.notes,
            ipAddress: data.ip_address,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (error) {
        console.error('Error fetching employee activity attendance:', error);
        throw error;
    }
};

/**
 * Get semua attendance untuk satu employee
 */
export const getEmployeeScheduledAttendance = async (
    employeeId: string,
    startDate?: string,
    endDate?: string
): Promise<ActivityAttendance[]> => {
    try {
        let query = supabase
            .from('activity_attendance')
            .select('*, activities!inner(*)');

        if (startDate) {
            query = query.gte('activities.date', startDate);
        }

        if (endDate) {
            query = query.lte('activities.date', endDate);
        }

        const { data, error } = await query
            .eq('employee_id', employeeId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Convert snake_case to camelCase
        return (data || []).map(att => ({
            id: att.id,
            activityId: att.activity_id,
            employeeId: att.employee_id,
            status: att.status,
            reason: att.reason,
            submittedAt: att.submitted_at,
            isLateEntry: att.is_late_entry,
            notes: att.notes,
            ipAddress: att.ip_address,
            createdAt: att.created_at,
            updatedAt: att.updated_at,
        }));
    } catch (error) {
        console.error('Error fetching employee scheduled attendance:', error);
        throw error;
    }
};

/**
 * Submit attendance untuk satu activity
 * Fungsi ini akan:
 * 1. Menyimpan attendance ke tabel activity_attendance
 * 2. Jika hadir, update monthly activities di Lembar Mutaba'ah
 */
export const submitScheduledAttendance = async (
    activityId: string,
    employeeId: string,
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit',
    reason?: string
): Promise<ActivityAttendance> => {
    try {
        console.log('📤 Submitting attendance:', { activityId, employeeId, status, reason });

        // 1. Get activity info untuk integrasi dengan monthly activities
        const { data: activity, error: actError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', activityId)
            .single();

        if (actError) {
            console.error('❌ Error fetching activity:', actError);
            throw actError;
        }

        console.log('✅ Activity found:', activity);

        // 2. Cek apakah activity sudah selesai atau masih berlangsung
        const now = new Date();
        const activityDateTime = new Date(`${activity.date}T${activity.end_time}`);
        const isLate = now > activityDateTime;

        // 3. Insert atau update attendance
        const { data: existingAttendance } = await supabase
            .from('activity_attendance')
            .select('*')
            .eq('activity_id', activityId)
            .eq('employee_id', employeeId)
            .single();

        let attendanceData;

        if (existingAttendance) {
            console.log('🔄 Updating existing attendance:', existingAttendance.id);

            // Update existing
            const { data, error } = await supabase
                .from('activity_attendance')
                .update({
                    status,
                    reason,
                    is_late_entry: isLate,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingAttendance.id)
                .select()
                .single();

            if (error) {
                console.error('❌ Error updating attendance:', error);
                throw error;
            }

            attendanceData = data;
        } else {
            console.log('➕ Inserting new attendance');

            // Insert new
            const { data, error } = await supabase
                .from('activity_attendance')
                .insert({
                    activity_id: activityId,
                    employee_id: employeeId,
                    status,
                    reason,
                    is_late_entry: isLate,
                    submitted_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Error inserting attendance:', error);
                throw error;
            }

            attendanceData = data;
        }

        console.log('✅ Attendance saved:', attendanceData);

        // 4. Jika hadir, update monthly activities (integrasi dengan Lembar Mutaba'ah)
        if (status === 'hadir') {
            await updateMonthlyActivitiesFromScheduledActivity(employeeId, activity);
        }

        // 5. Convert to camelCase
        return {
            id: attendanceData.id,
            activityId: attendanceData.activity_id,
            employeeId: attendanceData.employee_id,
            status: attendanceData.status,
            reason: attendanceData.reason,
            submittedAt: attendanceData.submitted_at,
            isLateEntry: attendanceData.is_late_entry,
            notes: attendanceData.notes,
            ipAddress: attendanceData.ip_address,
            createdAt: attendanceData.created_at,
            updatedAt: attendanceData.updated_at,
        };
    } catch (error) {
        console.error('Error submitting scheduled attendance:', error);
        throw error;
    }
};

/**
 * Helper: Update monthly activities berdasarkan scheduled activity
 * Integrasi dengan Lembar Mutaba'ah
 */
const updateMonthlyActivitiesFromScheduledActivity = async (
    employeeId: string,
    activity: any
): Promise<void> => {
    try {
        // Tentukan field mana yang di-update berdasarkan activity_type
        const activityFieldMap: Record<string, string> = {
            'Kajian Selasa': 'kajianSelasa',
            'Pengajian Persyarikatan': 'pengajianPersyarikatan',
            'Umum': 'kegiatanTerjadwal',
        };

        const fieldName = activityFieldMap[activity.activity_type] || 'kegiatanTerjadwal';

        // Get current month key
        const activityDate = new Date(activity.date);
        const monthKey = `${activityDate.getFullYear()}-${(activityDate.getMonth() + 1).toString().padStart(2, '0')}`;

        // Get current monthly activities
        const { data: currentData, error: fetchError } = await supabase
            .from('employee_monthly_activities')
            .select('activities')
            .eq('employee_id', employeeId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const currentActivities = currentData?.activities || {};

        // Update the specific field
        const updatedActivities = {
            ...currentActivities,
            [monthKey]: {
                ...(currentActivities[monthKey] || {}),
                [fieldName]: (currentActivities[monthKey]?.[fieldName] || 0) + 1,
            }
        };

        // Upsert monthly activities
        const { error: upsertError } = await supabase
            .from('employee_monthly_activities')
            .upsert({
                employee_id: employeeId,
                activities: updatedActivities,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'employee_id'
            });

        if (upsertError) throw upsertError;

        console.log(`✅ Updated monthly activities for ${employeeId}: ${monthKey} -> ${fieldName}`);
    } catch (error) {
        console.error('Error updating monthly activities from scheduled activity:', error);
        // Don't throw - attendance should still be saved even if monthly activities update fails
    }
};

/**
 * Alias untuk compatibility dengan hook
 * getScheduledActivitiesForEmployee = getActivitiesForEmployee
 */
export const getScheduledActivitiesForEmployee = getActivitiesForEmployee;


/**
 * Get attendance untuk semua scheduled activities untuk satu employee
 * Returns map: activityId -> { status, submitted, isLateEntry }
 */
export const getEmployeeActivitiesAttendance = async (
    employeeId: string
): Promise<Record<string, { status: string; submitted: boolean; isLateEntry: boolean }>> => {
    try {
        const { data, error } = await supabase
            .from('activity_attendance')
            .select('*')
            .eq('employee_id', employeeId);

        if (error) throw error;

        // Convert to map with activity_id as key
        const attendanceMap: Record<string, { status: string; submitted: boolean; isLateEntry: boolean }> = {};
        (data || []).forEach(att => {
            attendanceMap[att.activity_id] = {
                status: att.status,
                submitted: true,
                isLateEntry: att.is_late_entry || false,
            };
        });

        return attendanceMap;
    } catch (error) {
        console.error('Error fetching employee activities attendance:', error);
        throw error;
    }
};
