import { supabase } from '@/lib/supabase';
import type { Database } from './database.types';
import { timeValidationService } from './timeValidationService';

// Use centralized Supabase client to avoid multiple instances
export { supabase };

// Types
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];

// Get attendance records for an employee (hanya yang TERBARA per hari)
export const getEmployeeAttendance = async (employeeId: string): Promise<Record<string, AttendanceRecord>> => {
  // 🔥 FIX: Kolom is_latest belum ada di database, sementara ambil semua data
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('timestamp', { ascending: true });

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

// 🔥 REVERTED: Get all attendance records (removed 90-day limit per user request)
export const getAllAttendanceRecords = async (): Promise<Record<string, Record<string, AttendanceRecord>>> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('timestamp', { ascending: true });

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

// Submit attendance record (APPEND-ONLY - tidak menimpa data lama)
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

    // 🔥 REVERT: Gunakan upsert langsung ke attendance_records sesuai instruksi user
    const { data: insertedData, error: upsertError } = await (supabase
      .from('attendance_records') as any)
      .upsert({
        employee_id: employeeId,
        entity_id: entityId,
        status: status,
        reason: reason,
        timestamp: timestamp,
        is_late_entry: isLateEntry,
        location: location ? JSON.stringify(location) : null
      }, { onConflict: ['employee_id', 'entity_id'] })
      .select()
      .single();

    if (upsertError) {
      if (process.env.NODE_ENV === "development") {
        console.error('❌ Error upserting attendance:', upsertError);
      }
      throw new Error(`Supabase error: ${upsertError.message} (Code: ${upsertError.code})`);
    }

    if (!insertedData) {
      throw new Error('No data returned from Supabase after upsert');
    }

    const newRecord = insertedData;

    return newRecord as AttendanceRecord;
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