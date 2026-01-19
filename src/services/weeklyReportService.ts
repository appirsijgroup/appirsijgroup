import { supabase } from '@/lib/supabase';
import type { WeeklyReportSubmission } from '@/types';
import { timeValidationService } from './timeValidationService';

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
    // Validate time before submitting report
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Report submission denied.');
    }

    // Check if the month is in the future compared to validated time
    const [year, month] = monthKey.split('-').map(Number);
    const reportDate = new Date(year, month - 1, 1); // First day of the month
    const correctedTime = timeValidation.correctedTime;

    // If report date is in the future compared to corrected server time, reject
    if (reportDate > correctedTime) {
      throw new Error('Cannot submit report for future months.');
    }

    const { data, error } = await (supabase
      .from('weekly_report_submissions') as any)
      .insert({
        mentee_id: userId,
        month_key: monthKey,
        week_index: weekIndex,
        report_data: reportData,
        submitted_at: timeValidation.correctedTime.toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }

    return mapDbToApp(data as unknown as WeeklyReportSubmissionDB);
  } catch (error) {
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
    // Validate time before updating report
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Report update denied.');
    }

    const { error } = await (supabase
      .from('weekly_report_submissions') as any)
      .update({
        report_data: reportData,
        updated_at: timeValidation.correctedTime.toISOString()
      })
      .eq('id', reportId)
      .eq('mentee_id', userId);  // Changed from user_id to mentee_id

    if (error) throw error;

    return true;
  } catch (error) {
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
    // Validate time before checking report status
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Report status check denied.');
    }

    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('id')
      .eq('mentee_id', userId)  // Changed from user_id to mentee_id
      .eq('month_key', monthKey)
      .eq('week_index', weekIndex)
      .single();

    if (error && error.code !== 'PGRST116') {
    }

    return !!data;
  } catch (error) {
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
    // Validate time before getting submissions
    const timeValidation = timeValidationService.validateTime();

    if (!timeValidation.isValid) {
      throw new Error('System time appears to be manipulated. Report retrieval denied.');
    }

    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('mentee_id', userId)
      .eq('month_key', monthKey)
      .order('week_index', { ascending: true });

    if (error) throw error;

    return (data as unknown as WeeklyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    return [];
  }
};
