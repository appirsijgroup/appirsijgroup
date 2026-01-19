/**
 * Tadarus Service
 * Handles tadarus sessions and requests operations for Supabase
 */

import { supabase } from './attendanceService';
import type { TadarusSession, TadarusRequest } from '../types';

// ==================== TADARUS SESSIONS ====================

// Get all tadarus sessions
export const getAllTadarusSessions = async (): Promise<TadarusSession[]> => {
    try {
        console.log('📖 Fetching all tadarus sessions from Supabase...');

        const { data, error } = await supabase
            .from('tadarus_sessions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error fetching tadarus sessions:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No tadarus sessions found in Supabase');
            return [];
        }

        console.log(`✅ Found ${data.length} tadarus sessions`);

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
        console.error('❌ Error in getAllTadarusSessions:', error);
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
        console.error('Error fetching tadarus sessions for mentor:', error);
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
        console.log('📖 Creating tadarus session with data:', session);

        // Convert camelCase to snake_case for Supabase
        const dbSession = {
            title: session.title,
            date: session.date,
            start_time: session.startTime,
            end_time: session.endTime,
            category: session.category,
            notes: session.notes,
            is_recurring: session.isRecurring,
            mentor_id: session.mentorId,
            participant_ids: session.participantIds || [],
            present_mentee_ids: session.presentMenteeIds || [],
            status: session.status,
            mentor_present: session.mentorPresent,
            created_at: session.createdAt || Date.now()
        };

        console.log('📖 Sending to Supabase:', dbSession);

        const { data, error } = await supabase
            .from('tadarus_sessions')
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

        console.log('✅ Tadarus session created successfully in Supabase:', data);

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
        console.error('❌ Error in createTadarusSession:', error);
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
        console.error('Error updating tadarus session:', error);
        throw error;
    }
};

// Delete tadarus session
export const deleteTadarusSession = async (sessionId: string): Promise<void> => {
    try {
        console.log('🗑️ Attempting to delete tadarus session:', sessionId);

        const { data, error } = await supabase
            .from('tadarus_sessions')
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

        console.log('✅ Tadarus session deleted. Deleted rows:', data);
    } catch (error) {
        console.error('❌ Error in deleteTadarusSession:', error);
        throw error;
    }
};

// ==================== TADARUS REQUESTS ====================

// Get all tadarus requests
export const getAllTadarusRequests = async (): Promise<TadarusRequest[]> => {
    try {
        console.log('📨 Fetching all tadarus requests from Supabase...');

        const { data, error } = await supabase
            .from('tadarus_requests')
            .select('*')
            .order('requested_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error fetching tadarus requests:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw new Error(`Supabase error: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No tadarus requests found in Supabase');
            return [];
        }

        console.log(`✅ Found ${data.length} tadarus requests`);

        // Convert snake_case to camelCase
        return data.map((request: any) => ({
            id: request.id,
            menteeId: request.mentee_id,
            menteeName: request.mentee_name,
            mentorId: request.mentor_id,
            date: request.date,
            notes: request.notes,
            requestedAt: request.requested_at,
            status: request.status,
            reviewedAt: request.reviewed_at
        }));
    } catch (error) {
        console.error('❌ Error in getAllTadarusRequests:', error);
        throw error;
    }
};

// Get tadarus requests for a specific mentor
export const getTadarusRequestsForMentor = async (mentorId: string): Promise<TadarusRequest[]> => {
    const { data, error } = await supabase
        .from('tadarus_requests')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error('Error fetching tadarus requests for mentor:', error);
        throw error;
    }

    return data.map((request: any) => ({
        id: request.id,
        menteeId: request.mentee_id,
        menteeName: request.mentee_name,
        mentorId: request.mentor_id,
        date: request.date,
        notes: request.notes,
        requestedAt: request.requested_at,
        status: request.status,
        reviewedAt: request.reviewed_at
    }));
};

// Create new tadarus request
export const createTadarusRequest = async (
    request: Omit<TadarusRequest, 'id'>
): Promise<TadarusRequest> => {
    try {
        console.log('📨 Creating tadarus request with data:', request);

        // Convert camelCase to snake_case for Supabase
        const dbRequest = {
            mentee_id: request.menteeId,
            mentee_name: request.menteeName,
            mentor_id: request.mentorId,
            date: request.date,
            notes: request.notes,
            requested_at: request.requestedAt || Date.now(),
            status: request.status || 'pending'
        };

        console.log('📨 Sending to Supabase:', dbRequest);

        const { data, error } = await supabase
            .from('tadarus_requests')
            .insert(dbRequest as any)
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

        console.log('✅ Tadarus request created successfully in Supabase:', data);

        // Convert back to camelCase
        return {
            id: data.id,
            menteeId: data.mentee_id,
            menteeName: data.mentee_name,
            mentorId: data.mentor_id,
            date: data.date,
            notes: data.notes,
            requestedAt: data.requested_at,
            status: data.status,
            reviewedAt: data.reviewed_at
        };
    } catch (error) {
        console.error('❌ Error in createTadarusRequest:', error);
        throw error;
    }
};

// Update tadarus request status
export const updateTadarusRequest = async (
    requestId: string,
    updates: Partial<Pick<TadarusRequest, 'status' | 'reviewedAt'>>
): Promise<void> => {
    const dbUpdates: any = {};

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;

    const { error } = await (supabase
        .from('tadarus_requests') as any)
        .update(dbUpdates)
        .eq('id', requestId);

    if (error) {
        console.error('Error updating tadarus request:', error);
        throw error;
    }
};

// Delete tadarus request
export const deleteTadarusRequest = async (requestId: string): Promise<void> => {
    try {
        console.log('🗑️ Attempting to delete tadarus request:', requestId);

        const { data, error } = await supabase
            .from('tadarus_requests')
            .delete()
            .eq('id', requestId)
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

        console.log('✅ Tadarus request deleted. Deleted rows:', data);
    } catch (error) {
        console.error('❌ Error in deleteTadarusRequest:', error);
        throw error;
    }
};
