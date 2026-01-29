/**
 * Tadarus Service
 * Handles tadarus sessions and requests operations for Supabase
 */

import { supabase } from '@/lib/supabase';
import type { TadarusSession, TadarusRequest } from '../types';

// ==================== TADARUS SESSIONS ====================

// Get all tadarus sessions
export const getAllTadarusSessions = async (): Promise<TadarusSession[]> => {
    try {

        const { data, error } = await supabase
            .from('tadarus_sessions')
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
            title: session.title,
            date: session.date,
            startTime: session.start_time,
            endTime: session.end_time,
            category: session.category,
            notes: session.notes,
            isRecurring: session.is_recurring,
            mentorId: session.mentor_id,
            participantIds: session.participant_ids || [],
            presentMenteeIds: session.present_mentee_ids || [],
            status: session.status,
            mentorPresent: session.mentor_present,
            createdAt: session.created_at
        }));
    } catch (error) {
        throw error;
    }
};

// Get tadarus sessions for a specific mentor
export const getTadarusSessionsForMentor = async (mentorId: string): Promise<TadarusSession[]> => {
    const { data, error } = await supabase
        .from('tadarus_sessions')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('date', { ascending: false });

    if (error) {
        throw error;
    }

    return data.map((session: any) => ({
        id: session.id,
        title: session.title,
        date: session.date,
        startTime: session.start_time,
        endTime: session.end_time,
        category: session.category,
        notes: session.notes,
        isRecurring: session.is_recurring,
        mentorId: session.mentor_id,
        participantIds: session.participant_ids || [],
        presentMenteeIds: session.present_mentee_ids || [],
        status: session.status,
        mentorPresent: session.mentor_present,
        createdAt: session.created_at
    }));
};

// Create new tadarus session
export const createTadarusSession = async (
    session: Omit<TadarusSession, 'id' | 'createdAt'>
): Promise<TadarusSession> => {
    try {
        // Prepare data for database (convert camelCase to snake_case)
        const dbData = {
            title: session.title,
            date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
            category: session.category,
            notes: session.notes || null,
            is_recurring: session.isRecurring || false,
            mentor_id: session.mentorId,
            participant_ids: session.participantIds || [],
            present_mentee_ids: session.presentMenteeIds || [],
            status: session.status || 'open',
            mentor_present: session.mentorPresent ?? true,
        };

        // 🔥 FIX: Use API endpoint to bypass RLS/401 issues on direct Supabase client
        const response = await fetch('/api/tadarus/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create tadarus session: ${errorData.error || 'Unknown error'} (Code: ${errorData.code || 'HTTP ' + response.status})`);
        }

        const result = await response.json();
        const data = result.data;

        // Convert back to camelCase
        return {
            id: data.id,
            title: data.title,
            date: data.date,
            startTime: data.start_time,
            endTime: data.end_time,
            category: data.category,
            notes: data.notes,
            isRecurring: data.is_recurring,
            mentorId: data.mentor_id,
            participantIds: data.participant_ids || [],
            presentMenteeIds: data.present_mentee_ids || [],
            status: data.status,
            mentorPresent: data.mentor_present,
            createdAt: data.created_at
        };
    } catch (error) {
        throw error;
    }
};

// Update tadarus session
export const updateTadarusSession = async (
    sessionId: string,
    updates: Partial<TadarusSession>
): Promise<void> => {
    const dbUpdates: any = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
    if (updates.participantIds !== undefined) dbUpdates.participant_ids = updates.participantIds;
    if (updates.presentMenteeIds !== undefined) dbUpdates.present_mentee_ids = updates.presentMenteeIds;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.mentorPresent !== undefined) dbUpdates.mentor_present = updates.mentorPresent;

    const { error } = await (supabase
        .from('tadarus_sessions') as any)
        .update(dbUpdates)
        .eq('id', sessionId);

    if (error) {
        throw error;
    }
};

// Delete tadarus session
export const deleteTadarusSession = async (sessionId: string): Promise<void> => {
    try {

        const { data, error } = await supabase
            .from('tadarus_sessions')
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

// ==================== TADARUS REQUESTS ====================

// Get all tadarus requests
export const getAllTadarusRequests = async (): Promise<TadarusRequest[]> => {
    try {
        const response = await fetch('/api/manual-requests/tadarus');
        if (!response.ok) {
            throw new Error('Failed to fetch all tadarus requests');
        }

        const result = await response.json();
        const data = result.data || [];

        // Convert snake_case to camelCase
        return data.map((request: any) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching all tadarus requests:', error);
        return [];
    }
};

// Get tadarus requests for a specific mentor
export const getTadarusRequestsForMentor = async (mentorId: string): Promise<TadarusRequest[]> => {
    try {
        const response = await fetch(`/api/manual-requests/tadarus?mentorId=${mentorId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch tadarus requests');
        }

        const result = await response.json();
        const data = result.data || [];

        return data.map((request: any) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus requests for mentor:', error);
        return [];
    }
};

// Get tadarus requests for a list of mentees
export const getTadarusRequestsByMenteeIds = async (menteeIds: string[]): Promise<TadarusRequest[]> => {
    try {
        if (menteeIds.length === 0) return [];
        const response = await fetch(`/api/manual-requests/tadarus?menteeIds=${menteeIds.join(',')}`);
        if (!response.ok) {
            throw new Error('Failed to fetch tadarus requests by mentees');
        }

        const result = await response.json();
        const data = result.data || [];

        return data.map((request: any) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            category: request.category,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('Error fetching tadarus requests by mentee IDs:', error);
        return [];
    }
};

// Create new tadarus request
export const createTadarusRequest = async (
    request: Omit<TadarusRequest, 'id'>
): Promise<TadarusRequest> => {
    const dbRequest = {
        mentee_id: request.menteeId,
        mentee_name: request.menteeName,
        mentor_id: request.mentorId,
        date: request.date,
        category: request.category,
        notes: request.notes,
        requested_at: request.requestedAt || Date.now(),
        status: request.status || 'pending'
    };

    const response = await fetch('/api/manual-requests/tadarus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbRequest)
    });

    if (!response.ok) {
        throw new Error('Failed to create tadarus request');
    }

    const result = await response.json();
    const data = result.data;

    return {
        id: data.id,
        menteeId: data.mentee_id,
        menteeName: data.mentee_name,
        mentorId: data.mentor_id,
        date: data.date,
        category: data.category,
        notes: data.notes,
        requestedAt: data.requested_at,
        status: data.status,
        reviewedAt: data.reviewed_at
    };
};

// Update tadarus request status
export const updateTadarusRequest = async (
    requestId: string,
    updates: Partial<Pick<TadarusRequest, 'status' | 'reviewedAt'>>
): Promise<void> => {
    const dbUpdates: any = { id: requestId };

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;

    const response = await fetch('/api/manual-requests/tadarus', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
    });

    if (!response.ok) {
        throw new Error('Failed to update tadarus request');
    }
};

// Delete tadarus request
export const deleteTadarusRequest = async (requestId: string): Promise<void> => {
    try {

        const { data, error } = await supabase
            .from('tadarus_requests')
            .delete()
            .eq('id', requestId)
            .select();

        if (error) {
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

    } catch (error) {
        throw error;
    }
};

/**
 * 🔥 NEW: Convert tadarus sessions to monthlyActivities format
 * This syncs tadarus attendance to the dashboard chart
 *
 * Input: employeeId
 * Output: { "2026-01": { "21": { tadarus: true } } }
 */
export const convertTadarusSessionsToActivities = async (
    employeeId: string
): Promise<Record<string, Record<string, Record<string, boolean>>>> => {
    try {
        // Get all tadarus sessions where this employee was present
        const { data: sessions, error } = await supabase
            .from('tadarus_sessions')
            .select('*')
            .contains('present_mentee_ids', [employeeId]);

        if (error) {
            console.error('Error fetching tadarus sessions:', error);
            return {};
        }

        if (!sessions || sessions.length === 0) {
            return {};
        }

        const result: Record<string, Record<string, Record<string, boolean>>> = {};

        sessions.forEach((session: any) => {
            const date = session.date; // YYYY-MM-DD
            const monthKey = date.substring(0, 7); // YYYY-MM
            const dayKey = date.substring(8, 10); // DD

            if (!result[monthKey]) {
                result[monthKey] = {};
            }

            if (!result[monthKey][dayKey]) {
                result[monthKey][dayKey] = {};
            }

            // Mark tadarus activity as completed for this day
            result[monthKey][dayKey]['tadarus'] = true;
        });

        console.log('✅ [convertTadarusSessionsToActivities] Tadarus data synced:', result);
        return result;
    } catch (error) {
        console.error('Error converting tadarus sessions to activities:', error);
        return {};
    }
};
