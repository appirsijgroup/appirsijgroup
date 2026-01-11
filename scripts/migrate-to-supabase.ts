/**
 * Migration Script: LocalStorage to Supabase
 *
 * This script migrates all employee data from localStorage to Supabase database.
 * Run this script to initialize your Supabase database with existing local data.
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee, Attendance } from '../src/types';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface UserData {
    employee: Employee;
    attendance: Attendance;
    history: Record<string, Attendance>;
}

/**
 * Load data from localStorage
 * Note: This function is for documentation purposes.
 * In a browser environment, you can access localStorage directly.
 */
function loadFromLocalStorage(): Record<string, UserData> {
    if (typeof window === 'undefined') {
        console.error('❌ This script must run in a browser environment');
        throw new Error('localStorage not available');
    }

    const saved = localStorage.getItem('allUsersData');
    if (!saved) {
        console.error('❌ No data found in localStorage');
        throw new Error('No data in localStorage');
    }

    return JSON.parse(saved);
}

/**
 * Migrate a single employee to Supabase
 */
async function migrateEmployee(employeeId: string, data: UserData): Promise<boolean> {
    try {
        // 1. Check if employee exists
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('id', employeeId)
            .single();

        if (existing) {
            // Update existing employee
            const { error: updateError } = await supabase
                .from('employees')
                .update(data.employee)
                .eq('id', employeeId);

            if (updateError) throw updateError;
            console.log(`✅ Updated employee: ${data.employee.name} (${employeeId})`);
        } else {
            // Create new employee
            const { error: insertError } = await supabase
                .from('employees')
                .insert(data.employee);

            if (insertError) throw insertError;
            console.log(`✅ Created employee: ${data.employee.name} (${employeeId})`);
        }

        // 2. Sync attendance
        const { error: attendanceError } = await supabase
            .from('attendances')
            .upsert({
                employee_id: employeeId,
                attendance_data: data.attendance
            });

        if (attendanceError) throw attendanceError;

        // 3. Sync history
        // Delete old history first
        const { error: deleteHistoryError } = await supabase
            .from('attendance_history')
            .delete()
            .eq('employee_id', employeeId);

        if (deleteHistoryError) throw deleteHistoryError;

        // Insert new history
        const historyEntries = Object.entries(data.history).map(([date, attendanceData]) => ({
            employee_id: employeeId,
            date,
            attendance_data: attendanceData
        }));

        if (historyEntries.length > 0) {
            const { error: historyError } = await supabase
                .from('attendance_history')
                .insert(historyEntries);

            if (historyError) throw historyError;
        }

        return true;
    } catch (error) {
        console.error(`❌ Failed to migrate ${employeeId}:`, error);
        return false;
    }
}

/**
 * Main migration function
 */
export async function migrateToSupabase(): Promise<void> {
    console.log('🚀 Starting migration from localStorage to Supabase...\n');

    try {
        // Load data from localStorage
        const usersData = loadFromLocalStorage();
        const employeeIds = Object.keys(usersData);
        console.log(`📦 Found ${employeeIds.length} employees in localStorage\n`);

        let successCount = 0;
        let failCount = 0;

        // Migrate each employee
        for (const employeeId of employeeIds) {
            const success = await migrateEmployee(employeeId, usersData[employeeId]);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Success: ${successCount} employees`);
        console.log(`   ❌ Failed: ${failCount} employees`);
        console.log('='.repeat(60));

        if (failCount === 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log('✨ Your data is now synced with Supabase');
        } else {
            console.log('\n⚠️  Migration completed with some errors.');
            console.log('Please check the errors above and try again.');
        }
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Browser console usage:
 * 1. Open your app in a browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this function, then run:
 *
 *    await migrateToSupabase()
 */
