'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaginatedEmployees, type PaginatedEmployeesParams } from '@/services/employeeServicePaginated';

/**
 * Hook untuk mengambil employees dengan pagination
 *
 * @example
 * // Basic usage
 * const { employees, isLoading, pagination } = usePaginatedEmployees();
 *
 * // With filters
 * const { employees, isLoading, pagination } = usePaginatedEmployees({
 *   page: 1,
 *   limit: 15,
 *   search: 'budi',
 *   role: 'employee'
 * });
 */
export function usePaginatedEmployees(params: PaginatedEmployeesParams = {}) {
  const { page = 1, limit = 20, search, role, isActive } = params;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employees', 'paginated', page, limit, search, role, isActive],
    queryFn: () => getPaginatedEmployees({ page, limit, search, role, isActive }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });

  /**
   * Prefetch halaman berikutnya untuk faster navigation
   */
  const prefetchNextPage = async () => {
    if (query.data?.pagination.hasNext) {
      await queryClient.prefetchQuery({
        queryKey: ['employees', 'paginated', page + 1, limit, search, role, isActive],
        queryFn: () => getPaginatedEmployees({ page: page + 1, limit, search, role, isActive }),
      });
    }
  };

  /**
   * Prefetch halaman sebelumnya
   */
  const prefetchPrevPage = async () => {
    if (query.data?.pagination.hasPrev) {
      await queryClient.prefetchQuery({
        queryKey: ['employees', 'paginated', page - 1, limit, search, role, isActive],
        queryFn: () => getPaginatedEmployees({ page: page - 1, limit, search, role, isActive }),
      });
    }
  };

  return {
    // Data
    employees: query.data?.employees || [],
    pagination: query.data?.pagination,
    totalCount: query.data?.pagination?.total || 0,

    // Loading states
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isRefetching: query.isRefetching,

    // Prefetch functions
    prefetchNextPage,
    prefetchPrevPage,

    // Refetch
    refetch: query.refetch,
  };
}

/**
 * Hook helper untuk pagination controls
 *
 * @example
 * const { canGoNext, canGoPrev, goNext, goPrev } = usePaginationControls(pagination, refetch);
 */
export function usePaginationControls(
  pagination: any,
  refetch: () => void
) {
  return {
    canGoNext: pagination?.hasNext || false,
    canGoPrev: pagination?.hasPrev || false,
    hasNextPage: pagination?.hasNext || false,
    hasPrevPage: pagination?.hasPrev || false,
    currentPage: pagination?.page || 1,
    totalPages: pagination?.totalPages || 1,
  };
}
