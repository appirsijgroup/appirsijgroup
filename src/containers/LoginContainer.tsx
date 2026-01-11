'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';
import { useAppDataStore } from '@/store/store';
import type { Employee } from '@/types';
import { getEmployeeById } from '@/services/employeeService';

const LoginContainer: React.FC = () => {
    const router = useRouter();
    const { setLoggedInEmployee, setAllUsersData } = useAppDataStore();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = async (identifier: string, pass: string): Promise<{ employee: Employee | null; error?: string }> => {
        setIsAuthenticating(true);

        try {
            console.log('🔑 Login attempt:', identifier);

            // 🔥 SECURITY: Call server-side API instead of direct database access
            // This prevents password exposure in client-side code
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password: pass }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Login API error:', data.error);

                // Handle rate limiting (429)
                if (response.status === 429) {
                    return { employee: null, error: data.error };
                }

                // Handle other errors
                return { employee: null, error: data.error || 'Login gagal. Silakan coba lagi.' };
            }

            // Success - API returns employee data (without password)
            console.log('✅ Login successful for:', data.employee.name);

            // Set session cookie and localStorage
            document.cookie = `loggedInUserId=${data.employee.id}; path=/; max-age=86400; SameSite=Lax`;
            localStorage.setItem('loggedInUserId', data.employee.id);

            setLoggedInEmployee(data.employee);

            // Load other employees data in BACKGROUND after successful login
            // This ensures smooth UX - user can proceed while data loads
            loadAllEmployeesInBackground(data.employee.id);

            // Redirect to dashboard immediately
            router.push('/dashboard');

            return { employee: data.employee };

        } catch (err) {
            console.error('❌ Login error:', err);
            return { employee: null, error: 'Terjadi kesalahan jaringan. Silakan coba lagi.' };
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Load all employees in background after login
    const loadAllEmployeesInBackground = async (loggedInEmployeeId: string) => {
        try {
            // 🔥 FIX: Use getAllEmployees to get properly converted camelCase data
            const { getAllEmployees } = await import('@/services/employeeService');
            const allEmployees = await getAllEmployees();

            if (allEmployees) {
                // Load ALL attendance data in ONE call
                const { getAllAttendanceRecords } = await import('@/services/attendanceService');
                let allAttendanceData: Record<string, Record<string, any>> = {};

                try {
                    const allRecords = await getAllAttendanceRecords();
                    console.log(`✅ Loaded ${Object.keys(allRecords).length} employees' attendance data`);

                    // Convert to per-employee format
                    Object.entries(allRecords).forEach(([employeeId, records]: [string, any]) => {
                        allAttendanceData[employeeId] = {};
                        Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                            if (record && record.status) {
                                allAttendanceData[employeeId][entityId] = {
                                    status: record.status,
                                    reason: record.reason || null,
                                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                    submitted: true,
                                    isLateEntry: record.is_late_entry || false
                                };
                            }
                        });
                    });
                } catch (error) {
                    console.error('⚠️ Error loading bulk attendance:', error);
                }

                // Build complete users data structure
                const newData: Record<string, any> = {};
                for (const emp of allEmployees) {
                    newData[emp.id] = {
                        employee: emp, // ✅ Now emp is in proper camelCase format with activatedMonths
                        attendance: allAttendanceData[emp.id] || {}, // Use pre-loaded data
                        history: {} // Will be loaded on-demand
                    };
                }
                setAllUsersData(() => newData);

                // 🔥 CRITICAL FIX: Update loggedInEmployee with camelCase data
                // Find the logged-in user from the freshly loaded camelCase data
                const loggedInUserCamelCase = allEmployees.find(e => e.id === loggedInEmployeeId);
                if (loggedInUserCamelCase) {
                    console.log('🔄 Updating loggedInEmployee with camelCase data:', {
                        id: loggedInUserCamelCase.id,
                        canBeMentor: loggedInUserCamelCase.canBeMentor,
                        canBeSupervisor: loggedInUserCamelCase.canBeSupervisor,
                        canBeKaUnit: loggedInUserCamelCase.canBeKaUnit,
                        functionalRoles: loggedInUserCamelCase.functionalRoles
                    });
                    setLoggedInEmployee(loggedInUserCamelCase);
                }

                console.log(`✅ Loaded ${allEmployees.length} employees with attendance data (including activatedMonths)`);
            }
        } catch (err) {
            console.error('Error loading employees in background:', err);
            // Don't show error to user - login already succeeded
        }
    };

    return (
        <Login
            onLogin={handleLogin}
            isAuthenticating={isAuthenticating}
        />
    );
};

export default LoginContainer;
