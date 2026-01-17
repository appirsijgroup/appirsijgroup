'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppDataStore, useDailyActivitiesStore } from '@/store/store';
import { getAllEmployees } from '@/services/employeeService';
import type { Employee, Attendance } from '@/types';

// ⚡ OPTIMIZATION: Dynamic import untuk Analytics component - hanya load ketika dibutuhkan
const Analytics = dynamic(() => import('@/components/Analytics'), {
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                <p className="text-white text-lg">Memuat Analytics...</p>
            </div>
        </div>
    ),
    ssr: false
});

export default function AnalyticsPage() {
    const { allUsersData, setAllUsersData, loggedInEmployee } = useAppDataStore();
    const { dailyActivitiesConfig } = useDailyActivitiesStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🔥 FIX: Load all employees from Supabase for Analytics
    useEffect(() => {
        const loadAnalyticsData = async () => {
            // Check if we already have data loaded (more than just the logged-in user)
            const employeeCount = Object.keys(allUsersData).length;
            const hasMultipleEmployees = employeeCount > 1;

            if (hasMultipleEmployees) {
                console.log('✅ Analytics data already loaded:', employeeCount, 'employees');
                setIsLoading(false);
                return;
            }

            try {
                console.log('🔄 Loading all employees for Analytics...');
                setIsLoading(true);
                setError(null);

                // Load all employees from Supabase
                const employees = await getAllEmployees();
                console.log(`✅ Loaded ${employees.length} employees from Supabase`);

                // Load attendance records for all employees
                const { getEmployeeAttendance } = await import('@/services/attendanceService');

                const newData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }> = {};

                for (const emp of employees) {
                    let attendanceData: Attendance = {};
                    try {
                        const records = await getEmployeeAttendance(emp.id);
                        Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                            if (record && record.status) {
                                attendanceData[entityId] = {
                                    status: record.status,
                                    reason: record.reason || null,
                                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                    submitted: true,
                                    isLateEntry: record.is_late_entry || false
                                };
                            }
                        });
                    } catch (error) {
                        console.error(`⚠️ Error loading attendance for ${emp.id}:`, error);
                        attendanceData = {};
                    }

                    newData[emp.id] = {
                        employee: emp,
                        attendance: attendanceData,
                        history: {}
                    };
                }

                setAllUsersData(() => newData);
                console.log('✅ Analytics data loaded successfully');
                setIsLoading(false);
            } catch (err) {
                console.error('❌ Error loading analytics data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load employees data');
                setIsLoading(false);
            }
        };

        loadAnalyticsData();
    }, []); // Run once on mount

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Memuat data karyawan...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
                    <p className="text-red-400 text-xl mb-4">Error memuat data</p>
                    <p className="text-white mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    // Show analytics if not loading and no error
    return <Analytics allUsersData={allUsersData} dailyActivitiesConfig={dailyActivitiesConfig} />;
}
