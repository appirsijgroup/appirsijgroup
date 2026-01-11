import { supabase } from '@/lib/supabase';
import type { SunnahIbadah } from '@/types';

// Table name for storing sunnah ibadah
const SUNNAH_IBADAH_TABLE = 'sunnah_ibadah_config';

// Get all sunnah ibadah from Supabase
export const getAllSunnahIbadah = async (): Promise<SunnahIbadah[]> => {
  try {
    const { data, error } = await supabase
      .from(SUNNAH_IBADAH_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01') {
        console.log('ℹ️ Table sunnah_ibadah_config does not exist yet. Using local defaults only.');
        return [];
      }
      // If permission denied or other RLS error, log and return empty
      if (error.code === '42501') {
        console.warn('⚠️ Permission denied accessing sunnah_ibadah_config. Using local defaults only.');
        return [];
      }
      console.error('❌ Supabase error loading sunnah ibadah:', error);
      return [];
    }

    // Convert snake_case to camelCase
    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      icon: item.icon,
      scheduleType: item.schedule_type,
      daysOfWeek: item.days_of_week,
      date: item.date,
      createdBy: item.created_by,
      createdByName: item.created_by_name,
    }));
  } catch (error: any) {
    console.error('❌ Unexpected error loading sunnah ibadah:', error?.message || error);
    // Return empty array instead of throwing, so app doesn't crash
    return [];
  }
};

// Create new sunnah ibadah
export const createSunnahIbadah = async (
  ibadah: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>,
  creator: { id: string; name: string }
): Promise<SunnahIbadah> => {
  try {
    // 🔥 CRITICAL: Generate unique ID
    const newId = `${ibadah.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const { data, error } = await supabase
      .from(SUNNAH_IBADAH_TABLE)
      .insert({
        id: newId, // ✅ Include generated ID
        name: ibadah.name,
        type: ibadah.type,
        icon: ibadah.icon,
        schedule_type: ibadah.scheduleType,
        days_of_week: ibadah.daysOfWeek,
        date: ibadah.date,
        created_by: creator.id,
        created_by_name: creator.name,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      icon: data.icon,
      scheduleType: data.schedule_type,
      daysOfWeek: data.days_of_week,
      date: data.date,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
    };
  } catch (error) {
    console.error('Error creating sunnah ibadah:', error);
    throw error;
  }
};

// Update sunnah ibadah
export const updateSunnahIbadahInDb = async (
  id: string,
  updates: Partial<SunnahIbadah>
): Promise<void> => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.scheduleType !== undefined) updateData.schedule_type = updates.scheduleType;
    if (updates.daysOfWeek !== undefined) updateData.days_of_week = updates.daysOfWeek;
    if (updates.date !== undefined) updateData.date = updates.date;

    const { error } = await supabase
      .from(SUNNAH_IBADAH_TABLE)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating sunnah ibadah:', error);
    throw error;
  }
};

// Delete sunnah ibadah
export const deleteSunnahIbadahFromDb = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(SUNNAH_IBADAH_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting sunnah ibadah:', error);
    throw error;
  }
};
