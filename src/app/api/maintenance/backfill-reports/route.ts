import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/maintenance/backfill-reports
 * Purpose: One-time script to sync OLD approved requests to the new employee_monthly_reports table.
 * Usage: Open this URL in browser.
 */

export async function GET(request: NextRequest) {
    try {
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseServiceKey || !supabaseUrl) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Fetch all approved requests
        const { data: tadarusData, error: tadarusError } = await supabase
            .from('tadarus_requests')
            .select('*')
            .eq('status', 'approved');

        const { data: prayerData, error: prayerError } = await supabase
            .from('missed_prayer_requests')
            .select('*')
            .eq('status', 'approved');

        if (tadarusError || prayerError) {
            return NextResponse.json({ error: 'Failed to fetch requests', details: { tadarusError, prayerError } }, { status: 500 });
        }

        // 2. Group by Mentee
        const menteeReports: Record<string, any[]> = {};

        // Helper to add to group
        const addToGroup = (menteeId: string, item: any, type: 'tadarus' | 'prayer') => {
            if (!menteeReports[menteeId]) menteeReports[menteeId] = [];
            menteeReports[menteeId].push({ ...item, _type: type });
        };

        tadarusData?.forEach(item => addToGroup(item.mentee_id, item, 'tadarus'));
        prayerData?.forEach(item => addToGroup(item.mentee_id, item, 'prayer'));

        const results = [];
        const errors = [];

        // 3. Process each mentee
        for (const menteeId of Object.keys(menteeReports)) {
            try {
                // Get current reports
                const { data: reportData } = await supabase
                    .from('employee_monthly_reports')
                    .select('reports')
                    .eq('employee_id', menteeId)
                    .single();

                let reports = reportData?.reports || {};
                let updated = false;

                const items = menteeReports[menteeId];

                for (const item of items) {
                    const date = item.date;
                    const dateObj = new Date(date + 'T12:00:00Z');
                    const monthKey = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

                    if (!reports[monthKey]) reports[monthKey] = {};

                    let activityId = '';

                    if (item._type === 'tadarus') {
                        const category = item.category || 'UMUM';
                        const categoryMap: Record<string, string> = {
                            'BBQ': 'bbq_tahsin',
                            'UMUM': 'tadarus',
                            'KIE': 'tepat_waktu_kie',
                            'Doa Bersama': 'doa_bersama',
                            'Kajian Selasa': 'kajian_selasa',
                            'Pengajian Persyarikatan': 'persyarikatan'
                        };
                        activityId = categoryMap[category] || 'tadarus';
                    } else {
                        // prayer
                        const prayerId = item.prayer_id;
                        const prayerMap: Record<string, string> = {
                            'subuh': 'subuh-default', 'dzuhur': 'dzuhur-default', 'ashar': 'ashar-default',
                            'maghrib': 'maghrib-default', 'isya': 'isya-default', 'tahajud': 'tahajud-default'
                        };
                        activityId = prayerMap[prayerId] || prayerId;
                    }

                    const activity = reports[monthKey][activityId] || { count: 0, entries: [] };
                    if (!activity.entries) activity.entries = [];

                    // Check duplicate
                    if (!activity.entries.some((e: any) => e.date === date)) {
                        activity.entries.push({
                            date,
                            completedAt: new Date().toISOString(),
                            note: `Backfilled from ${item._type} request`
                        });
                        activity.count = activity.entries.length;
                        activity.completedAt = new Date().toISOString();

                        reports[monthKey][activityId] = activity;
                        updated = true;
                    }
                }

                if (updated) {
                    await supabase.from('employee_monthly_reports').upsert({
                        employee_id: menteeId,
                        reports,
                        updated_at: new Date().toISOString()
                    });
                    results.push({ menteeId, status: 'Updated' });
                } else {
                    results.push({ menteeId, status: 'No changes needed' });
                }

            } catch (err: any) {
                console.error(`Error processing mentee ${menteeId}:`, err);
                errors.push({ menteeId, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalMentees: Object.keys(menteeReports).length,
                updated: results.filter(r => r.status === 'Updated').length,
                errors: errors.length
            },
            details: results,
            errors
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Backfill failed' }, { status: 500 });
    }
}
