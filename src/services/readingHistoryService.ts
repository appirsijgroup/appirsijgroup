import { supabase } from '@/lib/supabase';

export interface ReadingHistoryEntry {
  id?: string;
  userId: string;
  bookTitle: string;
  pagesRead?: number;
  dateCompleted: string; // YYYY-MM-DD format
  notes?: string;
  createdAt?: string;
}

/**
 * Check if employee_reading_history table exists and is accessible
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employee_reading_history')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error && error.code === '42P01') {
      return false;
    }

    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * Get all reading history for a user
 */
export const getReadingHistory = async (userId: string): Promise<ReadingHistoryEntry[]> => {
  try {
    const tableExists = await checkTableExists();

    if (tableExists) {
      // Use new employee_reading_history table
      const { data, error } = await supabase
        .from('employee_reading_history')
        .select('*')
        .eq('employee_id', userId)
        .order('date_completed', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        userId: item.employee_id,
        bookTitle: item.book_title,
        pagesRead: item.pages_read,
        dateCompleted: item.date_completed,
        notes: item.notes,
        createdAt: item.created_at
      }));
    }

    // Fallback: Get from employee's reading_history JSON field
    const { data: employeeData } = await supabase
      .from('employees')
      .select('reading_history')
      .eq('id', userId)
      .single();

    if (employeeData) {
      const history = (employeeData as any).reading_history || [];
      return history.map((h: any) => ({
        id: `history-${h.id || Date.now()}-${Math.random()}`,
        userId: userId,
        bookTitle: h.bookTitle,
        pagesRead: h.pagesRead,
        dateCompleted: h.dateCompleted,
        notes: h.notes,
        createdAt: h.createdAt
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Get reading history for multiple employees (for supervisor/admin views)
 */
export const getReadingHistoryByEmployeeIds = async (employeeIds: string[]): Promise<ReadingHistoryEntry[]> => {
  if (!employeeIds || employeeIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('employee_reading_history')
      .select('*')
      .in('employee_id', employeeIds)
      .order('date_completed', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      userId: item.employee_id,
      bookTitle: item.book_title,
      pagesRead: item.pages_read,
      dateCompleted: item.date_completed,
      notes: item.notes,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error fetching bulk reading history:', error);
    return [];
  }
};

/**
 * Submit a book reading
 */
export const submitBookReading = async (
  userId: string,
  bookTitle: string,
  pagesRead: number,
  dateCompleted: string,
  notes?: string
): Promise<ReadingHistoryEntry | null> => {
  try {

    const tableExists = await checkTableExists();

    if (tableExists) {
      // Use employee_reading_history table
      const { data, error } = await (supabase
        .from('employee_reading_history') as any)
        .insert({
          employee_id: userId,
          book_title: bookTitle,
          pages_read: pagesRead,
          date_completed: dateCompleted,
          notes: notes || null
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.employee_id,
        bookTitle: data.book_title,
        pagesRead: data.pages_read,
        dateCompleted: data.date_completed,
        notes: data.notes,
        createdAt: data.created_at
      };
    }

    // Fallback: Update employee's reading_history JSON field

    const { data: employeeData } = await supabase
      .from('employees')
      .select('reading_history')
      .eq('id', userId)
      .single();

    if (employeeData) {
      const currentHistory = (employeeData as any).reading_history || [];

      const newEntry = {
        id: `book-${Date.now()}-${Math.random()}`,
        bookTitle,
        pagesRead,
        dateCompleted,
        notes: notes || null,
        createdAt: new Date().toISOString()
      };

      const updatedHistory = [newEntry, ...currentHistory];

      await (supabase
        .from('employees') as any)
        .update({
          reading_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        id: newEntry.id,
        userId,
        bookTitle,
        pagesRead,
        dateCompleted,
        notes,
        createdAt: newEntry.createdAt
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a reading history entry
 */
export const deleteReadingHistory = async (entryId: string, userId: string): Promise<boolean> => {
  try {
    const tableExists = await checkTableExists();

    if (tableExists) {
      const { error } = await supabase
        .from('employee_reading_history')
        .delete()
        .eq('id', entryId)
        .eq('employee_id', userId);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get Quran reading history for an employee
 */
export const getQuranReadingHistory = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('employee_quran_reading_history')
      .select('*')
      .eq('employee_id', userId)
      .order('date', { ascending: false });

    if (error) {
      // If table doesn't exist, try fallback
      if (error.code === '42P01') {
        // Fallback: Get from employee's quran_reading_history JSON field
        const { data: employeeData } = await supabase
          .from('employees')
          .select('quran_reading_history')
          .eq('id', userId)
          .single();

        if (employeeData) {
          const history = (employeeData as any).quran_reading_history || [];
          return history.map((h: any) => ({
            id: `quran-${h.id || Date.now()}-${Math.random()}`,
            date: h.date,
            surahName: h.surahName,
            surahNumber: h.surahNumber,
            startAyah: h.startAyah,
            endAyah: h.endAyah
          }));
        }
        return [];
      }
      throw error;
    }

    return data.map((item: any) => ({
      id: item.id,
      date: item.date,
      surahName: item.surah_name,
      surah_number: item.surah_number,
      surahNumber: item.surah_number,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      createdAt: item.created_at
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Get Quran reading history for multiple employees (for supervisor/admin views)
 */
export const getQuranReadingHistoryByEmployeeIds = async (employeeIds: string[]) => {
  if (!employeeIds || employeeIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('employee_quran_reading_history')
      .select('*')
      .in('employee_id', employeeIds)
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      date: item.date,
      surahName: item.surah_name,
      surahNumber: item.surah_number,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error fetching bulk quran reading history:', error);
    return [];
  }
};

/**
 * Add Quran reading history entry
 */
export const addQuranReadingHistory = async (
  userId: string,
  date: string,
  surahName: string,
  surahNumber: number,
  startAyah: number,
  endAyah: number
) => {
  try {
    const { data, error } = await (supabase
      .from('employee_quran_reading_history') as any)
      .insert({
        employee_id: userId,
        date: date,
        surah_name: surahName,
        surah_number: surahNumber,
        start_ayah: startAyah,
        end_ayah: endAyah
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, use fallback
      if (error.code === '42P01') {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('quran_reading_history')
          .eq('id', userId)
          .single();

        if (employeeData) {
          const currentHistory = (employeeData as any).quran_reading_history || [];
          const newEntry = {
            id: `quran-${Date.now()}-${Math.random()}`,
            date,
            surahName,
            surahNumber,
            startAyah,
            endAyah
          };
          const updatedHistory = [newEntry, ...currentHistory];

          await (supabase
            .from('employees') as any)
            .update({
              quran_reading_history: updatedHistory,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          return newEntry;
        }
        return null;
      }
      throw error;
    }

    return {
      id: data.id,
      date: data.date,
      surahName: data.surah_name,
      surahNumber: data.surah_number,
      startAyah: data.start_ayah,
      endAyah: data.end_ayah
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Quran reading history entry
 */
export const deleteQuranReadingHistory = async (entryId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('employee_quran_reading_history')
      .delete()
      .eq('id', entryId)
      .eq('employee_id', userId);

    if (error) {
      // If table doesn't exist, use fallback
      if (error.code === '42P01') {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('quran_reading_history')
          .eq('id', userId)
          .single();

        if (employeeData) {
          const currentHistory = (employeeData as any).quran_reading_history || [];
          const updatedHistory = currentHistory.filter((h: any) => h.id !== entryId);

          await (supabase
            .from('employees') as any)
            .update({
              quran_reading_history: updatedHistory,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          return true;
        }
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get reading history for a specific date range
 */
export const getReadingHistoryByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<ReadingHistoryEntry[]> => {
  try {
    const tableExists = await checkTableExists();

    if (tableExists) {
      const { data, error } = await supabase
        .from('employee_reading_history')
        .select('*')
        .eq('employee_id', userId)
        .gte('date_completed', startDate)
        .lte('date_completed', endDate)
        .order('date_completed', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        userId: item.employee_id,
        bookTitle: item.book_title,
        pagesRead: item.pages_read,
        dateCompleted: item.date_completed,
        notes: item.notes,
        createdAt: item.created_at
      }));
    }

    // Fallback to employee JSON field
    const { data: employeeData } = await supabase
      .from('employees')
      .select('reading_history')
      .eq('id', userId)
      .single();

    if (employeeData) {
      const history = (employeeData as any).reading_history || [];
      return history
        .filter((h: any) => {
          const date = new Date(h.dateCompleted + 'T12:00:00Z');
          const start = new Date(startDate + 'T12:00:00Z');
          const end = new Date(endDate + 'T12:00:00Z');
          return date >= start && date <= end;
        })
        .map((h: any) => ({
          id: h.id,
          userId,
          bookTitle: h.bookTitle,
          pagesRead: h.pagesRead,
          dateCompleted: h.dateCompleted,
          notes: h.notes,
          createdAt: h.createdAt
        }));
    }

    return [];
  } catch (error) {
    return [];
  }
};
