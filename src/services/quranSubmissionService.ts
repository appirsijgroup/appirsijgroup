import { supabase } from '@/lib/supabase';

export interface QuranReadingSubmission {
  id?: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  submissionDate: string; // YYYY-MM-DD format
  createdAt?: string;
}

export interface QuranHistoryEntry {
  surahNumber: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  date: string; // YYYY-MM-DD format
  timestamp: string; // ISO timestamp
}

/**
 * Check if quran_reading_submissions table exists and is accessible
 */
async function checkTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quran_reading_submissions')
      .select('id')
      .limit(1)
      .maybeSingle();

    // If error is about relation not existing, table doesn't exist
    if (error && error.code === '42P01') {
      console.warn('⚠️ quran_reading_submissions table does not exist, using fallback');
      return false;
    }

    return !error;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

/**
 * Get all Quran reading submissions for a user
 */
export const getQuranSubmissions = async (userId: string): Promise<QuranReadingSubmission[]> => {
  try {
    const tableExists = await checkTableExists();

    if (!tableExists) {
      // Fallback: Get from employee's quran_reading_history
      const { data: employeeData } = await supabase
        .from('employees')
        .select('quran_reading_history')
        .eq('id', userId)
        .single();

      if (employeeData) {
        const history = (employeeData as any).quran_reading_history || [];
        return history.map((h: any) => ({
          id: `history-${Date.now()}-${Math.random()}`,
          userId: userId,
          surahNumber: h.surahNumber,
          surahName: h.surahName,
          startAyah: h.startAyah,
          endAyah: h.endAyah,
          submissionDate: h.date,
          createdAt: h.timestamp
        }));
      }
      return [];
    }

    const { data, error } = await supabase
      .from('quran_reading_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submission_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as any).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      surahNumber: item.surah_number,
      surahName: item.surah_name,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      submissionDate: item.submission_date,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error fetching Quran submissions:', error);
    return [];
  }
};

/**
 * Submit a Quran reading session
 * Tries quran_reading_submissions table first, falls back to quran_reading_history in employees
 */
export const submitQuranReading = async (
  userId: string,
  surahNumber: number,
  surahName: string,
  startAyah: number,
  endAyah: number,
  submissionDate: string
): Promise<QuranReadingSubmission | null> => {
  try {
    console.log("📖 Submitting Quran reading");

    const tableExists = await checkTableExists();

    if (tableExists) {
      // Try to use quran_reading_submissions table
      try {
        const { data, error } = await (supabase
          .from('quran_reading_submissions') as any)
          .insert({
            user_id: userId,
            surah_number: surahNumber,
            surah_name: surahName,
            start_ayah: startAyah,
            end_ayah: endAyah,
            submission_date: submissionDate
          })
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Quran reading submission successful (table):', data);

        // Also update history
        await updateQuranHistory(userId, {
          surahNumber,
          surahName,
          startAyah,
          endAyah,
          date: submissionDate,
          timestamp: new Date().toISOString()
        });

        return {
          id: data.id,
          userId: data.user_id,
          surahNumber: data.surah_number,
          surahName: data.surah_name,
          startAyah: data.start_ayah,
          endAyah: data.end_ayah,
          submissionDate: data.submission_date,
          createdAt: data.created_at
        };
      } catch (tableError) {
        console.error('❌ Error inserting to table, trying fallback:', tableError);
        // Fall through to fallback method
      }
    }

    // ============================================
    // FALLBACK: Use quran_reading_history in employees table
    // ============================================
    console.log('📖 Using fallback: quran_reading_history in employees table');

    await updateQuranHistory(userId, {
      surahNumber,
      surahName,
      startAyah,
      endAyah,
      date: submissionDate,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Quran reading saved to history (fallback)');

    // Return a mock submission object
    return {
      id: `history-${Date.now()}-${Math.random()}`,
      userId,
      surahNumber,
      surahName,
      startAyah,
      endAyah,
      submissionDate,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error submitting Quran reading:', error);
    throw error;
  }
};

/**
 * Update quran_reading_history in employees table
 * This is used internally by submitQuranReading
 */
async function updateQuranHistory(userId: string, newEntry: QuranHistoryEntry): Promise<void> {
  try {
    // Get current history
    const { data: employeeData } = await supabase
      .from('employees')
      .select('quran_reading_history')
      .eq('id', userId)
      .single();

    if (!employeeData) {
      throw new Error('Employee not found');
    }

    const currentHistory = (employeeData as any).quran_reading_history || [];

    // Check if this submission already exists in history
    const exists = currentHistory.some((h: any) =>
      h.surahNumber === newEntry.surahNumber &&
      h.startAyah === newEntry.startAyah &&
      h.endAyah === newEntry.endAyah &&
      h.date === newEntry.date
    );

    if (!exists) {
      const updatedHistory = [newEntry, ...currentHistory];

      await (supabase
        .from('employees') as any)
        .update({
          quran_reading_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      console.log('✅ Quran reading history updated');
    } else {
      console.log('ℹ️ Entry already exists in history, skipping');
    }
  } catch (error) {
    console.error('❌ Error updating quran_reading_history:', error);
    throw error;
  }
}

/**
 * Delete a Quran reading submission
 */
export const deleteQuranSubmission = async (submissionId: string, userId: string): Promise<boolean> => {
  try {
    const tableExists = await checkTableExists();

    if (tableExists) {
      const { error } = await supabase
        .from('quran_reading_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('user_id', userId);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting Quran submission:', error);
    return false;
  }
};

/**
 * Get Quran submissions for a specific date range
 */
export const getQuranSubmissionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<QuranReadingSubmission[]> => {
  try {
    const tableExists = await checkTableExists();

    if (tableExists) {
      const { data, error } = await supabase
        .from('quran_reading_submissions')
        .select('*')
        .eq('user_id', userId)
        .gte('submission_date', startDate)
        .lte('submission_date', endDate)
        .order('submission_date', { ascending: true });

      if (error) throw error;

      return (data as any).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        surahNumber: item.surah_number,
        surahName: item.surah_name,
        startAyah: item.start_ayah,
        endAyah: item.end_ayah,
        submissionDate: item.submission_date,
        createdAt: item.created_at
      }));
    }

    // Fallback to history
    const { data: employeeData } = await supabase
      .from('employees')
      .select('quran_reading_history')
      .eq('id', userId)
      .single();

    if (employeeData) {
      const history = (employeeData as any).quran_reading_history || [];
      return history
        .filter((h: any) => h.date >= startDate && h.date <= endDate)
        .map((h: any) => ({
          id: `history-${h.timestamp}`,
          userId,
          surahNumber: h.surahNumber,
          surahName: h.surahName,
          startAyah: h.startAyah,
          endAyah: h.endAyah,
          submissionDate: h.date,
          createdAt: h.timestamp
        }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching Quran submissions by date range:', error);
    return [];
  }
};

/**
 * Get total ayahs read in a specific period
 */
export const getTotalAyahsRead = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> => {
  try {
    const submissions = await getQuranSubmissionsByDateRange(userId, startDate, endDate);

    const totalAyahs = submissions.reduce((total, submission) => {
      return total + (submission.endAyah - submission.startAyah + 1);
    }, 0);

    return totalAyahs;
  } catch (error) {
    console.error('Error calculating total ayahs read:', error);
    return 0;
  }
};
