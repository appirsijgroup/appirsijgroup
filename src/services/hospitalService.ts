import { supabase } from '@/lib/supabase';
import type { Hospital } from '@/types';

/**
 * Hospital Service
 * Handles all hospital-related database operations
 */

// Upload hospital logo to Supabase Storage
export const uploadHospitalLogo = async (file: File, hospitalId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${hospitalId}-${Date.now()}.${fileExt}`;
    const filePath = `${hospitalId}/${fileName}`;

    console.log('📤 Uploading logo:', { fileName, filePath, fileSize: file.size });

    const { data, error } = await supabase.storage
      .from('Logo')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('Logo')
      .getPublicUrl(filePath);

    console.log('✅ Logo uploaded:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Failed to upload logo:', error);
    throw error;
  }
};

// Get all hospitals
export const getAllHospitals = async (): Promise<Hospital[]> => {
    const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('brand');

    if (error) throw error;

    // Convert snake_case to camelCase
    return (data || []).map((item: any) => ({
        id: item.id,
        brand: item.brand,
        name: item.name,
        address: item.address,
        logo: item.logo,
        isActive: item.is_active
    }));
};

// Get hospital by ID
export const getHospitalById = async (id: string): Promise<Hospital | null> => {
    const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    // Convert snake_case to camelCase
    return {
        id: (data as any).id,
        brand: (data as any).brand,
        name: (data as any).name,
        address: (data as any).address,
        logo: (data as any).logo,
        isActive: (data as any).is_active
    };
};

// Create new hospital
export const createHospital = async (hospital: Omit<Hospital, 'id'>): Promise<Hospital> => {
    // Generate ID from brand if not provided
    const id = hospital.brand.toLowerCase().replace(/\s+/g, '-') || `HOSP${Date.now()}`;

    const { data, error } = await (supabase
        .from('hospitals') as any)
        .insert({
            id,
            brand: hospital.brand,
            name: hospital.name,
            address: hospital.address,
            logo: hospital.logo,
            is_active: hospital.isActive ?? true
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update hospital
export const updateHospital = async (
    id: string,
    updates: Partial<Omit<Hospital, 'id'>>
): Promise<Hospital> => {
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await (supabase
        .from('hospitals') as any)
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Delete hospital
export const deleteHospital = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Toggle hospital active status
export const toggleHospitalStatus = async (id: string): Promise<Hospital> => {
    // First get current status
    const hospital = await getHospitalById(id);
    if (!hospital) throw new Error('Hospital not found');

    const newStatus = !hospital.isActive;

    const { data, error } = await (supabase
        .from('hospitals') as any)
        .update({ is_active: newStatus })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};
