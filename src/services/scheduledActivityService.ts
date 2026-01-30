import { supabase } from '@/lib/supabase';
import { type Activity, type AudienceType, type AudienceRules } from '@/types';

// =====================================================
// TYPES (SESUAIKAN DENGAN TABEL activities YANG SUDAH ADA)
// =====================================

export type ActivityType = 'UMUM' | 'KAJIAN SELASA' | 'PENGAJIAN PERSYARIKATAN' | 'Umum' | 'Kajian Selasa' | 'Pengajian Persyarikatan';
export type ActivityStatus = 'scheduled' | 'postponed' | 'cancelled';
export type AttendanceStatus = 'hadir' | 'tidak-hadir' | 'izin' | 'sakit';

/**
 * Representation of the database row
 */
interface DbActivity {
    id: string;
    name: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    created_by: string;
    created_by_name: string | null;
    participant_ids: string[] | null;
    zoom_url: string | null;
    youtube_url: string | null;
    activity_type: ActivityType;
    status: ActivityStatus;
    audience_type: AudienceType;
    audience_rules: any;
    created_at: string;
}

// Alias untuk compatibility dengan hook
export type ScheduledActivity = Activity;
export type ScheduledActivityAttendance = ActivityAttendance;

const mapDbToActivity = (dbActivity: DbActivity): Activity => ({
    id: dbActivity.id,
    name: dbActivity.name,
    description: dbActivity.description || undefined,
    date: dbActivity.date,
    startTime: dbActivity.start_time,
    endTime: dbActivity.end_time,
    createdBy: dbActivity.created_by,
    createdByName: dbActivity.created_by_name || undefined,
    participantIds: dbActivity.participant_ids || [],
    zoomUrl: dbActivity.zoom_url || undefined,
    youtubeUrl: dbActivity.youtube_url || undefined,
    activityType: dbActivity.activity_type,
    status: dbActivity.status,
    audienceType: dbActivity.audience_type,
    audienceRules: dbActivity.audience_rules,
    createdAt: dbActivity.created_at
});

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
export const getAllActivities = async (creatorId?: string): Promise<Activity[]> => {
    try {
        let query = supabase
            .from('activities')
            .select('*');

        if (creatorId) {
            query = query.eq('created_by', creatorId);
        }

        const { data, error } = await query
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        // ⚡ CRITICAL: Convert from Supabase snake_case to camelCase
        return (data as any as DbActivity[] || []).map(mapDbToActivity);
    } catch (error) {
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

        // ⚡ CRITICAL: Convert from Supabase snake_case to camelCase
        return (data as any as DbActivity[] || []).map(mapDbToActivity);
    } catch (error) {
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

        // 3. Convert snake_case to camelCase dan filter
        const filteredActivities = (allActivities as any as DbActivity[] || []).map(mapDbToActivity).filter(activity => {
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
        // Prepare data for database (convert camelCase to snake_case)
        const dbData = {
            name: activity.name,
            description: activity.description || null,
            date: activity.date,
            start_time: activity.startTime,
            end_time: activity.endTime,
            created_by: activity.createdBy,
            created_by_name: activity.createdByName || '',
            participant_ids: activity.participantIds || [],
            zoom_url: activity.zoomUrl || null,
            youtube_url: activity.youtubeUrl || null,
            activity_type: activity.activityType || 'Umum',
            status: activity.status || 'scheduled',
            audience_type: activity.audienceType,
            audience_rules: activity.audienceRules || null,
        };

        // 🔥 FIX: Use API endpoint to bypass RLS/401 issues
        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create activity: ${errorData.error || 'Unknown error'} (Code: ${errorData.code || 'HTTP ' + response.status})`);
        }

        const result = await response.json();
        const data = result.data as DbActivity;

        // Convert back to camelCase
        return mapDbToActivity(data);
    } catch (error) {
        throw error;
    }
};

// Update activity
export const updateActivity = async (
    id: string,
    updates: Partial<Activity>
): Promise<Activity> => {
    try {
        const dbData: any = { id }; // Include ID for the API to identify the record

        if (updates.name !== undefined) dbData.name = updates.name;
        if (updates.description !== undefined) dbData.description = updates.description;
        if (updates.date !== undefined) dbData.date = updates.date;
        if (updates.startTime !== undefined) dbData.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbData.end_time = updates.endTime;
        if (updates.participantIds !== undefined) dbData.participant_ids = updates.participantIds;
        if (updates.zoomUrl !== undefined) dbData.zoom_url = updates.zoomUrl;
        if (updates.youtubeUrl !== undefined) dbData.youtube_url = updates.youtubeUrl;
        if (updates.activityType !== undefined) dbData.activity_type = updates.activityType;
        if (updates.status !== undefined) dbData.status = updates.status;
        if (updates.audienceType !== undefined) dbData.audience_type = updates.audienceType;
        if (updates.audienceRules !== undefined) dbData.audience_rules = updates.audienceRules;

        const response = await fetch('/api/activities', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update activity: ${errorData.error || 'Unknown error'}`);
        }

        const result = await response.json();
        const data = result.data as DbActivity;

        return mapDbToActivity(data);
    } catch (error) {
        throw error;
    }
};

/**
 * Delete activity
 */
export const deleteActivity = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`/api/activities?id=${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to delete activity: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
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
        return (data as any[] || []).map(att => ({
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
        const att = data as any;
        return {
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
        };
    } catch (error) {
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
        return (data as any[] || []).map(att => ({
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
        throw error;
    }
};

/**
 * Submit attendance untuk satu activity
 * Fungsi ini hanya menyimpan attendance ke tabel activity_attendance
 * Dashboard & Lembar Mutabaah akan membaca langsung dari tabel attendance ini
 */
export const submitScheduledAttendance = async (
    activityId: string,
    employeeId: string,
    status: 'hadir' | 'tidak-hadir' | 'izin' | 'sakit',
    reason?: string
): Promise<ActivityAttendance> => {
    try {
        // 1. Get activity info untuk cek late entry
        const { data: activity, error: actError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', activityId)
            .single();

        if (actError) {
            throw actError;
        }

        // 2. Cek apakah activity sudah selesai atau masih berlangsung
        const now = new Date();
        const act = activity as any;
        const activityDateTime = new Date(`${act.date}T${act.end_time}`);
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
            // Update existing
            const { data, error } = await supabase
                .from('activity_attendance')
                .update({
                    status,
                    reason,
                    is_late_entry: isLate,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', (existingAttendance as any).id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            attendanceData = data as any;
        } else {
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
                throw error;
            }

            attendanceData = data as any;
        }

        // 4. Convert to camelCase
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
        throw error;
    }
};

/**
 * Helper: Update monthly activities berdasarkan scheduled activity
 * Integrasi dengan Lembar Mutaba'ah
 * ⚡ PERBAIKI: Tambahkan ke TANGGAL spesifik, bukan counter bulanan
 */
const updateMonthlyActivitiesFromScheduledActivity = async (
    employeeId: string,
    activity: any
): Promise<void> => {
    try {
        // Tentukan field mana yang di-update berdasarkan activity_type
        // HANYA 'Umum' yang dicatat otomatis ke monthly activities
        const activityFieldMap: Record<string, string> = {
            'Umum': 'kegiatanTerjadwal',
            'UMUM': 'kegiatanTerjadwal',
        };

        const fieldName = activityFieldMap[activity.activity_type];

        // Hanya 'Umum' yang dicatat otomatis. Kajian Selasa dan Pengajian Persyarikatan harus manual.
        if (!fieldName) {
            console.log('ℹ️ Activity type tidak dicatat otomatis:', activity.activity_type);
            return;
        }

        // Get current date key (YYYY-MM-DD format untuk daily checklist)
        const activityDate = new Date(activity.date);
        const monthKey = `${activityDate.getFullYear()}-${(activityDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const dayKey = activityDate.getDate().toString().padStart(2, '0'); // DD format

        // 🔥 FIX: NO CACHE - Don't read from employee_monthly_activities anymore
        // const currentActivities = currentData?.activities || {};
        const currentActivities: Record<string, any> = {};

        // ⚡ PERBAIKI: MERGE dengan benar untuk nested objects
        // Kita perlu merge di level dayKey, bukan monthKey
        const updatedActivities: Record<string, any> = { ...currentActivities };

        // Pastikan monthKey exists
        if (!updatedActivities[monthKey]) {
            updatedActivities[monthKey] = {};
        }

        // Pastikan dayKey exists
        if (!updatedActivities[monthKey][dayKey]) {
            updatedActivities[monthKey][dayKey] = {};
        }

        // Merge existing activities di tanggal tersebut dengan field baru
        updatedActivities[monthKey][dayKey] = {
            ...updatedActivities[monthKey][dayKey],
            [fieldName]: true
        };

        console.log('🔄 Updating monthly activities:', {
            employeeId,
            monthKey,
            dayKey,
            fieldName,
            currentActivities,
            updatedActivities
        });

        // Simpan ke window untuk debugging
        if (typeof window !== 'undefined') {
            (window as any).lastCurrentActivities = currentActivities;
            (window as any).lastUpdatedActivities = updatedActivities;
        }

        // 🔥 FIX: NO CACHE - Don't upsert to employee_monthly_activities anymore
        console.log('⏭️ [updateMonthlyActivitiesFromScheduledActivity] NO CACHE - Skipping upsert (data tracked in scheduled_activity_attendance)');

    } catch (error) {
        // 🔥 FIX: NO CACHE - Only log the error, don't re-throw since we're not doing anything
        console.error('❌ [updateMonthlyActivitiesFromScheduledActivity] Error (non-fatal - NO CACHE mode):', error);
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
        (data as any[] || []).forEach(att => {
            attendanceMap[att.activity_id] = {
                status: att.status,
                submitted: true,
                isLateEntry: att.is_late_entry || false,
            };
        });

        return attendanceMap;
    } catch (error) {
        throw error;
    }
};
/**
 * convertScheduledActivitiesToActivities
 * Converts scheduled activity attendance to monthly activities format
 */
export const convertScheduledActivitiesToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        const { data: attendanceRecords, error } = await supabase
            .from('activity_attendance')
            .select('*, activities:activity_id (date, activity_type)')
            .eq('employee_id', employeeId)
            .eq('status', 'hadir');

        if (error) {
            console.error('Error fetching activity attendance:', error);
            return {};
        }

        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        (attendanceRecords as any[] || []).forEach(record => {
            if (!record.activities) return;

            const date = record.activities.date; // YYYY-MM-DD
            const monthKey = date.substring(0, 7);
            const dayKey = date.substring(8, 10);
            const activityType = record.activities.activity_type;

            if (!result[monthKey]) result[monthKey] = {};
            if (!result[monthKey][dayKey]) result[monthKey][dayKey] = {};

            // Map activity type to Mutabaah field ID (Case-insensitive matching)
            const typeLower = activityType?.toLowerCase().trim();

            if (typeLower === 'kajian selasa') {
                result[monthKey][dayKey]['kajian_selasa'] = true;
            } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
                result[monthKey][dayKey]['persyarikatan'] = true;
            } else if (typeLower === 'kie') {
                result[monthKey][dayKey]['tepat_waktu_kie'] = true;
            } else if (typeLower === 'doa bersama') {
                result[monthKey][dayKey]['doa_bersama'] = true;
            } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
                result[monthKey][dayKey]['tadarus'] = true;
            } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
                result[monthKey][dayKey]['baca_alquran_buku'] = true;
            }
        });

        return result;
    } catch (error) {
        console.error('Error converting scheduled activities to activities:', error);
        return {};
    }
};
