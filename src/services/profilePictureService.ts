import { supabase, createSupabaseClientWithToken } from '@/lib/supabase';
import { convertImageToWebP } from '@/utils/imageUtils';

/**
 * Profile Picture Service
 * Handles user profile picture upload to Supabase Storage
 */

// Helper to get authenticated client
const getAuthenticatedClient = () => {
    if (typeof document === 'undefined') return supabase;

    // Try to find session cookie
    const cookies = document.cookie.split(';');
    let token = null;
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session') {
            token = decodeURIComponent(value);
            break;
        }
    }

    if (token) {
        return createSupabaseClientWithToken(token);
    }
    return supabase;
};

// Upload user profile picture to Supabase Storage
export const uploadProfilePicture = async (file: File, employeeId: string): Promise<string> => {
    try {
        // Convert to WebP for optimization
        const webpFile = await convertImageToWebP(file, 0.7); // Slightly lower quality for profile pics
        const fileName = `${employeeId}-profile.webp`;
        const filePath = `${employeeId}/${fileName}`;

        const client = getAuthenticatedClient();

        // Use 'profile-pictures' bucket
        const { data, error } = await client.storage
            .from('profile-pictures')
            .upload(filePath, webpFile, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            // If bucket doesn't exist, this might fail. We assume it's created.
            console.error('Error uploading profile picture:', error);
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = client.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (error) {
        console.error('Upload profile picture exception:', error);
        throw error;
    }
};

// Delete user profile picture from Supabase Storage
export const deleteProfilePicture = async (employeeId: string): Promise<void> => {
    try {
        const client = getAuthenticatedClient();

        // List all files in employee's folder
        const { data, error } = await client.storage
            .from('profile-pictures')
            .list(employeeId);

        if (error) {
            throw error;
        }

        // Delete all files
        if (data && data.length > 0) {
            for (const file of data) {
                const { error: deleteError } = await client.storage
                    .from('profile-pictures')
                    .remove([`${employeeId}/${file.name}`]);

                if (deleteError) {
                    throw deleteError;
                }
            }
        }

    } catch (error) {
        console.error('Delete profile picture error:', error);
        throw error;
    }
};
