// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import type { Employee, Attendance } from '@/types';
import { Database } from './database.types'; // Corrected import

/**
 * Employee Service
 * Handles all employee-related database operations
 */

// Helper function to convert snake_case to camelCase for employee objects
export const convertToCamelCase = (emp: any): Employee => {
    return {
        ...emp,
        lastVisitDate: emp.last_visit_date,
        isActive: emp.is_active,
        notificationEnabled: emp.notification_enabled,
        profilePicture: emp.profile_picture,
        monthlyActivities: emp.monthly_activities || {}, // Default to empty object if not exists
        activatedMonths: emp.activated_months,
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
        readingHistory: emp.reading_history || [], // Default to empty array if not exists
        quranReadingHistory: emp.quran_reading_history || [], // Default to empty array if not exists
        todoList: emp.todo_list || [], // Default to empty array if not exists
        signature: emp.signature,
        lastAnnouncementReadTimestamp: emp.last_announcement_read_timestamp ? (typeof emp.last_announcement_read_timestamp === 'string' ? new Date(emp.last_announcement_read_timestamp).getTime() : Number(emp.last_announcement_read_timestamp)) : undefined,
        managedHospitalIds: emp.managed_hospital_ids || [],
        mustChangePassword: emp.must_change_password,
        hospitalId: emp.hospital_id,
        professionCategory: emp.profession_category,
    };
};

// Get employees with pagination
export const getEmployeesPaginated = async (
    page: number = 1,
    limit: number = 15,
    search: string = '',
    role: string = '',
    isActive?: boolean
): Promise<{ employees: Employee[], pagination: any }> => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        role,
        isActive: isActive !== undefined ? isActive.toString() : ''
    });

    const response = await fetch(`/api/employees/paginated?${params.toString()}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch paginated employees');
    }

    const { employees, pagination } = await response.json();

    return {
        employees: employees.map((emp: any) => convertToCamelCase(emp)),
        pagination
    };
};

// Get all employees (or limited set) with camelCase column names
export const getAllEmployees = async (limit?: number): Promise<Employee[]> => {
    // 🔥 Use API endpoint instead of direct Supabase query
    // This avoids RLS policy issues with anon key
    const url = limit ? `/api/employees?limit=${limit}` : '/api/employees';
    const response = await fetch(url, {
        credentials: 'include', // Include session cookie
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch employees');
    }

    const { employees } = await response.json();

    // Convert snake_case to camelCase
    return employees.map((emp: any) => convertToCamelCase(emp));
};

// Get employee by ID
export const getEmployeeById = async (id: string): Promise<Employee | null> => {

    const { data, error } = await supabase
        .from('employees')
        .select(`
            id,
            name,
            email,
            password,
            last_visit_date,
            role,
            is_active,
            notification_enabled,
            profile_picture,
            activated_months,
            ka_unit_id,
            supervisor_id,
            mentor_id,
            dirut_id,
            can_be_mentor,
            can_be_supervisor,
            can_be_ka_unit,
            can_be_dirut,
            functional_roles,
            manager_scope,
            signature,
            last_announcement_read_timestamp,
            managed_hospital_ids,
            achievements,
            must_change_password,
            hospital_id,
            unit,
            bagian,
            profession_category,
            profession,
            gender
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // Not found
        }
        throw new Error(error.message || 'Failed to fetch employee');
    }

    if (!data) {
        return null;
    }

    const employeeData = data as any; // Explicitly cast to any or a more specific type if known


    // Convert snake_case to camelCase
    return convertToCamelCase(employeeData);
};

// Get employee by email
export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
    const { data, error } = await supabase
        .from('employees')
        .select(`
            id,
            name,
            email,
            password,
            last_visit_date,
            role,
            is_active,
            notification_enabled,
            profile_picture,
            activated_months,
            ka_unit_id,
            supervisor_id,
            mentor_id,
            dirut_id,
            can_be_mentor,
            can_be_supervisor,
            can_be_ka_unit,
            can_be_dirut,
            functional_roles,
            manager_scope,
            signature,
            last_announcement_read_timestamp,
            managed_hospital_ids,
            achievements,
            must_change_password,
            hospital_id,
            unit,
            bagian,
            profession_category,
            profession,
            gender
        `)
        .eq('email', email)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    if (!data) return null;

    // Convert snake_case to camelCase
    return convertToCamelCase(data);
};

// Create new employee
export const createEmployee = async (employee: Employee): Promise<Employee> => {
    // Convert camelCase to snake_case for database
    const dbEmployee = { // Let TypeScript infer type here
        id: employee.id,
        name: employee.name,
        email: employee.email,
        password: employee.password,
        last_visit_date: employee.lastVisitDate,
        role: employee.role,
        is_active: employee.isActive,
        notification_enabled: employee.notificationEnabled,
        profile_picture: employee.profilePicture,

        // 🔥 IMPORTANT: Field-field ini SUDAH DIPINDAH ke tabel terpisah!
        // JANGAN tulis ke employees.monthly_activities, gunakan monthlyActivityService
        // JANGAN tulis ke employees.reading_history, gunakan readingHistoryService
        // JANGAN tulis ke employees.quran_reading_history, gunakan readingHistoryService
        // JANGAN tulis ke employees.todo_list, gunakan todoService
        // ❌ REMOVED: monthly_activities, reading_history, quran_reading_history, todo_list

        activated_months: employee.activatedMonths,
        ka_unit_id: employee.kaUnitId,
        supervisor_id: employee.supervisorId,
        mentor_id: employee.mentorId,
        dirut_id: employee.dirutId,
        can_be_mentor: employee.canBeMentor,
        can_be_supervisor: employee.canBeSupervisor,
        can_be_ka_unit: employee.canBeKaUnit,
        can_be_dirut: employee.canBeDirut,
        functional_roles: employee.functionalRoles as string[] | null, // Keep this cast
        manager_scope: employee.managerScope ? JSON.stringify(employee.managerScope) : null, // Keep this stringify
        location_id: employee.locationId,
        location_name: employee.locationName,

        // ❌ REMOVED: These fields are now in separate tables
        // reading_history: employee.readingHistory,
        // quran_reading_history: employee.quranReadingHistory,
        // todo_list: employee.todoList,

        signature: employee.signature,
        last_announcement_read_timestamp: employee.lastAnnouncementReadTimestamp,
        managed_hospital_ids: employee.managedHospitalIds,
        achievements: employee.achievements,
        must_change_password: employee.mustChangePassword,
        hospital_id: employee.hospitalId,
        unit: employee.unit,
        bagian: employee.bagian,
        profession_category: employee.professionCategory,
        profession: employee.profession,
        gender: employee.gender,
    };


    const { data, error } = await (supabase
        .from('employees') as any)
        .insert(dbEmployee)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return convertToCamelCase(data);
};

// Update employee
export const updateEmployee = async (
    id: string,
    updates: Partial<Omit<Employee, 'id'>>
): Promise<Employee> => {

    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.lastVisitDate !== undefined) dbUpdates.last_visit_date = updates.lastVisitDate;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.notificationEnabled !== undefined) dbUpdates.notification_enabled = updates.notificationEnabled;
    if (updates.profilePicture !== undefined) dbUpdates.profile_picture = updates.profilePicture;

    // 🔥 IMPORTANT: Field-field ini SUDAH DIPINDAH ke tabel terpisah!
    // JANGAN tulis ke employees.monthly_activities, gunakan monthlyActivityService
    // JANGAN tulis ke employees.reading_history, gunakan readingHistoryService
    // JANGAN tulis ke employees.quran_reading_history, gunakan readingHistoryService
    // JANGAN tulis ke employees.todo_list, gunakan todoService

    if (updates.activatedMonths !== undefined) dbUpdates.activated_months = updates.activatedMonths;
    if (updates.kaUnitId !== undefined) dbUpdates.ka_unit_id = updates.kaUnitId;
    if (updates.supervisorId !== undefined) dbUpdates.supervisor_id = updates.supervisorId;
    if (updates.mentorId !== undefined) dbUpdates.mentor_id = updates.mentorId;
    if (updates.dirutId !== undefined) dbUpdates.dirut_id = updates.dirutId;
    if (updates.canBeMentor !== undefined) dbUpdates.can_be_mentor = updates.canBeMentor;
    if (updates.canBeSupervisor !== undefined) dbUpdates.can_be_supervisor = updates.canBeSupervisor;
    if (updates.canBeKaUnit !== undefined) dbUpdates.can_be_ka_unit = updates.canBeKaUnit;
    if (updates.canBeDirut !== undefined) dbUpdates.can_be_dirut = updates.canBeDirut;
    if (updates.functionalRoles !== undefined) dbUpdates.functional_roles = updates.functionalRoles as string[] | null;
    if (updates.managerScope !== undefined) dbUpdates.manager_scope = updates.managerScope ? JSON.stringify(updates.managerScope) : null;
    if (updates.locationId !== undefined) dbUpdates.location_id = updates.locationId;
    if (updates.locationName !== undefined) dbUpdates.location_name = updates.locationName;

    // ❌ REMOVED: These fields are now in separate tables
    // if (updates.readingHistory !== undefined) dbUpdates.reading_history = updates.readingHistory;
    // if (updates.quranReadingHistory !== undefined) dbUpdates.quran_reading_history = updates.quranReadingHistory;
    // if (updates.todoList !== undefined) dbUpdates.todo_list = updates.todoList;

    if (updates.signature !== undefined) dbUpdates.signature = updates.signature;
    if (updates.lastAnnouncementReadTimestamp !== undefined) dbUpdates.last_announcement_read_timestamp = updates.lastAnnouncementReadTimestamp;
    if (updates.managedHospitalIds !== undefined) dbUpdates.managed_hospital_ids = updates.managedHospitalIds;
    if (updates.achievements !== undefined) dbUpdates.achievements = updates.achievements;
    if (updates.mustChangePassword !== undefined) dbUpdates.must_change_password = updates.mustChangePassword;
    if (updates.hospitalId !== undefined) dbUpdates.hospital_id = updates.hospitalId;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.bagian !== undefined) dbUpdates.bagian = updates.bagian;
    if (updates.professionCategory !== undefined) dbUpdates.profession_category = updates.professionCategory;
    if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;


    // 🔥 FIX: Validate and sanitize JSONB columns before sending
    const sanitizedUpdates = { ...dbUpdates };

    // 🔥 CRITICAL: monthly_activities should NEVER be sent to employees table
    // It should always go to employee_monthly_activities table via monthlyActivityService
    if ('monthlyActivities' in sanitizedUpdates || 'monthly_activities' in sanitizedUpdates) {
        // Remove it from sanitizedUpdates to prevent saving to wrong table
        delete (sanitizedUpdates as any).monthlyActivities;
        delete (sanitizedUpdates as any).monthly_activities;
    }

    // Ensure all JSONB columns are valid JSON (EXCEPT monthly_activities which is removed)
    if (sanitizedUpdates.reading_history !== undefined) {
        // Validate it's a proper array
        if (!Array.isArray(sanitizedUpdates.reading_history)) {
            throw new Error('reading_history must be an array');
        }
        // Ensure it's JSON serializable
        try {
            JSON.stringify(sanitizedUpdates.reading_history);
        } catch (e) {
            throw new Error('reading_history contains non-serializable data');
        }
    }

    if (sanitizedUpdates.todo_list !== undefined) {
        // Validate it's a proper array
        if (!Array.isArray(sanitizedUpdates.todo_list)) {
            throw new Error('todo_list must be an array');
        }
    }

    if (sanitizedUpdates.quran_reading_history !== undefined) {
        // Validate it's a proper array
        if (!Array.isArray(sanitizedUpdates.quran_reading_history)) {
            throw new Error('quran_reading_history must be an array');
        }
    }

    // Use the API route instead of direct Supabase to bypass RLS
    const response = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...sanitizedUpdates }),
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update employee: ${errorData.error || response.statusText}`);
    }

    const { data } = await response.json();


    // If no data returned, fetch the updated employee to return
    if (!data) {
        const { data: updatedData, error: fetchError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch updated employee: ${fetchError.message || 'Unknown error'}`);
        }
        return convertToCamelCase(updatedData);
    }

    return convertToCamelCase(data);
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Get employee attendance
export const getEmployeeAttendance = async (employeeId: string): Promise<Attendance> => {
    const { data, error } = await supabase
        .from('attendances')
        .select('attendance_data')
        .eq('employee_id', employeeId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return {}; // Not found, return empty
        throw error;
    }
    return (data as any)?.attendance_data || {};
};

// Update employee attendance
export const updateEmployeeAttendance = async (
    employeeId: string,
    attendance: Attendance
): Promise<void> => {
    const { error } = await (supabase
        .from('attendances') as any)
        .upsert({
            employee_id: employeeId,
            attendance_data: attendance
        });

    if (error) throw error;
};

// Get attendance history for an employee
export const getAttendanceHistory = async (
    employeeId: string
): Promise<Record<string, Attendance>> => {
    const { data, error } = await supabase
        .from('attendance_history')
        .select('date, attendance_data')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });

    if (error) throw error;

    const history: Record<string, Attendance> = {};
    (data as any)?.forEach((item: any) => {
        history[item.date] = item.attendance_data;
    });
    return history;
};

// Add attendance history entry
export const addAttendanceHistory = async (
    employeeId: string,
    date: string,
    attendance: Attendance
): Promise<void> => {
    const { error } = await (supabase
        .from('attendance_history') as any)
        .insert({
            employee_id: employeeId,
            date,
            attendance_data: attendance
        });

    if (error) throw error;
};

// Get employees by role
export const getEmployeesByRole = async (role: string): Promise<Employee[]> => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('role', role)
        .order('name');

    if (error) throw error;
    return (data as unknown as Employee[]) || [];
};

// Get employees by hospital
export const getEmployeesByHospital = async (hospitalId: string): Promise<Employee[]> => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name');

    if (error) throw error;
    return (data as unknown as Employee[]) || [];
};

// Get employees that can be mentors
export const getPotentialMentors = async (): Promise<Employee[]> => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('can_be_mentor', true)
        .order('name');

    if (error) throw error;
    return (data as unknown as Employee[]) || [];
};

// Search employees by name or email
export const searchEmployees = async (query: string): Promise<Employee[]> => {
    // Sanitize query to prevent SQL injection
    const sanitizedQuery = query
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/\\/g, '\\\\')
        .trim();

    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`)
        .order('name')
        .limit(50);

    if (error) throw error;
    return (data as unknown as Employee[]) || [];
};

// Batch get all employees with their attendance
export const getAllEmployeesWithAttendance = async (): Promise<
    Record<string, { employee: Employee; attendance: Attendance }>
> => {
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('name');

    if (empError) throw empError;

    const employeeIds = (employees as any)?.map((e: any) => e.id) || [];

    const { data: attendances, error: attError } = await supabase
        .from('attendances')
        .select('employee_id, attendance_data')
        .in('employee_id', employeeIds);

    if (attError) throw attError;

    const result: Record<string, { employee: Employee; attendance: Attendance }> = {};

    (employees as any)?.forEach((emp: any) => {
        const attendance = (attendances as any)?.find((a: any) => a.employee_id === emp.id);
        result[emp.id] = {
            employee: emp,
            attendance: attendance?.attendance_data || {}
        };
    });

    return result;
};

/**
 * Sync employee data to Supabase
 * This function handles both creating new employees and updating existing ones
 */
export const syncEmployeeToSupabase = async (
    employeeId: string,
    employee: Employee,
    attendance: Attendance,
    history: Record<string, Attendance>
): Promise<void> => {
    try {
        // Check if employee exists
        const existing = await getEmployeeById(employeeId);

        if (existing) {
            // Update existing employee
            await updateEmployee(employeeId, employee);
        } else {
            // Create new employee
            await createEmployee(employee);
        }

        // Update attendance
        await updateEmployeeAttendance(employeeId, attendance);

        // Sync history (delete old entries and add new ones)
        // Note: This is a simple approach, could be optimized
        const { error: deleteError } = await supabase
            .from('attendance_history')
            .delete()
            .eq('employee_id', employeeId);

        if (deleteError) throw deleteError;

        // Add all history entries
        const historyEntries = Object.entries(history).map(([date, attendanceData]) => ({
            employee_id: employeeId,
            date,
            attendance_data: attendanceData
        }));

        if (historyEntries.length > 0) {
            const { error: historyError } = await (supabase
                .from('attendance_history') as any)
                .insert(historyEntries);

            if (historyError) throw historyError;
        }
    } catch (error) {
        throw error;
    }
};

/**
 * Batch sync all employees to Supabase
 * Use this to migrate all local data to Supabase
 */
export const syncAllEmployeesToSupabase = async (
    usersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }>
): Promise<{ success: number; failed: number; errors: string[] }> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [employeeId, data] of Object.entries(usersData)) {
        try {
            await syncEmployeeToSupabase(employeeId, data.employee, data.attendance, data.history);
            success++;
        } catch (error) {
            failed++;
            errors.push(`${employeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return { success, failed, errors };
};

// Get employees by mentor ID
export const getEmployeesByMentorId = async (mentorId: string): Promise<Employee[]> => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('name');

    if (error) throw error;
    if (!data) return [];

    return data.map((emp: any) => convertToCamelCase(emp));
};
