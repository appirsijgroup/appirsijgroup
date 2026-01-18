'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/types';

interface EmployeesResponse {
  employees: Employee[];
  totalCount: number;
}

interface UseEmployeesOptions {
  page?: number;
  limit?: number;
  filter?: {
    isActive?: boolean;
    role?: string;
    search?: string;
  };
}

/**
 * Hook untuk mengambil data employees dengan pagination & filtering
 *
 * @example
 * const { employees, isLoading, error } = useEmployees({ page: 1, limit: 20 });
 */
export function useEmployees(options: UseEmployeesOptions = {}) {
  const { page = 1, limit = 50, filter } = options;
  const queryClient = useQueryClient();

  // Build query params
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  if (filter?.isActive !== undefined) params.append('isActive', filter.isActive.toString());
  if (filter?.role) params.append('role', filter.role);
  if (filter?.search) params.append('search', filter.search);

  const query = useQuery({
    queryKey: ['employees', page, limit, filter],
    queryFn: async (): Promise<EmployeesResponse> => {
      const response = await fetch(`/api/employees?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - employee list jarang berubah
    gcTime: 1000 * 60 * 60,    // 60 minutes - cache lebih lama
  });

  /**
   * Mutation untuk create employee baru
   */
  const createEmployee = useMutation({
    mutationFn: async (employeeData: Partial<Employee>) => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  /**
   * Mutation untuk update employee
   */
  const updateEmployee = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      // Update cache untuk specific employee jika ada
      queryClient.setQueryData(['employee', variables.id], data);
    },
  });

  /**
   * Mutation untuk delete employee
   */
  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return {
    // Query
    employees: query.data?.employees || [],
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Pagination info
    currentPage: page,
    pageSize: limit,
    totalPages: Math.ceil((query.data?.totalCount || 0) / limit),

    // Mutations
    createEmployee: createEmployee.mutate,
    updateEmployee: updateEmployee.mutate,
    deleteEmployee: deleteEmployee.mutate,

    isCreating: createEmployee.isPending,
    isUpdating: updateEmployee.isPending,
    isDeleting: deleteEmployee.isPending,
  };
}

/**
 * Hook untuk mengambil single employee by ID
 */
export function useEmployee(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employee', id],
    queryFn: async (): Promise<Employee> => {
      if (!id) throw new Error('Employee ID is required');

      const response = await fetch(`/api/employees/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }

      const data = await response.json();
      return data.employee;
    },
    enabled: !!id, // Hanya fetch jika id ada
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    employee: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
