'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Employee } from '@/types';

/**
 * Hook untuk mengambil monthly activities employee
 *
 * @example
 * const { monthlyActivities, updateActivities } = useMonthlyActivities(employeeId);
 */
export function useMonthlyActivities(employeeId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['monthlyActivities', employeeId],
    queryFn: async (): Promise<Record<string, any>> => {
      if (!employeeId) return {};

      const { getMonthlyActivities } = await import('@/services/monthlyActivityService');
      const data = await getMonthlyActivities(employeeId);
      return data.activities || {};
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
  });

  /**
   * Mutation untuk update monthly activities
   */
  const updateActivities = useMutation({
    mutationFn: async (activities: Record<string, any>) => {
      if (!employeeId) throw new Error('Employee ID is required');

      const { updateMonthlyActivities } = await import('@/services/monthlyActivityService');
      return await updateMonthlyActivities(employeeId, activities);
    },
    onMutate: async (newActivities) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['monthlyActivities', employeeId] });

      const previousActivities = queryClient.getQueryData<Record<string, any>>(
        ['monthlyActivities', employeeId]
      );

      // Set optimistic data
      queryClient.setQueryData(['monthlyActivities', employeeId], newActivities);

      return { previousActivities };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousActivities) {
        queryClient.setQueryData(
          ['monthlyActivities', employeeId],
          context.previousActivities
        );
      }
    },
    onSuccess: () => {
      // Invalidate untuk ensure data terbaru
      queryClient.invalidateQueries({ queryKey: ['monthlyActivities', employeeId] });
    },
  });

  return {
    monthlyActivities: query.data || {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    updateActivities: updateActivities.mutate,
    updateActivitiesAsync: updateActivities.mutateAsync,
    isUpdating: updateActivities.isPending,
  };
}

/**
 * Hook untuk mengambil reading history
 */
export function useReadingHistory(employeeId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['readingHistory', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { getReadingHistory } = await import('@/services/readingHistoryService');
      return await getReadingHistory(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 10, // 10 minutes - history jarang berubah
  });

  /**
   * Mutation untuk submit book reading
   */
  const submitBookReading = useMutation({
    mutationFn: async (data: { bookTitle: string; pagesRead: number; dateCompleted: string }) => {
      if (!employeeId) throw new Error('Employee ID is required');

      const { submitBookReading } = await import('@/services/readingHistoryService');
      return await submitBookReading(employeeId, data.bookTitle, data.pagesRead.toString(), data.dateCompleted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingHistory', employeeId] });
      // Invalidate 'me' query karena data employee berubah
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  /**
   * Mutation untuk delete reading history
   */
  const deleteReadingHistory = useMutation({
    mutationFn: async (id: string) => {
      const { deleteReadingHistory } = await import('@/services/readingHistoryService');
      return await deleteReadingHistory(id, employeeId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingHistory', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    readingHistory: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    submitBookReading: submitBookReading.mutate,
    deleteReadingHistory: deleteReadingHistory.mutate,

    isSubmitting: submitBookReading.isPending,
    isDeleting: deleteReadingHistory.isPending,
  };
}

/**
 * Hook untuk mengambil Quran reading history
 */
export function useQuranReadingHistory(employeeId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['quranReadingHistory', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { getQuranReadingHistory } = await import('@/services/readingHistoryService');
      return await getQuranReadingHistory(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 10,
  });

  /**
   * Mutation untuk delete Quran reading history
   */
  const deleteQuranReadingHistory = useMutation({
    mutationFn: async (id: string) => {
      const { deleteQuranReadingHistory } = await import('@/services/readingHistoryService');
      return await deleteQuranReadingHistory(id, employeeId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quranReadingHistory', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    quranReadingHistory: query.data || [],
    isLoading: query.isLoading,

    deleteQuranReadingHistory: deleteQuranReadingHistory.mutate,
    isDeleting: deleteQuranReadingHistory.isPending,
  };
}

/**
 * Hook untuk mengambil todo list
 */
export function useTodoList(employeeId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['todos', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { getEmployeeTodos } = await import('@/services/todoService');
      return await getEmployeeTodos(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });

  /**
   * Mutation untuk update todo list
   */
  const updateTodoList = useMutation({
    mutationFn: async (todoList: any[]) => {
      if (!employeeId) throw new Error('Employee ID is required');

      const { bulkUpdateEmployeeTodos } = await import('@/services/todoService');
      return await bulkUpdateEmployeeTodos(employeeId, todoList);
    },
    onMutate: async (newTodoList) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos', employeeId] });

      const previousTodos = queryClient.getQueryData<any[]>(['todos', employeeId]);

      queryClient.setQueryData(['todos', employeeId], newTodoList);

      return { previousTodos };
    },
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos', employeeId], context.previousTodos);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', employeeId] });
    },
  });

  return {
    todos: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,

    updateTodoList: updateTodoList.mutate,
    updateTodoListAsync: updateTodoList.mutateAsync,
    isUpdating: updateTodoList.isPending,
  };
}
