'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Announcement } from '@/types';

/**
 * Hook untuk mengambil semua announcements
 */
export function useAnnouncements() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['announcements'],
    queryFn: async (): Promise<Announcement[]> => {
      const { getAnnouncements } = await import('@/services/announcementService');
      return await getAnnouncements();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - announcements lebih sering berubah
    gcTime: 1000 * 60 * 10,    // 10 minutes
  });

  /**
   * Mutation untuk create announcement
   */
  const createAnnouncement = useMutation({
    mutationFn: async (announcementData: Omit<Announcement, 'id'>) => {
      const { createAnnouncement: create } = await import('@/services/announcementService');
      return await create(announcementData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  /**
   * Mutation untuk delete announcement
   */
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { deleteAnnouncement: deleteAnn } = await import('@/services/announcementService');
      return await deleteAnn(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    createAnnouncement: createAnnouncement.mutate,
    deleteAnnouncement: deleteAnnouncement.mutate,

    isCreating: createAnnouncement.isPending,
    isDeleting: deleteAnnouncement.isPending,
  };
}

/**
 * Hook untuk mengambil user announcements (announcement untuk user tertentu)
 */
export function useUserAnnouncements(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['announcements', 'user', userId],
    queryFn: async (): Promise<Announcement[]> => {
      if (!userId) return [];

      const { getUserAnnouncements } = await import('@/services/announcementService');
      return await getUserAnnouncements(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    unreadCount: query.data?.filter(a => !a.isRead).length || 0,
  };
}
