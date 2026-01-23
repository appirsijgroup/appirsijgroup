import { supabase, createSupabaseClientWithToken } from '@/lib/supabase';

/**
 * Signature Service
 * Handles user signature (TTD) upload to Supabase Storage
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

import { convertImageToWebP } from '@/utils/imageUtils';

// Upload user signature to Supabase Storage
export const uploadSignature = async (file: File, employeeId: string): Promise<string> => {
  try {
    // Convert to WebP
    const webpFile = await convertImageToWebP(file);
    const fileName = `${employeeId}-signature.webp`;
    const filePath = `${employeeId}/${fileName}`;

    const client = getAuthenticatedClient();

    const { data, error } = await client.storage
      .from('TTD')
      .upload(filePath, webpFile, {
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading signature:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = client.storage
      .from('TTD')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Upload signature exception:', error);
    throw error;
  }
};

// Delete user signature from Supabase Storage
export const deleteSignature = async (employeeId: string): Promise<void> => {
  try {
    const client = getAuthenticatedClient();

    // List all files in employee's folder
    const { data, error } = await client.storage
      .from('TTD')
      .list(employeeId);

    if (error) {
      throw error;
    }

    // Delete all files (usually just one signature)
    if (data && data.length > 0) {
      for (const file of data) {
        const { error: deleteError } = await client.storage
          .from('TTD')
          .remove([`${employeeId}/${file.name}`]);

        if (deleteError) {
          throw deleteError;
        }
      }
    }

  } catch (error) {
    console.error('Delete signature error:', error);
    throw error;
  }
};

// Get signature URL for employee (if exists)
export const getSignatureUrl = async (employeeId: string): Promise<string | null> => {
  try {
    const client = getAuthenticatedClient();

    // List files in employee's folder
    const { data, error } = await client.storage
      .from('TTD')
      .list(employeeId);

    if (error) {
      // If folder doesn't exist or no files, return null
      if (error.message && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get the first file (should be the signature)
    const filePath = `${employeeId}/${data[0].name}`;
    const { data: publicUrlData } = client.storage
      .from('TTD')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    return null;
  }
};
