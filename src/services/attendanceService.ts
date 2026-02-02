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

// Get all attendance records (with optional date range filter)
export const getAllAttendanceRecords = async (startDate?: string, endDate?: string): Promise<Record<string, Record<string, AttendanceRecord>>> => {
  let query = supabase
    .from('attendance_records')
    .select('*')
    .order('timestamp', { ascending: true });

  if (startDate && endDate) {
    query = query.gte('timestamp', startDate).lte('timestamp', endDate + 'T23:59:59');
  } else {
    // ⚡ SAFETY: If no range provided, only get last 30 days or limit to prevent massive payload
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte('timestamp', thirtyDaysAgo.toISOString()).limit(2000);
  }

  const { data, error } = await query;

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
  location?: { latitude: number; longitude: number },
  customTimestamp?: string
): Promise<AttendanceRecord> => {
  try {
    // Validate time before submitting attendance
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Attendance submission denied.');
    }

    // Check if the entity date is in the future compared to validated time
    const entityDateMatch = entityId.match(/\d{4}-\d{2}-\d{2}/);
    if (entityDateMatch) {
      const entityDate = new Date(entityDateMatch[0]);
      const correctedTime = timeValidation.correctedTime;

      if (entityDate > correctedTime) {
        throw new Error('Cannot submit attendance for future dates.');
      }
    }

    const timestamp = customTimestamp || timeValidation.correctedTime.toISOString();

    // Use API endpoint to bypass RLS
    const response = await fetch('/api/attendance/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        entity_id: entityId,
        status,
        reason,
        timestamp,
        is_late_entry: isLateEntry,
        location: location ? JSON.stringify(location) : null
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to submit attendance: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    return result.data as AttendanceRecord;
  } catch (err: any) {
    throw err;
  }
};

// Delete attendance record
export const deleteAttendance = async (employeeId: string, entityId: string): Promise<void> => {
  // Use API endpoint to bypass RLS
  const response = await fetch(`/api/attendance/submit?employeeId=${employeeId}&entityId=${entityId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to delete attendance: ${errorData.error || 'Unknown error'}`);
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

  // Use API endpoint to bypass RLS
  const response = await fetch('/api/attendance/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      employeeId,
      records: recordsWithIds
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to batch update attendance: ${errorData.error || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data as AttendanceRecord[];
};