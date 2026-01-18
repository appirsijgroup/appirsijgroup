import { supabase } from '@/lib/supabase';
import type { WeeklyReportSubmission } from '@/types';

// Re-export the type from types.ts to maintain compatibility
export type { WeeklyReportSubmission };

// Internal database schema (not exported)
interface WeeklyReportSubmissionDB {
  id?: string;
  mentee_id: string; // Database column name
  month_key: string; // Format: YYYY-MM
  week_index: number; // 1-4
  report_data: any; // JSONB - flexible structure for report content
  submitted_at?: string;
  updated_at?: string;
}

// Mapping function from DB to App type
function mapDbToApp(dbItem: WeeklyReportSubmissionDB): WeeklyReportSubmission {
  // This is a simplified mapping - you may need to adjust based on actual requirements
  // For now, we'll use type assertion to handle the mismatch
  return {
    id: dbItem.id || '',
    menteeId: dbItem.mentee_id,
    menteeName: '', // This should come from employee data
    monthKey: dbItem.month_key,
    weekIndex: dbItem.week_index,
    submittedAt: dbItem.submitted_at ? new Date(dbItem.submitted_at).getTime() : Date.now(),
    status: 'pending_mentor', // Default status
    mentorId: '', // This should come from context
  } as WeeklyReportSubmission;
}

/**
 * Get all weekly report submissions for a user
 */
export const getUserWeeklyReports = async (userId: string): Promise<WeeklyReportSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('mentee_id', userId)
      .order('month_key', { ascending: false })
      .order('week_index', { ascending: true });

    if (error) throw error;

    return (data as unknown as WeeklyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    return [];
  }
};

/**
 * Get weekly report for a specific month and week
 */
export const getWeeklyReport = async (
  userId: string,
  monthKey: string,
  weekIndex: number
): Promise<WeeklyReportSubmission | null> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('mentee_id', userId)
      .eq('month_key', monthKey)
      .eq('week_index', weekIndex)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return mapDbToApp(data as unknown as WeeklyReportSubmissionDB);
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return null;
  }
};

/**
 * Submit a weekly report
 */
export const submitWeeklyReport = async (
  userId: string,
  monthKey: string,
  weekIndex: number,
  reportData: any
): Promise<WeeklyReportSubmission | null> => {
  try {
    const { data, error } = await (supabase
      .from('weekly_report_submissions') as any)
      .insert({
        mentee_id: userId,
        month_key: monthKey,
        week_index: weekIndex,
        report_data: reportData,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        console.error('Weekly report already submitted for this period');
        return null;
      }
      throw error;
    }

    return mapDbToApp(data as unknown as WeeklyReportSubmissionDB);
  } catch (error) {
    console.error('Error submitting weekly report:', error);
    return null;
  }
};

/**
 * Update an existing weekly report
 */
export const updateWeeklyReport = async (
  reportId: string,
  userId: string,
  reportData: any
): Promise<boolean> => {
  try {
    const { error } = await (supabase
      .from('weekly_report_submissions') as any)
      .update({
        report_data: reportData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .eq('mentee_id', userId);  // Changed from user_id to mentee_id

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating weekly report:', error);
    return false;
  }
};

/**
 * Delete a weekly report
 */
export const deleteWeeklyReport = async (reportId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('weekly_report_submissions')
      .delete()
      .eq('id', reportId)
      .eq('mentee_id', userId);  // Changed from user_id to mentee_id

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting weekly report:', error);
    return false;
  }
};

/**
 * Check if a report has been submitted for a specific period
 */
export const hasSubmittedReport = async (
  userId: string,
  monthKey: string,
  weekIndex: number
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('id')
      .eq('mentee_id', userId)  // Changed from user_id to mentee_id
      .eq('month_key', monthKey)
      .eq('week_index', weekIndex)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking report submission:', error);
    }

    return !!data;
  } catch (error) {
    console.error('Error checking report submission:', error);
    return false;
  }
};

/**
 * Get all submissions for a specific month
 */
export const getMonthlySubmissions = async (
  userId: string,
  monthKey: string
): Promise<WeeklyReportSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('mentee_id', userId)
      .eq('month_key', monthKey)
      .order('week_index', { ascending: true });

    if (error) throw error;

    return (data as unknown as WeeklyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error('Error fetching monthly submissions:', error);
    return [];
  }
};
