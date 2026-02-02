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

        // Use API endpoint to bypass client-side RLS
        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('bucket', 'Avatars');
        formData.append('filePath', filePath);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload profile picture via API');
        }

        const { publicUrl } = await response.json();
        return publicUrl;
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
            .from('Avatars')
            .list(employeeId);

        if (error) {
            throw error;
        }

        // Delete all files
        if (data && data.length > 0) {
            for (const file of data) {
                const { error: deleteError } = await client.storage
                    .from('Avatars')
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
