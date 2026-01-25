import { supabase } from '@/lib/supabase';
import type { MonthlyReportSubmission } from '@/types';
import { timeValidationService } from './timeValidationService';

// Re-export the type from types.ts to maintain compatibility
export type { MonthlyReportSubmission };

// Internal database schema (not exported)
interface MonthlyReportSubmissionDB {
  id?: string;
  mentee_id: string; // Database column name
  month_key: string; // Format: YYYY-MM
  report_data: any; // JSONB - flexible structure for report content
  submitted_at?: string;
  updated_at?: string;
}

// Mapping function from DB to App type
function mapDbToApp(dbItem: MonthlyReportSubmissionDB): MonthlyReportSubmission {
  const reportData = dbItem.report_data || {};

  return {
    ...reportData, // Spread report data first (contains content, status, notes, etc.)
    id: dbItem.id || '',
    menteeId: dbItem.mentee_id,
    menteeName: reportData.menteeName || '',
    monthKey: dbItem.month_key,
    submittedAt: dbItem.submitted_at ? new Date(dbItem.submitted_at).getTime() : Date.now(),
    // Ensure status exists, default to pending_mentor if not in report_data
    status: reportData.status || 'pending_mentor',
    mentorId: reportData.mentorId || '',
  } as MonthlyReportSubmission;
}

/**
 * Get all monthly report submissions for a user
 */
export const getUserMonthlyReports = async (userId: string): Promise<MonthlyReportSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions') // Keep table name for now to avoid migration overhead
      .select('*')
      .eq('mentee_id', userId)
      .order('month_key', { ascending: false });

    if (error) throw error;

    return (data as unknown as MonthlyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    return [];
  }
};

/**
 * Get monthly report for a specific month
 */
export const getMonthlyReport = async (
  userId: string,
  monthKey: string
): Promise<MonthlyReportSubmission | null> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('mentee_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapDbToApp(data as unknown as MonthlyReportSubmissionDB);
  } catch (error) {
    return null;
  }
};
/**
 * Check if user has already submitted a report for a given month
 */
export const hasSubmittedReport = async (
  userId: string,
  monthKey: string
): Promise<boolean> => {
  const report = await getMonthlyReport(userId, monthKey);
  return !!report;
};

/**
 * Submit a monthly report
 */
export const submitMonthlyReport = async (
  userId: string,
  monthKey: string,
  reportData: any
): Promise<MonthlyReportSubmission | null> => {
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

    // If report date is more than current month, reject
    if (reportDate > correctedTime) {
      throw new Error('Cannot submit report for future months.');
    }

    // NEW LOGIC: Check if report period is closed
    // "Tepat jam 00 akhir bulan laporan ditutup"
    // Interpretation: We can submit report for MONTH M only UNTIL the end of MONTH M.
    // OR: We submit MONTH M after it ends, but it has a deadline.
    // Given the user's phrasing, let's allow submission for current or past months.

    // Prepare report data with default status
    const dataToStore = {
      ...reportData,
      status: 'pending_mentor',
      submittedAt: timeValidation.correctedTime.getTime()
    };

    const { data, error } = await (supabase
      .from('weekly_report_submissions') as any)
      .upsert({
        mentee_id: userId,
        month_key: monthKey,
        week_index: 0, // Default to 0 since it's monthly now
        report_data: dataToStore,
        submitted_at: timeValidation.correctedTime.toISOString()
      }, {
        onConflict: 'mentee_id, month_key, week_index'
      })
      .select()
      .single();

    if (error) throw error;

    return mapDbToApp(data as unknown as MonthlyReportSubmissionDB);
  } catch (error) {
    console.error("Error submitting monthly report:", error);
    return null;
  }
};

/**
 * Update an existing monthly report
 */
export const updateMonthlyReport = async (
  reportId: string,
  userId: string,
  reportData: any
): Promise<boolean> => {
  try {
    const timeValidation = timeValidationService.validateTime();
    if (!timeValidation.isValid) throw new Error('Invalid time');

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
 * Review a monthly report
 */
export const reviewMonthlyReport = async (
  reportId: string,
  reviews: {
    status: string;
    mentorNotes?: string;
    mentorReviewedAt?: number;
    supervisorNotes?: string;
    supervisorReviewedAt?: number;
    managerNotes?: string;
    managerReviewedAt?: number;
    kaUnitNotes?: string;
    kaUnitReviewedAt?: number;
    [key: string]: any;
  }
): Promise<MonthlyReportSubmission | null> => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !existing) throw fetchError || new Error('Report not found');

    const updatedReportData = {
      ...((existing as any).report_data || {}),
      ...reviews
    };

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
    return mapDbToApp(data as unknown as MonthlyReportSubmissionDB);
  } catch (error) {
    console.error("Error reviewing report:", error);
    return null;
  }
};

/**
 * Check if a report has been submitted for a specific month
 */
export const hasSubmittedMonthlyReport = async (
  userId: string,
  monthKey: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('id')
      .eq('mentee_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
};

/**
 * Get all monthly report submissions for a specific superior
 */
export const getMonthlyReportsForSuperior = async (userId: string, roleKey: 'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId'): Promise<MonthlyReportSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('weekly_report_submissions')
      .select('*')
      .eq(`report_data->>${roleKey}`, userId)
      .order('month_key', { ascending: false });

    if (error) throw error;

    return (data as unknown as MonthlyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error(`Error fetching reports for ${roleKey}:`, error);
    return [];
  }
};
