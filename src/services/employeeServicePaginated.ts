import { type Employee } from '@/types';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertToCamelCase } from './employeeService';

/**
 * Paginated Employee Service
 *
 * Service untuk mengambil data employees dengan pagination
 * untuk meningkatkan performa loading
 */

export interface PaginatedEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  hospitalId?: string;
}

export interface PaginatedEmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get employees dengan pagination
 *
 * @example
 * // Get first 20 employees
 * const result = await getPaginatedEmployees({ page: 1, limit: 20 });
 *
 * // Get employees with search
 * const result = await getPaginatedEmployees({
 *   page: 1,
 *   limit: 20,
 *   search: 'budi',
 *   role: 'employee',
 *   isActive: true
 * });
 */
export async function getPaginatedEmployees(
  params: PaginatedEmployeesParams = {}
): Promise<PaginatedEmployeesResponse> {
  const { page = 1, limit = 20, search, role, isActive } = params;

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  if (search) queryParams.append('search', search);
  if (role) queryParams.append('role', role);
  if (params.hospitalId) queryParams.append('hospitalId', params.hospitalId);
  if (isActive !== undefined) queryParams.append('isActive', isActive.toString());

  // Fetch from paginated API
  const response = await fetch(`/api/employees/paginated?${queryParams.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch employees');
  }

  const data = await response.json();

  return {
    ...data,
    employees: data.employees.map((emp: any) => convertToCamelCase(emp))
  };
}

/**
 * Get single employee by ID (untuk detail view)
 */
export async function getEmployeeDetail(id: string) {
  const response = await fetch(`/api/employees/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch employee detail');
  }

  const data = await response.json();
  return convertToCamelCase(data);
}
