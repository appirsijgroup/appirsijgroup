'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

/**
 * ⚡ Optimized Query Provider Configuration
 *
 * Caching Strategy:
 * - Employee data: 10 minutes (rarely changes)
 * - Attendance data: 5 minutes (changes daily)
 * - Announcements: 15 minutes (changes weekly)
 * - Real-time data: 0 minutes (always fresh)
 */

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // ⚡ PERFORMANCE: Cache data for 5 minutes by default
                        staleTime: 1000 * 60 * 5, // 5 minutes
                        gcTime: 1000 * 60 * 30, // 30 minutes (garbage collection)

                        // 🔒 UX: Don't refetch on window focus (reduces API calls)
                        refetchOnWindowFocus: false,

                        // 🔄 RETRY: Retry failed requests once with exponential backoff
                        retry: 1,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

                        // 🚀 PERFORMANCE: Don't refetch on mount if data is fresh
                        refetchOnMount: false,
                    },
                    mutations: {
                        // 🔄 RETRY: Retry mutations once
                        retry: 1,
                        onError: (err) => {
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    );
}

/**
 * Query Keys Factory
 * Centralized query key management for better cache management
 */
export const queryKeys = {
    // Employee queries
    employees: ['employees'] as const,
    employee: (id: string) => ['employees', id] as const,
    employeeAttendance: (id: string) => ['employees', id, 'attendance'] as const,

    // Attendance queries
    attendance: ['attendance'] as const,
    attendanceByDate: (date: string) => ['attendance', date] as const,

    // Announcement queries
    announcements: ['announcements'] as const,
    unreadAnnouncements: ['announcements', 'unread'] as const,

    // Activity queries
    activities: ['activities'] as const,
    monthlyActivities: (employeeId: string, month: string) =>
        ['activities', 'monthly', employeeId, month] as const,

    // Team attendance
    teamSessions: ['team-attendance', 'sessions'] as const,
    teamSession: (id: string) => ['team-attendance', 'sessions', id] as const,

    // Sunnah ibadah
    sunnahIbadah: ['sunnah-ibadah'] as const,

    // Bookmarks
    bookmarks: (type: string) => ['bookmarks', type] as const,
} as const;

/**
 * Query Stale Time Presets
 * Use these for different data freshness requirements
 */
export const staleTime = {
    /** 30 seconds - Real-time data */
    realtime: 1000 * 30,
    /** 2 minutes - Frequently changing data */
    frequent: 1000 * 60 * 2,
    /** 5 minutes - Default */
    default: 1000 * 60 * 5,
    /** 15 minutes - Rarely changing data */
    rare: 1000 * 60 * 15,
    /** 1 hour - Static data */
    static: 1000 * 60 * 60,
} as const;
