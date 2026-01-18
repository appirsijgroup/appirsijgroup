'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/types';

interface MeResponse {
  employee: Employee;
  allUsersData?: Record<string, {
    employee: Employee;
    attendance: any;
    history: any;
  }>;
}

/**
 * Hook untuk mengambil data user yang sedang login
 *
 * Menggunakan React Query untuk:
 * - Automatic caching (5 min)
 * - Background refetching
 * - Error handling
 * - Reduce redundant requests
 */
export function useMe() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<MeResponse> => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user data');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - data dianggap fresh selama 5 menit
    gcTime: 1000 * 60 * 30,    // 30 minutes - garbage collection time
    refetchOnWindowFocus: false, // Tidak refetch saat window focus (reduce bandwidth)
    retry: 1,                   // Coba 1x lagi jika gagal
  });

  /**
   * Mutation untuk update profile employee
   */
  const updateProfile = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Employee> }) => {
      const response = await fetch(`/api/employees/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate 'me' query untuk trigger refetch
      queryClient.invalidateQueries({ queryKey: ['me'] });

      // Jika update employee lain, invalidate list employees
      if (variables.userId !== query.data?.employee?.id) {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    },
  });

  /**
   * Mutation untuk logout
   */
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear semua queries
      queryClient.clear();
    },
  });

  return {
    // Query
    me: query.data?.employee,
    allUsersData: query.data?.allUsersData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetched: query.isFetched,

    // Mutations
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    isUpdatingProfile: updateProfile.isPending,

    logout: logout.mutate,
    isLoggingOut: logout.isPending,
  };
}
