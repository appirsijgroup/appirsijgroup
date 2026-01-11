/**
 * Team Attendance Diagnostic Script
 * Run this in browser console to diagnose Supabase connection issues
 */

export const diagnoseTeamAttendance = async () => {
    console.log('🔍 Starting Team Attendance Diagnostics...\n');

    // 1. Check Supabase client
    try {
        const { supabase } = await import('./attendanceService');
        console.log('✅ Supabase client loaded:', {
            url: supabase.supabaseUrl,
            hasKey: !!supabase.supabaseKey
        });
    } catch (error) {
        console.error('❌ Failed to load Supabase client:', error);
        return;
    }

    // 2. Test connection
    try {
        const { supabase } = await import('./attendanceService');

        console.log('\n📡 Testing Supabase connection...');
        const { data, error } = await supabase
            .from('team_attendance_sessions')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Supabase connection failed:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });

            if (error.code === '42P01') {
                console.error('❌ TABLE DOES NOT EXIST!');
                console.error('Please run the SQL migration to create the table.');
            } else if (error.code === '42501') {
                console.error('❌ PERMISSION DENIED!');
                console.error('Check RLS policies in Supabase.');
            }

            return;
        }

        console.log('✅ Supabase connection successful!');
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return;
    }

    // 3. Try to fetch sessions
    try {
        const { getAllTeamAttendanceSessions } = await import('./teamAttendanceService');

        console.log('\n📅 Fetching team attendance sessions...');
        const sessions = await getAllTeamAttendanceSessions();

        console.log(`✅ Found ${sessions.length} sessions`);
        if (sessions.length > 0) {
            console.log('Sample session:', sessions[0]);
        }
    } catch (error) {
        console.error('❌ Failed to fetch sessions:', error);
    }

    // 4. Try to create a test session
    try {
        const { createTeamAttendanceSession } = await import('./teamAttendanceService');

        console.log('\n🆕 Creating test session...');

        const testSession = await createTeamAttendanceSession({
            creatorId: 'test-user-id',
            creatorName: 'Test User',
            type: 'KIE',
            date: '2025-01-10',
            startTime: '10:00',
            endTime: '11:00',
            audienceType: 'manual',
            manualParticipantIds: [],
            presentUserIds: [],
            attendanceMode: 'leader'
        });

        console.log('✅ Test session created:', testSession);

        // Cleanup: delete the test session
        const { supabase } = await import('./attendanceService');
        await supabase
            .from('team_attendance_sessions')
            .delete()
            .eq('id', testSession.id);

        console.log('✅ Test session cleaned up');
    } catch (error) {
        console.error('❌ Failed to create test session:', error);
    }

    console.log('\n✅ Diagnostics complete!\n');
};

// Make it available globally for console access
if (typeof window !== 'undefined') {
    (window as any).diagnoseTeamAttendance = diagnoseTeamAttendance;
    console.log('💡 Run diagnoseTeamAttendance() in console to test');
}
