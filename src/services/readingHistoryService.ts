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
 * Check if reading_history table exists and is accessible
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reading_history')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error && error.code === '42P01') {
      console.warn('⚠️ reading_history table does not exist, using fallback');
      return false;
    }

    return !error;
  } catch (error) {
    console.error('Error checking table existence:', error);
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
      // Use new reading_history table
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('date_completed', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
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
    console.error('Error fetching reading history:', error);
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
      // Use reading_history table
      const { data, error } = await (supabase
        .from('reading_history') as any)
        .insert({
          user_id: userId,
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
        userId: data.user_id,
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
    console.error('❌ Error submitting book reading:', error);
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
        .from('reading_history')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting reading history:', error);
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
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .gte('date_completed', startDate)
        .lte('date_completed', endDate)
        .order('date_completed', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
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
    console.error('Error fetching reading history by date range:', error);
    return [];
  }
};
