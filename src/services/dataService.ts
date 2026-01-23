import { supabase } from '@/lib/supabase';
import type { Database } from '@/services/database.types';
import * as monthlyActivityService from '@/services/monthlyActivityService';

// Use centralized Supabase client to avoid multiple instances
export { supabase };

// Authentication service
export const authService = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, userData: { name: string; gender?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          gender: userData.gender
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getCurrentSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Update user profile
  updateUserProfile: async (updates: Partial<Database['public']['Tables']['employees']['Insert']>) => {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await (supabase
      .from('employees') as any)
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Employee service
export const employeeService = {
  // Get employee by ID
  getEmployee: async (id: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all employees (for admin/mentor use)
  getAllEmployees: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data;
  }
};

// Attendance service
export const attendanceService = {
  // Get attendance records for an employee
  getEmployeeAttendance: async (employeeId: string) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId);

    if (error) throw error;
    
    // Convert to a map with entity_id as key
    const attendanceMap: Record<string, any> = {};
    (data as Database['public']['Tables']['attendance_records']['Row'][]).forEach(record => {
      attendanceMap[record.entity_id] = {
        status: record.status,
        reason: record.reason,
        timestamp: new Date(record.timestamp).getTime(),
        submitted: true,
        isLateEntry: record.is_late_entry,
        location: record.location ? JSON.parse(record.location as string) : undefined
      };
    });

    return attendanceMap;
  },

  // Submit attendance record
  submitAttendance: async (
    employeeId: string,
    entityId: string,
    status: 'hadir' | 'tidak-hadir',
    reason: string | null = null,
    isLateEntry: boolean = false,
    location?: { latitude: number; longitude: number }
  ) => {
    const timestamp = new Date().toISOString();
    
    const { data, error } = await (supabase
      .from('attendance_records') as any)
      .upsert({
        employee_id: employeeId,
        entity_id: entityId,
        status,
        reason,
        timestamp,
        is_late_entry: isLateEntry,
        location: location ? JSON.stringify(location) : null
      }, { onConflict: ['employee_id', 'entity_id'] })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete attendance record
  deleteAttendance: async (employeeId: string, entityId: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('employee_id', employeeId)
      .eq('entity_id', entityId);

    if (error) throw error;
  }
};

// Monthly activities service
export const monthlyActivitiesService = {
  // Get monthly activities for an employee
  getMonthlyActivities: async (employeeId: string) => {
    // 🔥 FIX: NO CACHE - Data is now merged from multiple tables via /api/monthly-activities
    return await monthlyActivityService.getMonthlyActivities(employeeId);
  },

  // Update monthly activities for an employee
  updateMonthlyActivities: async (
    employeeId: string,
    monthlyActivities: Record<string, any>
  ) => {
    // 🔥 FIX: BERSIHKAN data sebelum disimpan!
    // Filter out any foreign fields from all months
    const cleanedActivities: Record<string, any> = {};
    Object.keys(monthlyActivities).forEach(monthKey => {
      // Hanya proses jika format YYYY-MM
      if (monthKey.match(/^\d{4}-\d{2}$/)) {
        const cleanedMonthData: any = {};
        if (monthlyActivities[monthKey]) {
          Object.keys(monthlyActivities[monthKey]).forEach(key => {
            // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
            if (key.match(/^\d{2}$/)) {
              cleanedMonthData[key] = monthlyActivities[monthKey][key];
            }
            // Field asing (kie, doaBersama, dll) akan DIHAPUS!
          });
        }
        cleanedActivities[monthKey] = cleanedMonthData;
      }
    });

    // 🔥 FIX: NO CACHE - updateMonthlyActivities is now a no-op for backward compatibility
    await monthlyActivitiesService.updateMonthlyActivities(employeeId, cleanedActivities);

    // Return employee data (optional, untuk consistency)
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    return data;
  },

  // Update specific day's activities
  updateDayActivities: async (
    employeeId: string,
    monthKey: string, // YYYY-MM
    dayKey: string, // DD
    dayActivities: Record<string, boolean>
  ) => {
    const currentData = await monthlyActivitiesService.getMonthlyActivities(employeeId);

    // 🔥 FIX: BERSIHKAN data sebelum disimpan!
    // Filter out any foreign fields from current month data
    const cleanedMonthData: any = {};
    if (currentData[monthKey]) {
      Object.keys(currentData[monthKey]).forEach(key => {
        // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
        if (key.match(/^\d{2}$/)) {
          cleanedMonthData[key] = currentData[monthKey][key];
        }
        // Field asing (kie, doaBersama, dll) akan DIHAPUS!
      });
    }

    const updatedMonth = {
      ...cleanedMonthData,
      [dayKey]: {
        ...cleanedMonthData[dayKey],
        ...dayActivities
      }
    };

    const updatedActivities = {
      ...currentData,
      [monthKey]: updatedMonth
    };

    return await monthlyActivitiesService.updateMonthlyActivities(employeeId, updatedActivities);
  }
};

// Bookmarks service
export const bookmarkService = {
  // Get bookmarks for an employee
  getBookmarks: async (userId: string) => {
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
  },

  // Add a bookmark
  addBookmark: async (bookmark: Omit<Database['public']['Tables']['bookmarks']['Insert'], 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await (supabase
      .from('bookmarks') as any)
      .insert({
        user_id: user.id,
        surah_number: bookmark.surah_number,
        surah_name: bookmark.surah_name,
        ayah_number: bookmark.ayah_number,
        notes: bookmark.notes,
        ayah_text: bookmark.ayah_text
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
  },

  // Remove a bookmark
  removeBookmark: async (bookmarkId: string) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (error) throw error;
  }
};

// Quran reading service
export const quranReadingService = {
  // Submit quran reading
  submitReading: async (userId: string, details: { 
    surahName: string; 
    surahNumber: number; 
    startAyah: number; 
    endAyah: number; 
    date: string; 
  }) => {
    const { data, error } = await (supabase
      .from('quran_readings') as any)
      .insert({
        user_id: userId,
        surah_name: details.surahName,
        surah_number: details.surahNumber,
        start_ayah: details.startAyah,
        end_ayah: details.endAyah,
        date: details.date
      })
      .select()
      .single();

    if (error) throw error;
    return data as Database['public']['Tables']['quran_readings']['Row'];
  }
};

// Reading history service
export const readingHistoryService = {
  // Get reading history for an employee
  getReadingHistory: async (userId: string) => {
    const { data, error } = await supabase
      .from('reading_histories')
      .select('*')
      .eq('user_id', userId)
      .order('date_completed', { ascending: false });

    if (error) throw error;
    return data as Database['public']['Tables']['reading_histories']['Row'][];
  },

  // Add reading history
  addReadingHistory: async (userId: string, history: { 
    book_title: string; 
    pages_read: string; 
    date_completed: string 
  }) => {
    const { data, error } = await (supabase
      .from('reading_histories') as any)
      .insert({
        user_id: userId,
        book_title: history.book_title,
        pages_read: history.pages_read,
        date_completed: history.date_completed
      })
      .select()
      .single();

    if (error) throw error;
    return data as Database['public']['Tables']['reading_histories']['Row'];
  },

  // Delete reading history
  deleteReadingHistory: async (historyId: string) => {
    const { error } = await supabase
      .from('reading_histories')
      .delete()
      .eq('id', historyId);

    if (error) throw error;
  }
};