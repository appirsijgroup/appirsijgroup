// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * Submit a Quran reading session
 * Writes directly to the official employee_quran_reading_history table
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

    const { data, error } = await supabase
      .from('employee_quran_reading_history')
      .insert({
        employee_id: userId,
        surah_number: surahNumber,
        surah_name: surahName,
        start_ayah: startAyah,
        end_ayah: endAyah,
        date: submissionDate
      })
      .select()
      .single();

    if (error) {
      throw error;
    }


    return {
      id: data.id,
      userId: data.employee_id,
      surahNumber: data.surah_number,
      surahName: data.surah_name,
      startAyah: data.start_ayah,
      endAyah: data.end_ayah,
      submissionDate: data.date,
      createdAt: data.created_at
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Get all Quran reading submissions for a user
 * Reads from employee_quran_reading_history (Consistent with /api/auth/me)
 */
export const getQuranSubmissions = async (userId: string): Promise<QuranReadingSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('employee_quran_reading_history')
      .select('*')
      .eq('employee_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as any[]).map((item) => ({
      id: item.id,
      userId: item.employee_id,
      surahNumber: item.surah_number,
      surahName: item.surah_name,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      submissionDate: item.date,
      createdAt: item.created_at
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Delete a Quran reading submission
 */
export const deleteQuranSubmission = async (submissionId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('employee_quran_reading_history')
      .delete()
      .eq('id', submissionId)
      .eq('employee_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
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
      .from('employee_quran_reading_history')
      .select('*')
      .eq('employee_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data as any[]).map((item) => ({
      id: item.id,
      userId: item.employee_id,
      surahNumber: item.surah_number,
      surahName: item.surah_name,
      startAyah: item.start_ayah,
      endAyah: item.end_ayah,
      submissionDate: item.date,
      createdAt: item.created_at
    }));
  } catch (error) {
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
    return 0;
  }
};
