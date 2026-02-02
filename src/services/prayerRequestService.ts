/**
 * Missed Prayer Request Service
 * Handles manual prayer attendance requests for Supabase
 */

import { supabase } from '@/lib/supabase';
import type { MissedPrayerRequest } from '../types';

// Get all requests (admin/superior view)
export const getAllMissedPrayerRequests = async (): Promise<MissedPrayerRequest[]> => {
    try {
        const response = await fetch('/api/manual-requests/prayer');
        if (!response.ok) {
            throw new Error('Failed to fetch all prayer requests');
        }

        const result = await response.json();
        const data = result.data || [];

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
    } catch (error) {
        console.error('Error fetching all prayer requests:', error);
        return [];
    }
};

// Get all requests for a mentee
export const getMissedPrayerRequestsForMentee = async (menteeId: string): Promise<MissedPrayerRequest[]> => {
    try {
        const response = await fetch(`/api/manual-requests/prayer?menteeId=${menteeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer requests');
        }

        const result = await response.json();
        const data = result.data || [];

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
    } catch (error) {
        console.error('Error fetching prayer requests:', error);
        return []; // Return empty array on error to prevent crashes
    }
};

// Get all requests for a mentor's team
export const getMissedPrayerRequestsForMentor = async (mentorId: string): Promise<MissedPrayerRequest[]> => {
    try {
        const response = await fetch(`/api/manual-requests/prayer?mentorId=${mentorId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer requests');
        }

        const result = await response.json();
        const data = result.data || [];

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
    } catch (error) {
        console.error('Error fetching prayer requests for mentor:', error);
        return [];
    }
};

// Get requests for a list of mentees
export const getMissedPrayerRequestsByMenteeIds = async (menteeIds: string[]): Promise<MissedPrayerRequest[]> => {
    try {
        if (menteeIds.length === 0) return [];
        const response = await fetch(`/api/manual-requests/prayer?menteeIds=${menteeIds.join(',')}`);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer requests by mentees');
        }

        const result = await response.json();
        const data = result.data || [];

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
    } catch (error) {
        console.error('Error fetching prayer requests by mentee IDs:', error);
        return [];
    }
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

    const response = await fetch('/api/manual-requests/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbRequest)
    });

    if (!response.ok) {
        throw new Error('Failed to create prayer request');
    }

    const result = await response.json();
    const data = result.data;

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
    const dbUpdates: any = { id: requestId };

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt;
    if (updates.mentorNotes !== undefined) dbUpdates.mentor_notes = updates.mentorNotes;

    const response = await fetch('/api/manual-requests/prayer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates)
    });

    if (!response.ok) {
        throw new Error('Failed to update prayer request');
    }
};
