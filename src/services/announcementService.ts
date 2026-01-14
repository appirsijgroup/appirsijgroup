import { supabase, toSnakeCase } from '@/lib/supabase';
import type { Announcement } from '@/types';

/**
 * Announcement Service
 * Handles all announcement-related database operations
 */

// Get all announcements
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};

// Get announcement by ID
export const getAnnouncementById = async (id: string): Promise<Announcement | null> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data as unknown as Announcement | null;
};

// Get global/alliansi announcements
export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('scope', 'alliansi')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};

// Get mentor announcements
export const getMentorAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('scope', 'mentor')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};

// Get announcements by author
export const getAnnouncementsByAuthor = async (authorId: string): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('author_id', authorId)
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};

// Create new announcement
export const createAnnouncement = async (
    announcement: Omit<Announcement, 'id' | 'timestamp'>
): Promise<Announcement> => {
    const timestamp = Date.now();
    console.log('Attempting to insert announcement:', { ...announcement, timestamp });

    // Convert camelCase to snake_case for database
    const announcementToInsert = toSnakeCase({
        ...announcement,
        timestamp
    });

    console.log('Sending to Supabase:', announcementToInsert);

    const { data, error, status } = await (supabase
        .from('announcements') as any)
        .insert([announcementToInsert]) // Use array format
        .select()
        .single();

    console.log('Insert response:', { data, error, status });

    if (error) {
        console.error('Error creating announcement:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: status
        });
        throw error;
    }

    if (!data) {
        console.error('No data returned from insert operation');
        throw new Error('Insert operation completed but no data returned - possible RLS violation');
    }

    console.log('Successfully created announcement in Supabase:', data);
    return data;
};

// Update announcement
export const updateAnnouncement = async (
    id: string,
    updates: Partial<Omit<Announcement, 'id' | 'timestamp' | 'author_id' | 'author_name'>>
): Promise<Announcement> => {
    const { data, error } = await (supabase
        .from('announcements') as any)
        .update(toSnakeCase(updates))
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete announcement
export const deleteAnnouncement = async (id: string): Promise<void> => {
    console.log('🗑️ Deleting announcement:', id);

    const { data, error, count, status, statusText } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .select();

    console.log('Delete response:', { data, error, count, status, statusText });

    if (error) {
        console.error('❌ Error deleting announcement:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: status,
            statusText: statusText
        });
        throw new Error(`Gagal menghapus pengumuman: ${error.message} (${error.code})`);
    }

    if (count === 0) {
        console.warn('⚠️ No announcement was deleted. ID may not exist or permission denied:', id);
        throw new Error('Pengumuman tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya');
    } else {
        console.log('✅ Successfully deleted announcement:', id, `Count: ${count}`);
    }
};

// Get recent announcements
export const getRecentAnnouncements = async (limit: number = 10): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};

// Get announcements after a certain timestamp (for polling)
export const getAnnouncementsAfter = async (timestamp: number): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .gt('timestamp', timestamp)
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data as unknown as Announcement[]) || [];
};
