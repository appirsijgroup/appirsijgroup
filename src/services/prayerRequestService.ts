/**
 * Missed Prayer Request Service
 * Handles manual prayer attendance requests for Supabase
 */

import { supabase } from '@/lib/supabase';
import type { MissedPrayerRequest } from '../types';

// Get all requests for a mentee
export const getMissedPrayerRequestsForMentee = async (menteeId: string): Promise<MissedPrayerRequest[]> => {
    const { data, error } = await supabase
        .from('missed_prayer_requests')
        .select('*')
        .eq('mentee_id', menteeId)
        .order('requested_at', { ascending: false });

    if (error) throw error;

    return data.map((req: any) => ({
        id: req.id,
        menteeId: req.mentee_id,
        menteeName: req.mentee_name,
        mentorId: req.mentor_id,
        date: req.date,
        prayerId: req.prayer_id,
        prayerName: req.prayer_name,
        reason: req.reason,
        requestedAt: req.requested_at,
        status: req.status,
        reviewedAt: req.reviewed_at,
        mentorNotes: req.mentor_notes
    }));
};

// Get all requests for a mentor's team
export const getMissedPrayerRequestsForMentor = async (mentorId: string): Promise<MissedPrayerRequest[]> => {
    const { data, error } = await supabase
        .from('missed_prayer_requests')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('requested_at', { ascending: false });

    if (error) throw error;

    return data.map((req: any) => ({
        id: req.id,
        menteeId: req.mentee_id,
        menteeName: req.mentee_name,
        mentorId: req.mentor_id,
        date: req.date,
        prayerId: req.prayer_id,
        prayerName: req.prayer_name,
        reason: req.reason,
        requestedAt: req.requested_at,
        status: req.status,
        reviewedAt: req.reviewed_at,
        mentorNotes: req.mentor_notes
    }));
};

// Create new request
export const createMissedPrayerRequest = async (
    request: Omit<MissedPrayerRequest, 'id'>
): Promise<MissedPrayerRequest> => {
    const dbRequest = {
        mentee_id: request.menteeId,
        mentee_name: request.menteeName,
        mentor_id: request.mentorId,
        date: request.date,
        prayer_id: request.prayerId,
        prayer_name: request.prayerName,
        reason: request.reason,
        requested_at: request.requestedAt || Date.now(),
        status: request.status || 'pending'
    };

    const { data, error } = await supabase
        .from('missed_prayer_requests')
        .insert(dbRequest as any)
        .select()
        .single() as any;

    if (error) throw error;

    return {
        id: data.id,
        menteeId: data.mentee_id,
        menteeName: data.mentee_name,
        mentorId: data.mentor_id,
        date: data.date,
        prayerId: data.prayer_id,
        prayerName: data.prayer_name,
        reason: data.reason,
        requestedAt: data.requested_at,
        status: data.status,
        reviewedAt: data.reviewed_at,
        mentorNotes: data.mentor_notes
    };
};

// Update request status
export const updateMissedPrayerRequest = async (
    requestId: string,
    updates: Partial<Pick<MissedPrayerRequest, 'status' | 'reviewedAt' | 'mentorNotes'>>
): Promise<void> => {
    const dbUpdates: any = {};

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;
    if (updates.mentorNotes !== undefined) dbUpdates.mentor_notes = updates.mentorNotes;

    const { error } = await (supabase
        .from('missed_prayer_requests') as any)
        .update(dbUpdates)
        .eq('id', requestId);

    if (error) throw error;
};
