/**
 * Team Attendance Service
 * Handles team attendance session operations for Supabase
 */

import { supabase } from './attendanceService';
import type { TeamAttendanceSession } from '../types';

// Get all team attendance sessions
export const getAllTeamAttendanceSessions = async (): Promise<TeamAttendanceSession[]> => {
    try {
        console.log('📅 Fetching all team attendance sessions from Supabase...');

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error fetching sessions:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No team attendance sessions found in Supabase');
            return [];
        }

        console.log(`✅ Found ${data.length} team attendance sessions`);

        // Convert snake_case to camelCase
        return data.map((session: any) => ({
            id: session.id,
            creatorId: session.creator_id,
            creatorName: session.creator_name,
            type: session.type,
            date: session.date,
            startTime: session.start_time,
            endTime: session.end_time,
            audienceType: session.audience_type,
            audienceRules: session.audience_rules,
            manualParticipantIds: session.manual_participant_ids,
            presentUserIds: session.present_user_ids || [],
            createdAt: new Date(session.created_at).getTime(),
            attendanceMode: session.attendance_mode,
            zoomUrl: session.zoom_url,
            youtubeUrl: session.youtube_url
        }));
    } catch (error) {
        console.error('❌ Error in getAllTeamAttendanceSessions:', error);
        throw error;
    }
};

// Get sessions for a specific date
export const getSessionsByDate = async (date: string): Promise<TeamAttendanceSession[]> => {
    const { data, error } = await supabase
        .from('team_attendance_sessions')
        .select('*')
        .eq('date', date)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching sessions for date:', error);
        throw error;
    }

    return data.map((session: any) => ({
        id: session.id,
        creatorId: session.creator_id,
        creatorName: session.creator_name,
        type: session.type,
        date: session.date,
        startTime: session.start_time,
        endTime: session.end_time,
        audienceType: session.audience_type,
        audienceRules: session.audience_rules,
        manualParticipantIds: session.manual_participant_ids,
        presentUserIds: session.present_user_ids || [],
        createdAt: new Date(session.created_at).getTime(),
        attendanceMode: session.attendance_mode,
        zoomUrl: session.zoom_url,
        youtubeUrl: session.youtube_url
    }));
};

// Create new team attendance session
export const createTeamAttendanceSession = async (
    session: Omit<TeamAttendanceSession, 'id' | 'createdAt'>
): Promise<TeamAttendanceSession> => {
    try {
        console.log('📅 Creating team attendance session with data:', session);

        // Convert camelCase to snake_case for Supabase
        const dbSession = {
            creator_id: session.creatorId,
            creator_name: session.creatorName,
            type: session.type,
            date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
            audience_type: session.audienceType,
            audience_rules: session.audienceRules,
            manual_participant_ids: session.manualParticipantIds,
            present_user_ids: session.presentUserIds || [],
            attendance_mode: session.attendanceMode,
            zoom_url: session.zoomUrl,
            youtube_url: session.youtubeUrl
            // Note: created_at and updated_at are handled by Supabase defaults (NOW())
        };

        console.log('📅 Sending to Supabase:', dbSession);

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .insert(dbSession as any)
            .select()
            .single() as any;

        if (error) {
            console.error('❌ Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                fullError: error
            });
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data) {
            throw new Error('No data returned from Supabase after insert');
        }

        console.log('✅ Session created successfully in Supabase:', data);

        // Convert back to camelCase
        return {
            id: data.id,
            creatorId: data.creator_id,
            creatorName: data.creator_name,
            type: data.type,
            date: data.date,
            startTime: data.start_time,
            endTime: data.end_time,
            audienceType: data.audience_type,
            audienceRules: data.audience_rules,
            manualParticipantIds: data.manual_participant_ids,
            presentUserIds: data.present_user_ids || [],
            createdAt: new Date(data.created_at).getTime(),
            attendanceMode: data.attendance_mode,
            zoomUrl: data.zoom_url,
            youtubeUrl: data.youtube_url
        };
    } catch (error) {
        console.error('❌ Error in createTeamAttendanceSession:', error);
        throw error;
    }
};

// Update session (add present users, etc)
export const updateTeamAttendanceSession = async (
    sessionId: string,
    updates: Partial<Pick<TeamAttendanceSession, 'presentUserIds'>>
): Promise<void> => {
    const dbUpdates: any = {};

    if (updates.presentUserIds !== undefined) {
        dbUpdates.present_user_ids = updates.presentUserIds;
    }

    const { error } = await (supabase
        .from('team_attendance_sessions') as any)
        .update(dbUpdates)
        .eq('id', sessionId);

    if (error) {
        console.error('Error updating team attendance session:', error);
        throw error;
    }
};

// Delete session
export const deleteTeamAttendanceSession = async (sessionId: string): Promise<void> => {
    try {
        console.log('🗑️ Attempting to delete team attendance session:', sessionId);

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .delete()
            .eq('id', sessionId)
            .select();

        if (error) {
            console.error('❌ Supabase delete error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                fullError: error
            });
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        console.log('✅ Delete operation completed. Deleted rows:', data);
    } catch (error) {
        console.error('❌ Error in deleteTeamAttendanceSession:', error);
        throw error;
    }
};
