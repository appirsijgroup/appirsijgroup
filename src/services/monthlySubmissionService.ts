import { supabase } from '@/lib/supabase';
import type { MonthlyReportSubmission } from '@/types';
import { timeValidationService } from './timeValidationService';

// Re-export the type from types.ts to maintain compatibility
export type { MonthlyReportSubmission };

// Internal database schema (not exported)
interface MonthlyReportSubmissionDB {
  id?: string;
  mentee_id: string;
  mentee_name: string;
  month_key: string;
  week_index: number;
  submitted_at: number;
  status: string;
  mentor_id: string;
  supervisor_id: string | null;
  ka_unit_id: string | null;
  manager_id?: string | null; // Added
  mentor_reviewed_at: number | null;
  mentor_notes: string | null;
  supervisor_reviewed_at: number | null;
  supervisor_notes: string | null;
  ka_unit_reviewed_at: number | null;
  ka_unit_notes: string | null;
  manager_reviewed_at?: number | null; // Added
  manager_notes?: string | null; // Added
  reports: any; // JSONB
  created_at?: string;
}

// Mapping function from DB to App type
function mapDbToApp(dbItem: MonthlyReportSubmissionDB): MonthlyReportSubmission {
  const reports = dbItem.reports || {};

  return {
    ...reports, // Spread reports data (contains content, etc.)
    id: dbItem.id || '',
    menteeId: dbItem.mentee_id,
    menteeName: dbItem.mentee_name,
    monthKey: dbItem.month_key,
    submittedAt: Number(dbItem.submitted_at),
    status: dbItem.status as any,
    mentorId: dbItem.mentor_id,
    supervisorId: dbItem.supervisor_id || undefined,
    kaUnitId: dbItem.ka_unit_id || undefined,
    mentorReviewedAt: dbItem.mentor_reviewed_at ? Number(dbItem.mentor_reviewed_at) : undefined,
    mentorNotes: dbItem.mentor_notes || undefined,
    supervisorReviewedAt: dbItem.supervisor_reviewed_at ? Number(dbItem.supervisor_reviewed_at) : undefined,
    supervisorNotes: dbItem.supervisor_notes || undefined,
    kaUnitReviewedAt: dbItem.ka_unit_reviewed_at ? Number(dbItem.ka_unit_reviewed_at) : undefined,
    kaUnitNotes: dbItem.ka_unit_notes || undefined,
    managerId: dbItem.manager_id || undefined,
    managerReviewedAt: dbItem.manager_reviewed_at ? Number(dbItem.manager_reviewed_at) : undefined,
    managerNotes: dbItem.manager_notes || undefined,
  } as MonthlyReportSubmission;
}

/**
 * Get all monthly report submissions for a user
 */
export const getUserMonthlyReports = async (userId: string): Promise<MonthlyReportSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('monthly_report_submissions')
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
      .from('monthly_report_submissions')
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
      .from('monthly_report_submissions') as any)
      .upsert({
        mentee_id: userId,
        mentee_name: reportData.menteeName || '',
        month_key: monthKey,
        week_index: 0, // Required in schema
        submitted_at: timeValidation.correctedTime.getTime(),
        status: 'pending_mentor',
        mentor_id: reportData.mentorId || '',
        supervisor_id: reportData.supervisorId || null,
        ka_unit_id: reportData.kaUnitId || null,
        manager_id: reportData.managerId || null,
        reports: reportData
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
      .from('monthly_report_submissions') as any)
      .update({
        reports: reportData
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
      .from('monthly_report_submissions')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !existing) throw fetchError || new Error('Report not found');

    const existingReport = existing as unknown as MonthlyReportSubmissionDB;
    const updatedReports = {
      ...(existingReport.reports || {}),
      ...reviews
    };

    // Prepare top-level column updates
    const columnUpdates: any = {
      reports: updatedReports
    };

    // Map common review fields to top-level columns
    if (reviews.status) columnUpdates.status = reviews.status;
    if (reviews.mentorNotes !== undefined) columnUpdates.mentor_notes = reviews.mentorNotes;
    if (reviews.mentorReviewedAt !== undefined) columnUpdates.mentor_reviewed_at = reviews.mentorReviewedAt;
    if (reviews.supervisorNotes !== undefined) columnUpdates.supervisor_notes = reviews.supervisorNotes;
    if (reviews.supervisorReviewedAt !== undefined) columnUpdates.supervisor_reviewed_at = reviews.supervisorReviewedAt;
    if (reviews.kaUnitNotes !== undefined) columnUpdates.ka_unit_notes = reviews.kaUnitNotes;
    if (reviews.kaUnitReviewedAt !== undefined) columnUpdates.ka_unit_reviewed_at = reviews.kaUnitReviewedAt;
    if (reviews.managerNotes !== undefined) columnUpdates.manager_notes = reviews.managerNotes;
    if (reviews.managerReviewedAt !== undefined) columnUpdates.manager_reviewed_at = reviews.managerReviewedAt;

    const { data, error } = await (supabase
      .from('monthly_report_submissions') as any)
      .update(columnUpdates)
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
      .from('monthly_report_submissions')
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
 * Get all monthly report submissions for a specific superior (Combined roles)
 * Optimized to use a single query with OR conditions
 */
export const getMonthlyReportsForSuperiorCombined = async (userId: string, roles: Array<'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId'>): Promise<MonthlyReportSubmission[]> => {
  if (roles.length === 0) return [];
  try {
    const dbColumnMap: Record<string, string> = {
      mentorId: 'mentor_id',
      supervisorId: 'supervisor_id',
      managerId: 'manager_id',
      kaUnitId: 'ka_unit_id'
    };

    const orConditions = roles.map(role => `${dbColumnMap[role]}.eq.${userId}`).join(',');

    const { data, error } = await supabase
      .from('monthly_report_submissions')
      .select('*')
      .or(orConditions)
      .order('month_key', { ascending: false });

    if (error) throw error;

    return (data as unknown as MonthlyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error(`Error fetching combined reports for roles ${roles.join(',')}:`, error);
    return [];
  }
};

/**
 * Get all monthly report submissions for a specific superior (LEGACY - single role)
 */
export const getMonthlyReportsForSuperior = async (userId: string, roleKey: 'mentorId' | 'supervisorId' | 'managerId' | 'kaUnitId'): Promise<MonthlyReportSubmission[]> => {
  return getMonthlyReportsForSuperiorCombined(userId, [roleKey]);
};

/**
 * Get monthly reports for a list of mentees (Fallback/Legacy support)
 */
export const getMonthlyReportsByMenteeIds = async (menteeIds: string[]): Promise<MonthlyReportSubmission[]> => {
  if (!menteeIds || menteeIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('monthly_report_submissions')
      .select('*')
      .in('mentee_id', menteeIds)
      .order('month_key', { ascending: false });

    if (error) throw error;

    return (data as unknown as MonthlyReportSubmissionDB[]).map(item => mapDbToApp(item));
  } catch (error) {
    console.error("Error fetching reports by mentee IDs:", error);
    return [];
  }
};
