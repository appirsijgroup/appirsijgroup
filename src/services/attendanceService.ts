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
    .order('created_at', { ascending: true });
  // TODO: Tambahkan .eq('is_latest', true) setelah migrasi database

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

// 🔥 UPDATED: Get ALL attendance records (hanya yang TERBARA) - for admin dashboard
export const getAllAttendanceRecords = async (): Promise<Record<string, Record<string, AttendanceRecord>>> => {
  // 🔥 FIX: Kolom is_latest belum ada di database, sementara ambil semua data
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('created_at', { ascending: true });
  // TODO: Tambahkan .eq('is_latest', true) setelah migrasi database

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

    // 🔥 UPDATE: Gunakan fungsi insert_attendance (APPEND-ONLY, bukan UPSERT)
    // Ini membuat record BARU setiap kali, tidak menimpa data lama
    const { data, error } = await supabase.rpc('insert_attendance', {
      p_employee_id: employeeId,
      p_entity_id: entityId,
      p_status: status,
      p_reason: reason,
      p_timestamp: timestamp,
      p_is_late_entry: isLateEntry,
      p_location: location ? JSON.stringify(location) : null
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error('❌ Error submitting attendance:', error);
      }
      throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      throw new Error('No data returned from Supabase after insert');
    }

    // Fetch the full record that was just inserted
    const { data: newRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch inserted record: ${fetchError.message}`);
    }

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