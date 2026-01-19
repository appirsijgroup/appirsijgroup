import { supabase } from '@/lib/supabase';
import type { Database } from './database.types';
import { timeValidationService } from './timeValidationService';

// Use centralized Supabase client to avoid multiple instances
export { supabase };

// Types
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];

// Get attendance records for an employee
export const getEmployeeAttendance = async (employeeId: string): Promise<Record<string, AttendanceRecord>> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId);

  if (error) {
    throw error;
  }

  // Convert to a map with entity_id as key
  const attendanceMap: Record<string, AttendanceRecord> = {};
  (data as AttendanceRecord[]).forEach(record => {
    attendanceMap[record.entity_id] = record;
  });

  return attendanceMap;
};

// 🔥 NEW: Get ALL attendance records in ONE call (for admin dashboard)
export const getAllAttendanceRecords = async (): Promise<Record<string, Record<string, AttendanceRecord>>> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*');

  if (error) {
    throw error;
  }

  // Convert to nested map: employee_id -> entity_id -> record
  const attendanceMap: Record<string, Record<string, AttendanceRecord>> = {};
  (data as AttendanceRecord[]).forEach(record => {
    if (!attendanceMap[record.employee_id]) {
      attendanceMap[record.employee_id] = {};
    }
    attendanceMap[record.employee_id][record.entity_id] = record;
  });

  return attendanceMap;
};

// Submit attendance record
export const submitAttendance = async (
  employeeId: string,
  entityId: string,
  status: 'hadir' | 'tidak-hadir',
  reason: string | null = null,
  isLateEntry: boolean = false,
  location?: { latitude: number; longitude: number }
): Promise<AttendanceRecord> => {
  try {
    // Validate time before submitting attendance
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Attendance submission denied.');
    }

    // Check if the entity date is in the future compared to validated time
    // Assuming entityId contains date information in some form (like YYYY-MM-DD)
    const entityDateMatch = entityId.match(/\d{4}-\d{2}-\d{2}/);
    if (entityDateMatch) {
      const entityDate = new Date(entityDateMatch[0]);
      const correctedTime = timeValidation.correctedTime;

      // If entity date is in the future compared to corrected server time, reject
      if (entityDate > correctedTime) {
        throw new Error('Cannot submit attendance for future dates.');
      }
    }

    // Check if Supabase is configured
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const timestamp = timeValidation.correctedTime.toISOString();

    const recordToUpsert = {
      employee_id: employeeId,
      entity_id: entityId,
      status,
      reason,
      timestamp,
      is_late_entry: isLateEntry,
      location: location ? JSON.stringify(location) : null
    };


    const { data, error } = await (supabase
      .from('attendance_records') as any)
      .upsert(recordToUpsert, { onConflict: ['employee_id', 'entity_id'] })
      .select()
      .single();

    if (error) {
      if (process.env.NODE_ENV === "development") {
      }
      throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      throw new Error('No data returned from Supabase after upsert');
    }

    return data;
  } catch (err: any) {
    throw err;
  }
};

// Delete attendance record
export const deleteAttendance = async (employeeId: string, entityId: string): Promise<void> => {
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .eq('employee_id', employeeId)
    .eq('entity_id', entityId);

  if (error) {
    throw error;
  }
};

// Batch update attendance
export const batchUpdateAttendance = async (
  employeeId: string,
  attendanceRecords: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>[]
): Promise<AttendanceRecord[]> => {
  // Validate time before batch update
  const timeValidation = timeValidationService.validateTime();

  if (!timeValidation.isValid) {
    throw new Error('System time appears to be manipulated. Batch attendance update denied.');
  }

  const recordsWithIds = attendanceRecords.map(record => ({
    ...record,
    employee_id: employeeId,
    timestamp: record.timestamp || timeValidation.correctedTime.toISOString()
  }));

  const { data, error } = await (supabase
    .from('attendance_records') as any)
    .upsert(recordsWithIds, { onConflict: ['employee_id', 'entity_id'] })
    .select();

  if (error) {
    throw error;
  }

  return data;
};