import { supabase } from '@/lib/supabase';
import type { Database } from './database.types';

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];

/**
 * Prayer Attendance Service
 * Mengambil data presensi sholat untuk laporan
 */

export interface PrayerAttendanceData {
    employee_id: string;
    employee_name: string;
    unit: string;
    profession_category: string;
    profession: string;
    date: string;
    entity_id: string; // subuh, dzuhur, ashar, maghrib, isya
    status: 'Hadir' | 'Tidak Hadir';
}

/**
 * Get all prayer attendance records untuk laporan
 */
export const getAllPrayerAttendance = async (
    startDate?: string,
    endDate?: string
): Promise<PrayerAttendanceData[]> => {
    try {
        // Get all prayer attendance dengan employee data
        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('*')
            .in('entity_id', ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya', 'jumat'])
            .eq('status', 'hadir')
            .order('timestamp', { ascending: false });

        if (attendanceError) {
            console.error('Error fetching prayer attendance:', attendanceError);
            return [];
        }

        if (!attendanceData || (attendanceData as any[]).length === 0) {
            return [];
        }

        const data = attendanceData as AttendanceRecord[];

        // Get unique employee IDs
        const employeeIds = [...new Set(data.map(r => r.employee_id))];

        // Get employee data in one query
        const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('id, name, unit, profession_category, profession, activated_months')
            .in('id', employeeIds);

        if (employeesError || !employeesData) {
            console.error('Error fetching employees:', employeesError);
            return [];
        }

        const employees = employeesData as any[];

        // Create employee map
        const employeeMap = new Map(employees.map(emp => [emp.id, emp]));

        // Join attendance with employee data
        const result: PrayerAttendanceData[] = data
            .filter(record => {
                if (!startDate && !endDate) return true;

                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                if (startDate && recordDate < startDate) return false;
                if (endDate && recordDate > endDate) return false;
                return true;
            })
            .map(record => {
                const employee = employeeMap.get(record.employee_id);
                if (!employee) return null;

                const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
                const monthKey = recordDate.slice(0, 7);
                const isMonthActivated = employee.activated_months?.includes(monthKey) ?? false;

                return {
                    employee_id: employee.id,
                    employee_name: employee.name,
                    unit: employee.unit,
                    profession_category: employee.profession_category,
                    profession: employee.profession,
                    date: recordDate,
                    entity_id: record.entity_id,
                    status: record.status === 'hadir' ? 'Hadir' : 'Tidak Hadir'
                };
            })
            .filter((record): record is PrayerAttendanceData => record !== null);

        return result;
    } catch (error) {
        console.error('Error in getAllPrayerAttendance:', error);
        return [];
    }
};
