import { supabase } from '@/lib/supabase';
import type { Database } from '@/services/database.types';

export interface Bookmark {
  id?: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: number;
  ayahText?: string;
}

/**
 * Get all bookmarks for a user
 */
export const getUserBookmarks = async (userId: string): Promise<Bookmark[]> => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as Database['public']['Tables']['bookmarks']['Row'][]).map(item => ({
      id: item.id,
      userId: item.user_id,
      surahNumber: item.surah_number,
      surahName: item.surah_name,
      ayahNumber: item.ayah_number,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
      ayahText: item.ayah_text || ''
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Check if a specific ayah is bookmarked
 */
export const isAyahBookmarked = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('surah_number', surahNumber)
      .eq('ayah_number', ayahNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok
    }

    return !!data;
  } catch (error) {
    return false;
  }
};

/**
 * Add a new bookmark
 */
export const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'timestamp'>): Promise<Bookmark | null> => {
  try {
    const { data, error } = await (supabase
      .from('bookmarks') as any)
      .insert({
        user_id: bookmark.userId,
        surah_number: bookmark.surahNumber,
        surah_name: bookmark.surahName,
        ayah_number: bookmark.ayahNumber,
        notes: bookmark.notes,
        ayah_text: bookmark.ayahText
      })
      .select()
      .single();

    if (error) throw error;

    const typedData = data as Database['public']['Tables']['bookmarks']['Row'];

    return {
      id: typedData.id,
      userId: typedData.user_id,
      surahNumber: typedData.surah_number,
      surahName: typedData.surah_name,
      ayahNumber: typedData.ayah_number,
      notes: typedData.notes,
      createdAt: typedData.created_at,
      updatedAt: typedData.updated_at,
      timestamp: typedData.created_at ? new Date(typedData.created_at).getTime() : Date.now(),
      ayahText: typedData.ayah_text || ''
    };
  } catch (error) {
    return null;
  }
};

/**
 * Remove a bookmark
 */
export const removeBookmark = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('surah_number', surahNumber)
      .eq('ayah_number', ayahNumber);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Toggle bookmark (add if not exists, remove if exists)
 */
export const toggleBookmark = async (
  userId: string,
  surahNumber: number,
  surahName: string,
  ayahNumber: number,
  ayahText?: string,
  notes?: string | null
): Promise<{ action: 'added' | 'removed'; bookmark?: Bookmark }> => {
  const isBookmarked = await isAyahBookmarked(userId, surahNumber, ayahNumber);

  if (isBookmarked) {
    await removeBookmark(userId, surahNumber, ayahNumber);
    return { action: 'removed' };
  } else {
    const bookmark = await addBookmark({
      userId,
      surahNumber,
      surahName,
      ayahNumber,
      ayahText,
      notes
    });
    return { action: 'added', bookmark: bookmark || undefined };
  }
};

/**
 * Update bookmark notes
 */
export const updateBookmarkNotes = async (
  userId: string,
  surahNumber: number,
  ayahNumber: number,
  notes: string
): Promise<boolean> => {
  try {
    const { error } = await (supabase
      .from('bookmarks') as any)
      .update({ notes })
      .eq('user_id', userId)
      .eq('surah_number', surahNumber)
      .eq('ayah_number', ayahNumber);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Delete a bookmark by ID
 */
export const deleteBookmark = async (bookmarkId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
};
