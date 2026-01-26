import { supabase, toSnakeCase, toCamelCase } from '@/lib/supabase';
import { convertImageToWebP } from '@/utils/imageUtils';
import type { Announcement } from '@/types';
// Replace UUID with standard crypto.randomUUID()

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
    return toCamelCase(data) as Announcement[] || [];
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
    return toCamelCase(data) as Announcement | null;
};

// Get global/alliansi announcements
export const getGlobalAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('scope', 'alliansi')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    if (error) throw error;
    return toCamelCase(data) as Announcement[] || [];
};

// Get mentor announcements
export const getMentorAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('scope', 'mentor')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    if (error) throw error;
    return toCamelCase(data) as Announcement[] || [];
};

// Get announcements by author
export const getAnnouncementsByAuthor = async (authorId: string): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('author_id', authorId)
        .order('timestamp', { ascending: false });

    if (error) throw error;
    if (error) throw error;
    return toCamelCase(data) as Announcement[] || [];
};

// Create new announcement
export const createAnnouncement = async (
    announcement: Omit<Announcement, 'id' | 'timestamp'>
): Promise<Announcement> => {
    const timestamp = Date.now();
    const id = crypto.randomUUID();

    // Convert camelCase to snake_case for database
    const announcementToInsert = toSnakeCase({
        ...announcement,
        id,
        timestamp
    });


    const { data, error } = await (supabase
        .from('announcements') as any)
        .insert([announcementToInsert]) // Use array format
        .select()
        .single();


    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Insert operation completed but no data returned - possible RLS violation');
    }

    return toCamelCase(data) as Announcement;
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
    return toCamelCase(data) as Announcement;
};

// Delete announcement
export const deleteAnnouncement = async (id: string): Promise<void> => {

    const { data, error, count, status, statusText } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .select();


    if (error) {
        throw new Error(`Gagal menghapus pengumuman: ${error.message} (${error.code})`);
    }

    if (count === 0) {
        throw new Error('Pengumuman tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya');
    } else {
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
    return toCamelCase(data) as Announcement[] || [];
};

// Upload announcement image
export const uploadAnnouncementImage = async (file: File, announcementId: string): Promise<string> => {
    try {
        const webpFile = await convertImageToWebP(file);
        // Use fixed suffix to ensure overwrites/no duplicates for the same announcement
        const fileName = `${announcementId}-cover.webp`;
        const filePath = `${fileName}`;

        // Use API endpoint to bypass client-side RLS
        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('bucket', 'announcement');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload announcement image via API');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        throw error;
    }
};

// Upload announcement document (PDF only as per request, but can also technically take images)
export const uploadAnnouncementDocument = async (file: File, announcementId: string): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${announcementId}-doc.${fileExt}`;
        const filePath = `${fileName}`;

        // Use API endpoint to bypass client-side RLS
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'announcement');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload announcement document via API');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
    } catch (error) {
        throw error;
    }
};

// Get announcements after a certain timestamp (for polling)
export const getAnnouncementsAfter = async (timestamp: number): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .gt('timestamp', timestamp)
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return toCamelCase(data) as Announcement[] || [];
};
