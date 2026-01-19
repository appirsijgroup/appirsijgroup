'use client';

import React, { useEffect, useState } from 'react';
import { useAppDataStore, useUIStore } from '@/store/store';
import { Employee, type RawEmployee } from '@/types';
import { getPaginatedEmployees } from '@/services/employeeServicePaginated';
import { updateEmployee as updateEmployeeSupabase } from '@/services/employeeService';
import { getEmployeeAttendance, getAllAttendanceRecords } from '@/services/attendanceService';
import BrandedLoader from '@/components/BrandedLoader';
import { convertToCamelCase } from '@/services/employeeService';
import { validateRoleChange, getRoleDisplay } from '@/lib/rolePermissions';

export default function EmployeesPage() {
    const { allUsersData, loggedInEmployee, setAllUsersData } = useAppDataStore();
    const { addToast } = useUIStore();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Load employees with pagination
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.time('⚡ Load Employees Data');

                // Load employees with PAGINATION (15 per page)
                console.log(`🔍 Loading employees: page ${page}, search="${searchTerm}", role="${roleFilter}"`);

                const paginatedResult = await getPaginatedEmployees({
                    page,
                    limit: 15,
                    search: searchTerm,
                    role: roleFilter,
                    isActive: isActiveFilter
                });

                console.log(`✅ Loaded ${paginatedResult.employees.length} of ${paginatedResult.pagination.total} employees`);

                // Convert employees to allUsersData format
                const newData: Record<string, { employee: Employee; attendance: any; history: Record<string, any> }> = {};

                for (const emp of paginatedResult.employees) {
                    const camelCaseEmp = convertToCamelCase(emp);
                    newData[emp.id] = {
                        employee: camelCaseEmp,
                        attendance: {},
                        history: {}
                    };
                }

                setAllUsersData(() => newData);

                // Update pagination state
                setTotalCount(paginatedResult.pagination.total);
                setTotalPages(paginatedResult.pagination.totalPages);
                console.log(`✅ Page ${paginatedResult.pagination.page}/${paginatedResult.pagination.totalPages}`);

                // Load attendance records for current page employees
                try {
                    const allRecords = await getAllAttendanceRecords();
                    console.log(`✅ Loaded ${Object.keys(allRecords).length} total attendance records`);

                    // Update attendance for current page employees
                    setAllUsersData((prev) => {
                        const updated = { ...prev };

                        Object.entries(allRecords).forEach(([employeeId, records]: [string, any]) => {
                            if (updated[employeeId]) {
                                updated[employeeId].attendance = {};
                                Object.entries(records).forEach(([entityId, record]: [string, any]) => {
                                    if (record && record.status) {
                                        updated[employeeId].attendance[entityId] = {
                                            status: record.status,
                                            reason: record.reason || null,
                                            timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                            submitted: true,
                                            isLateEntry: record.is_late_entry || false
                                        };
                                    }
                                });
                            }
                        });

                        return updated;
                    });
                } catch (error) {
                    console.error('⚠️ Error loading attendance:', error);
                }

                console.timeEnd('⚡ Load Employees Data');
            } catch (err: unknown) {
                console.error('❌ Error loading employees:', err);
                setError(err instanceof Error ? err.message : 'Failed to load employees from database');
            } finally {
                setIsLoading(false);
            }
        };

        loadEmployees();
    }, [page, searchTerm, roleFilter, isActiveFilter, setAllUsersData]);

    // Pagination handlers
    const handleNextPage = () => setPage(p => Math.min(p + 1, totalPages));
    const handlePrevPage = () => setPage(p => Math.max(p - 1, 1));
    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setPage(1);
    };
    const handleRoleFilter = (role: string) => {
        setRoleFilter(role);
        setPage(1);
    };
    const handleIsActiveFilter = (isActive: boolean | undefined) => {
        setIsActiveFilter(isActive);
        setPage(1);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <BrandedLoader />
                    <p className="text-white mt-4">Memuat data employee...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center bg-red-500/20 p-8 rounded-lg border border-red-500">
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

    if (!loggedInEmployee) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white text-xl">Silakan login terlebih dahulu</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-6">Manajemen Employee</h1>

            {/* Employee Table */}
            <div className="bg-gray-800 rounded-lg p-6">
                <p className="text-gray-300">Fitur employee management akan ditampilkan di sini.</p>
                <p className="text-gray-400 mt-2">Total: {totalCount} employee | Halaman {page} dari {totalPages}</p>

                {/* Pagination Controls */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handlePrevPage}
                        disabled={page === 1}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-white">Page {page} of {totalPages}</span>
                    <button
                        onClick={handleNextPage}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
