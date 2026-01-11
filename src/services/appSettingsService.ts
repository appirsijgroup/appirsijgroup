import { supabase } from '@/lib/supabase';

export type AppSettingsKey = 'mutabaah_locking_mode';

export interface AppSetting {
    key: string;
    value: string;
    description?: string;
    updated_at: string;
    updated_by?: string;
}

/**
 * Get a setting value by key
 */
export const getAppSetting = async (key: AppSettingsKey): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            console.error('❌ Error fetching app setting:', error);
            return null;
        }

        return (data as any)?.value || null;
    } catch (error) {
        console.error('❌ Error fetching app setting:', error);
        return null;
    }
};

/**
 * Get all settings
 */
export const getAllSettings = async (): Promise<Record<string, string>> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value');

        if (error) {
            console.error('❌ Error fetching app settings:', error);
            return {};
        }

        const settings: Record<string, string> = {};
        (data as any)?.forEach((setting: any) => {
            settings[setting.key] = setting.value;
        });

        return settings;
    } catch (error) {
        console.error('❌ Error fetching app settings:', error);
        return {};
    }
};

/**
 * Update a setting value (only for super-admin)
 */
export const updateAppSetting = async (
    key: AppSettingsKey,
    value: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        const { error } = await (supabase
            .from('app_settings') as any)
            .update({ value, updated_at: new Date().toISOString(), updated_by: user.id })
            .eq('key', key);

        if (error) {
            console.error('❌ Error updating app setting:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ App setting updated:', key, '=', value);
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error updating app setting:', error);
        return { success: false, error: error?.message || 'Unknown error' };
    }
};
