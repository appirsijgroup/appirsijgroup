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

/**
 * Get all Quran reading submissions for a user
 */
export const getQuranSubmissions = async (userId: string): Promise<QuranReadingSubmission[]> => {
  try {
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
    console.log('📖 Submitting Quran reading:', { userId, surahNumber, surahName, startAyah, endAyah, submissionDate });

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

    if (error) {
      console.error('❌ Supabase error submitting Quran reading:', error);
      throw error;
    }

    console.log('✅ Quran reading submission successful:', data);

    // Also update quranReadingHistory in employee record
    try {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('quran_reading_history')
        .eq('id', userId)
        .single();

      if (employeeData) {
        const currentHistory = (employeeData as any).quran_reading_history || [];

        // Check if this submission already exists in history
        const exists = currentHistory.some((h: any) =>
          h.surahNumber === surahNumber &&
          h.startAyah === startAyah &&
          h.endAyah === endAyah &&
          h.date === submissionDate
        );

        if (!exists) {
          const newEntry = {
            surahNumber,
            surahName,
            startAyah,
            endAyah,
            date: submissionDate,
            timestamp: new Date().toISOString()
          };

          const updatedHistory = [newEntry, ...currentHistory];

          await (supabase
            .from('employees') as any)
            .update({
              quran_reading_history: updatedHistory,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          console.log('✅ Quran reading history updated');
        }
      }
    } catch (historyError) {
      console.error('⚠️ Error updating quran_reading_history (submission still saved):', historyError);
      // Don't throw - the main submission was successful
    }

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
  } catch (error) {
    console.error('❌ Error submitting Quran reading:', error);
    throw error; // Re-throw to let caller handle the error
  }
};

/**
 * Delete a Quran reading submission
 */
export const deleteQuranSubmission = async (submissionId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('quran_reading_submissions')
      .delete()
      .eq('id', submissionId)
      .eq('user_id', userId);

    if (error) throw error;

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
