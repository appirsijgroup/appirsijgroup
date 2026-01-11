import { supabase } from '@/lib/supabase';

/**
 * Signature Service
 * Handles user signature (TTD) upload to Supabase Storage
 */

// Upload user signature to Supabase Storage
export const uploadSignature = async (file: File, employeeId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}-signature.${fileExt}`;
    const filePath = `${employeeId}/${fileName}`;

    console.log('📤 Uploading signature:', { fileName, filePath, fileSize: file.size });

    const { data, error } = await supabase.storage
      .from('TTD')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('TTD')
      .getPublicUrl(filePath);

    console.log('✅ Signature uploaded:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Failed to upload signature:', error);
    throw error;
  }
};

// Delete user signature from Supabase Storage
export const deleteSignature = async (employeeId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting signature for employee:', employeeId);

    // List all files in employee's folder
    const { data, error } = await supabase.storage
      .from('TTD')
      .list(employeeId);

    if (error) {
      console.error('❌ Error listing files:', error);
      throw error;
    }

    // Delete all files (usually just one signature)
    if (data && data.length > 0) {
      for (const file of data) {
        const { error: deleteError } = await supabase.storage
          .from('TTD')
          .remove([`${employeeId}/${file.name}`]);

        if (deleteError) {
          console.error('❌ Error deleting file:', deleteError);
          throw deleteError;
        }
      }
    }

    console.log('✅ Signature deleted successfully');
  } catch (error) {
    console.error('❌ Failed to delete signature:', error);
    throw error;
  }
};

// Get signature URL for employee (if exists)
export const getSignatureUrl = async (employeeId: string): Promise<string | null> => {
  try {
    // List files in employee's folder
    const { data, error } = await supabase.storage
      .from('TTD')
      .list(employeeId);

    if (error) {
      // If folder doesn't exist or no files, return null
      if (error.message.includes('The resource was not found')) {
        return null;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get the first file (should be the signature)
    const filePath = `${employeeId}/${data[0].name}`;
    const { data: publicUrlData } = supabase.storage
      .from('TTD')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error getting signature URL:', error);
    return null;
  }
};
