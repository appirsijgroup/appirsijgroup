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
  const reportData = dbItem.report_data || {};

  return {
    ...reportData, // Spread report data first (contains content, status, notes, etc.)
    id: dbItem.id || '',
    menteeId: dbItem.mentee_id,
    menteeName: reportData.menteeName || '',
    monthKey: dbItem.month_key,
    weekIndex: dbItem.week_index,
    submittedAt: dbItem.submitted_at ? new Date(dbItem.submitted_at).getTime() : Date.now(),
    // Ensure status exists, default to pending_mentor if not in report_data
    status: reportData.status || 'pending_mentor',
    mentorId: reportData.mentorId || '',
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

    // Prepare report data with default status
    const dataToStore = {
      ...reportData,
      status: 'pending_mentor',
      submittedAt: timeValidation.correctedTime.getTime()
    };

    const { data, error } = await (supabase
      .from('weekly_report_submissions') as any)
      .insert({
        mentee_id: userId,
        month_key: monthKey,
        week_index: weekIndex,
        report_data: dataToStore,
        submitted_at: timeValidation.correctedTime.toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return null; // Return null to indicate duplicate (could also throw)
      }
      throw error;
    }

    return mapDbToApp(data as unknown as WeeklyReportSubmissionDB);
  } catch (error) {
    console.error("Error submitting weekly report:", error);
    return null;
  }
};

/**
 * Update an existing weekly report (mentee editing their report)
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

    // Allow updating content but preserve status ideally, or reset to pending?
    // Usually editing resets approval status. Let's force reset to pending_mentor.
    const dataToUpdate = {
      ...reportData,
      status: 'pending_mentor',
      updatedAt: timeValidation.correctedTime.getTime()
    };

    const { error } = await (supabase
      .from('weekly_report_submissions') as any)
      .update({
        report_data: dataToUpdate,
        updated_at: timeValidation.correctedTime.toISOString()
      })
      .eq('id', reportId)
      .eq('mentee_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Review a weekly report (Mentor/Supervisor/Kazie action)
 */
export const reviewWeeklyReport = async (
  reportId: string,
  reviews: {
    status: string;
    mentorNotes?: string;
    mentorReviewedAt?: number;
    supervisorNotes?: string;
    supervisorReviewedAt?: number;
    kaUnitNotes?: string;
    kaUnitReviewedAt?: number;
    [key: string]: any;
  }
): Promise<WeeklyReportSubmission | null> => {
  try {
    // 1. Fetch existing report to merge data
    const { data: existing, error: fetchError } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !existing) throw fetchError || new Error('Report not found');

    const existingDBArg = existing as unknown as WeeklyReportSubmissionDB;
    const currentReportData = existingDBArg.report_data || {};

    // 2. Merge updates
    const updatedReportData = {
      ...currentReportData,
      ...reviews
    };

    // 3. Save back
    const { data, error } = await (supabase
      .from('weekly_report_submissions') as any)
      .update({
        report_data: updatedReportData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return mapDbToApp(data as unknown as WeeklyReportSubmissionDB);
  } catch (error) {
    console.error("Error reviewing report:", error);
    return null;
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
      .eq('mentee_id', userId);

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
      .eq('mentee_id', userId)
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

/**
 * Get all weekly report submissions for a specific mentor
 */
export const getWeeklyReportsForMentor = async (mentorId: string): Promise<WeeklyReportSubmission[]> => {
  try {
    // Note: mentorId is stored inside the JSONB column 'report_data'
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      // Use arrow operator ->> to get value as text
      .eq('report_data->>mentorId', mentorId)
      .order('month_key', { ascending: false })
      .order('week_index', { ascending: false });

    if (error) throw error;

    return (data as unknown as WeeklyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error("Error fetching mentor reports:", error);
    return [];
  }
};
