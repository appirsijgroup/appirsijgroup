/**
 * Team Attendance Service
 * Handles team attendance session operations for Supabase
 */

import { supabase } from './attendanceService';
import type { TeamAttendanceSession } from '../types';

// Get all team attendance sessions
export const getAllTeamAttendanceSessions = async (): Promise<TeamAttendanceSession[]> => {
    try {

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            return [];
        }


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


        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .insert(dbSession as any)
            .select()
            .single() as any;

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data) {
            throw new Error('No data returned from Supabase after insert');
        }


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
        throw error;
    }
};

// Update full session data (type, date, time, audience, links, etc)
export const updateTeamAttendanceSessionData = async (
    sessionId: string,
    updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentUserIds'>
): Promise<void> => {
    try {

        const dbUpdates: any = {
            type: updates.type,
            date: updates.date,
            start_time: updates.startTime,
            end_time: updates.endTime,
            attendance_mode: updates.attendanceMode,
            audience_type: updates.audienceType,
            audience_rules: updates.audienceRules,
            manual_participant_ids: updates.manualParticipantIds,
            zoom_url: updates.zoomUrl,
            youtube_url: updates.youtubeUrl
        };


        const { error } = await (supabase
            .from('team_attendance_sessions') as any)
            .update(dbUpdates)
            .eq('id', sessionId);

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

    } catch (error) {
        throw error;
    }
};

// Delete session
export const deleteTeamAttendanceSession = async (sessionId: string): Promise<void> => {
    try {

        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .delete()
            .eq('id', sessionId)
            .select();

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

    } catch (error) {
        throw error;
    }
};
