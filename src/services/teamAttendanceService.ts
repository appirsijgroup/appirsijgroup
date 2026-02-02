/**
 * Team Attendance Service
 * Handles team attendance session operations for Supabase
 */

import { supabase } from './attendanceService';
import type { TeamAttendanceSession, TeamAttendanceRecord } from '../types';

// Get all team attendance sessions with attendance count
export const getAllTeamAttendanceSessions = async (creatorId?: string): Promise<TeamAttendanceSession[]> => {
    try {
        let query = supabase
            .from('team_attendance_sessions')
            .select('*');

        if (creatorId) {
            query = query.eq('creator_id', creatorId);
        }

        const { data, error } = await query
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
            createdAt: new Date(session.created_at).getTime(),
            updatedAt: session.updated_at ? new Date(session.updated_at).getTime() : undefined,
            attendanceMode: session.attendance_mode,
            zoomUrl: session.zoom_url,
            youtubeUrl: session.youtube_url,
            presentCount: 0 // ⚡ FIX: Set to 0 - can be fetched separately if needed
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
    session: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'presentCount' | 'updatedAt'>
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
            attendance_mode: session.attendanceMode,
            zoom_url: session.zoomUrl,
            youtube_url: session.youtubeUrl
        };

        // 🔥 FIX: Use API endpoint to bypass RLS/401 issues
        const response = await fetch('/api/team-attendance/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbSession),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create team attendance session: ${errorData.error || 'Unknown error'} (Code: ${errorData.code || 'HTTP ' + response.status})`);
        }

        const result = await response.json();
        const data = result.data;

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
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : undefined,
            attendanceMode: data.attendance_mode,
            zoomUrl: data.zoom_url,
            youtubeUrl: data.youtube_url,
            presentCount: 0
        };
    } catch (error) {
        throw error;
    }
};

// ============================================================
// TEAM ATTENDANCE RECORDS FUNCTIONS
// ============================================================

// Create attendance record (user klik HADIR)
export const createTeamAttendanceRecord = async (
    record: Omit<TeamAttendanceRecord, 'id' | 'createdAt'>
): Promise<TeamAttendanceRecord> => {
    try {
        // Convert camelCase to snake_case for Supabase
        const dbRecord = {
            session_id: record.sessionId,
            user_id: record.userId,
            user_name: record.userName,
            attended_at: new Date(record.attendedAt).toISOString(),
            session_type: record.sessionType,
            session_date: record.sessionDate,
            session_start_time: record.sessionStartTime,
            session_end_time: record.sessionEndTime
            // Note: created_at di-handle oleh Supabase default (NOW())
        };

        const { data, error } = await supabase
            .from('team_attendance_records')
            .insert(dbRecord as any)
            .select()
            .single() as any;

        if (error) {
            // 🔍 DEBUG: Cek error detail
            console.error('❌ Error insert team_attendance_records:', error);

            // Jika error karena unique constraint (user sudah hadir), beri message yang jelas
            if (error.code === '23505') {
                console.warn('⚠️ User sudah presensi sebelumnya untuk sesi ini');
                throw new Error('Anda sudah melakukan presensi untuk sesi ini. Tidak bisa presensi dua kali.');
            }
            // Error 409 Conflict juga bisa karena duplicate
            if (error.message.includes('duplicate key') || error.message.includes('unique')) {
                console.warn('⚠️ Duplicate attendance record');
                throw new Error('Anda sudah hadir dalam sesi ini sebelumnya.');
            }
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data) {
            throw new Error('No data returned from Supabase after insert');
        }

        console.log('✅ Berhasil insert ke team_attendance_records:', data);

        // Convert back to camelCase
        return {
            id: data.id,
            sessionId: data.session_id,
            userId: data.user_id,
            userName: data.user_name,
            attendedAt: new Date(data.attended_at).getTime(),
            createdAt: new Date(data.created_at).getTime(),
            sessionType: data.session_type,
            sessionDate: data.session_date,
            sessionStartTime: data.session_start_time,
            sessionEndTime: data.session_end_time
        };
    } catch (error) {
        throw error;
    }
};

// Get attendance records for a specific session
export const getAttendanceRecordsForSession = async (sessionId: string): Promise<TeamAttendanceRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('team_attendance_records')
            .select('*')
            .eq('session_id', sessionId)
            .order('attended_at', { ascending: true });

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((record: any) => ({
            id: record.id,
            sessionId: record.session_id,
            userId: record.user_id,
            userName: record.user_name,
            attendedAt: new Date(record.attended_at).getTime(),
            sessionType: record.session_type,
            sessionDate: record.session_date,
            sessionStartTime: record.session_start_time,
            sessionEndTime: record.session_end_time,
            createdAt: new Date(record.created_at).getTime()
        }));
    } catch (error) {
        throw error;
    }
};

/**
 * Get all team attendance records for a specific user
 * ⚡ NEW: Untuk load semua records milik user yang sedang login
 */
export const getAllTeamAttendanceRecordsForUser = async (userId: string): Promise<TeamAttendanceRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('team_attendance_records')
            .select('*')
            .eq('user_id', userId)
            .order('attended_at', { ascending: false }); // Terbaru di atas

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((record: any) => ({
            id: record.id,
            sessionId: record.session_id,
            userId: record.user_id,
            userName: record.user_name,
            attendedAt: new Date(record.attended_at).getTime(),
            sessionType: record.session_type,
            sessionDate: record.session_date,
            sessionStartTime: record.session_start_time,
            sessionEndTime: record.session_end_time,
            createdAt: new Date(record.created_at).getTime()
        }));
    } catch (error) {
        throw error;
    }
};

// Get attendance records for a specific user (riwayat presensi)
export const getAttendanceRecordsForUser = async (userId: string): Promise<TeamAttendanceRecord[]> => {
    try {
        const { data, error } = await supabase
            .from('team_attendance_records')
            .select('*')
            .eq('user_id', userId)
            .order('attended_at', { ascending: false });

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map((record: any) => ({
            id: record.id,
            sessionId: record.session_id,
            userId: record.user_id,
            userName: record.user_name,
            attendedAt: new Date(record.attended_at).getTime(),
            createdAt: new Date(record.created_at).getTime(),
            sessionType: record.session_type,
            sessionDate: record.session_date,
            sessionStartTime: record.session_start_time,
            sessionEndTime: record.session_end_time
        }));
    } catch (error) {
        throw error;
    }
};

// Delete attendance record (jika salah input)
export const deleteTeamAttendanceRecord = async (recordId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('team_attendance_records')
            .delete()
            .eq('id', recordId);

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }
    } catch (error) {
        throw error;
    }
};

// Check if user has attended a session
export const hasUserAttendedSession = async (sessionId: string, userId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('team_attendance_records')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned = user belum hadir
                return false;
            }
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        return !!data;
    } catch (error) {
        throw error;
    }
};

// Update full session data (type, date, time, audience, links, etc)
export const updateTeamAttendanceSessionData = async (
    sessionId: string,
    updates: Omit<TeamAttendanceSession, 'id' | 'createdAt' | 'creatorId' | 'creatorName' | 'presentCount' | 'updatedAt'>
): Promise<void> => {
    try {
        const dbUpdates: any = {
            id: sessionId,
            type: updates.type,
            date: updates.date,
            start_time: updates.startTime,
            end_time: updates.endTime,
            attendance_mode: updates.attendanceMode,
            audience_type: updates.audienceType,
            audience_rules: updates.audienceRules,
            manual_participant_ids: updates.manualParticipantIds,
            zoom_url: updates.zoomUrl,
            youtube_url: updates.youtubeUrl,
        };

        const response = await fetch('/api/team-attendance/sessions', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbUpdates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update session: ${errorData.error || 'Unknown error'}`);
        }

    } catch (error) {
        throw error;
    }
};

// Delete session
export const deleteTeamAttendanceSession = async (sessionId: string): Promise<void> => {
    try {
        const response = await fetch(`/api/team-attendance/sessions?id=${sessionId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to delete session: ${errorData.error || 'Unknown error'}`);
        }

    } catch (error) {
        throw error;
    }
};

/**
 * 🔥 NEW: Convert team attendance sessions to monthlyActivities format
 * This syncs team attendance (KIE, Doa Bersama) to the dashboard chart
 *
 * Input: employeeId
 * Output: { "2026-01": { "21": { tepat_waktu_kie: true, doa_bersama: true } } }
 */
export const convertTeamAttendanceToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        // 🔥 FIX: Use simpler query without JOIN - use denormalized columns directly
        const { data: attendanceRecords, error } = await supabase
            .from('team_attendance_records')
            .select('session_type, session_date')
            .eq('user_id', employeeId);

        if (error) {
            console.error('Error fetching team attendance records:', error);
            return {};
        }

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return {};
        }

        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        attendanceRecords.forEach((record: any) => {
            // 🔥 FIX: Use denormalized columns directly (no need to join)
            const date = record.session_date; // YYYY-MM-DD
            const monthKey = date.substring(0, 7); // YYYY-MM
            const dayKey = date.substring(8, 10); // DD
            const sessionType = record.session_type; // 'KIE' or 'Doa Bersama'

            if (!result[monthKey]) {
                result[monthKey] = {};
            }

            if (!result[monthKey][dayKey]) {
                result[monthKey][dayKey] = {};
            }

            // Map session type to activity ID from DAILY_ACTIVITIES (Case-insensitive)
            const typeLower = sessionType?.toLowerCase().trim();

            if (typeLower === 'kie') {
                result[monthKey][dayKey]['tepat_waktu_kie'] = true;
            } else if (typeLower === 'doa bersama') {
                result[monthKey][dayKey]['doa_bersama'] = true;
            } else if (typeLower === 'bbq' || typeLower === 'umum' || typeLower === 'tadarus') {
                result[monthKey][dayKey]['tadarus'] = true;
            } else if (typeLower === 'kajian selasa') {
                result[monthKey][dayKey]['kajian_selasa'] = true;
            } else if (typeLower === 'pengajian persyarikatan' || typeLower === 'persyarikatan') {
                result[monthKey][dayKey]['persyarikatan'] = true;
            } else if (typeLower === 'membaca al-quran dan buku' || typeLower === 'baca alquran buku') {
                result[monthKey][dayKey]['baca_alquran_buku'] = true;
            }
        });

        return result;
    } catch (error) {
        console.error('Error converting team attendance to activities:', error);
        return {};
    }
};
