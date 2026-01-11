'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';
import { useAppDataStore } from '@/store/store';
import bcrypt from 'bcryptjs';
import type { Employee } from '@/types';
import { getEmployeeById } from '@/services/employeeService';
import { supabase } from '@/lib/supabase';

const SALT_ROUNDS = 10;

const LoginContainer: React.FC = () => {
    const router = useRouter();
    const { setLoggedInEmployee, setAllUsersData } = useAppDataStore();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = async (identifier: string, pass: string): Promise<{ employee: Employee | null; error?: string }> => {
        setIsAuthenticating(true);

        try {
            console.log('🔑 Login attempt:', identifier);

            // ENTERPRISE PATTERN: Fetch ONLY the user trying to login, not all employees
            // This makes login page instant and scalable
            const { data: employeeData, error } = await supabase
                .from('employees')
                .select('*')
                .or(`id.eq.${identifier},email.eq.${identifier}`)
                .single();

            // DEBUG: Log hasil query
            console.log('📊 Query result:', { error, employeeData });

            if (error) {
                console.error('❌ Supabase error:', error);
                if (error.code === 'PGRST116') {
                    // No rows returned - employee not found
                    return { employee: null, error: `NIP/Email "${identifier}" tidak ditemukan di database.` };
                }
                return { employee: null, error: `Database error: ${error.message}` };
            }

            if (!employeeData) {
                console.error('❌ Employee not found for identifier:', identifier);
                return { employee: null, error: `NIP/Email "${identifier}" tidak ditemukan. Pastikan NIP/Email sudah benar.` };
            }

            const employee: Employee = employeeData;
            // Map snake_case from database to camelCase for TypeScript
            const dbIsActive = (employee as any).is_active;
            const isActive = dbIsActive !== false && employee.isActive !== false;
            console.log('✅ Employee found:', { id: employee.id, name: employee.name, isActive });
            console.log('📊 is_active (DB):', dbIsActive);

            // DEBUG: Log password comparison
            console.log('🔐 Password check:', {
                hasPassword: !!employee.password,
                passwordLength: employee.password?.length,
                inputLength: pass.length,
                isActive: isActive
            });

            let isMatch = false;

            // 1. Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
            const isHashed = employee.password && (employee.password.startsWith('$2a$') || employee.password.startsWith('$2b$') || employee.password.startsWith('$2y$'));

            if (isHashed) {
                console.log('🔒 Using hashed password comparison');
                try {
                    isMatch = bcrypt.compareSync(pass, employee.password);
                    console.log('🔑 Hash comparison result:', isMatch);
                } catch (err) {
                    console.error('❌ Bcrypt error:', err);
                }
            } else {
                // 2. Legacy Plain Text Fallback (for old passwords)
                console.log('⚠️ Using plain text password comparison');
                if (employee.password === pass || employee.password === `hashed_${pass}`) {
                    isMatch = true;
                    console.log(`✅ Plain text match for user ${employee.id}`);
                }
            }

            if (!isMatch) {
                console.error('❌ Password mismatch for user:', employee.id);
                return { employee: null, error: 'Password salah. Silakan coba lagi.' };
            }

            // Check if account is active (handle undefined/null as active)
            // Note: Supabase returns is_active (snake_case)
            if (!isActive) {
                console.error('❌ Account inactive:', employee.id);
                return { employee: null, error: `Akun untuk ${employee.name} (NIP: ${employee.id}) dinonaktifkan. Hubungi Admin.` };
            }

            // Success - Set logged in user
            console.log('✅ Login successful for:', employee.name);
            localStorage.setItem('loggedInUserId', employee.id);
            setLoggedInEmployee(employee);

            // Load other employees data in BACKGROUND after successful login
            // This ensures smooth UX - user can proceed while data loads
            loadAllEmployeesInBackground(employee.id);

            // Redirect to dashboard immediately
            router.push('/dashboard');

            return { employee };

        } catch (err) {
            console.error('❌ Login error:', err);
            return { employee: null, error: 'Terjadi kesalahan saat login. Silakan coba lagi.' };
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
