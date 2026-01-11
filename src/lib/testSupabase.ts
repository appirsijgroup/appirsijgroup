/**
 * Test Supabase Connection
 * Run this to verify your Supabase setup is working correctly
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import * as employeeService from '@/services/employeeService';
import * as announcementService from '@/services/announcementService';

export async function testSupabaseConnection() {
    const results = {
        envConfigured: false,
        connection: false,
        employeesTable: false,
        announcementsTable: false,
        hospitalsTable: false,
        dailyActivitiesTable: false,
        jobStructureTable: false,
        error: null as string | null
    };

    console.log('🧪 Testing Supabase Connection...\n');

    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    results.envConfigured = isSupabaseConfigured();
    console.log(`   Environment variables: ${results.envConfigured ? '✅ Configured' : '❌ Missing'}`);

    if (!results.envConfigured) {
        results.error = 'Environment variables not configured. Please check .env.local';
        console.log('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
        return results;
    }

    // 2. Test connection
    console.log('\n2️⃣ Testing connection to Supabase...');
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .limit(1);

        if (error) {
            throw error;
        }

        results.connection = true;
        console.log('   ✅ Connection successful!');
    } catch (error: any) {
        results.error = `Connection failed: ${error.message}`;
        console.log(`   ❌ Error: ${error.message}`);
        return results;
    }

    // 3. Test employees table
    console.log('\n3️⃣ Testing employees table...');
    try {
        const employees = await employeeService.getAllEmployees();
        results.employeesTable = true;
        console.log(`   ✅ Employees table accessible (${employees.length} records)`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 4. Test announcements table
    console.log('\n4️⃣ Testing announcements table...');
    try {
        const announcements = await announcementService.getAllAnnouncements();
        results.announcementsTable = true;
        console.log(`   ✅ Announcements table accessible (${announcements.length} records)`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 5. Test hospitals table
    console.log('\n5️⃣ Testing hospitals table...');
    try {
        const { data, error } = await supabase
            .from('hospitals')
            .select('*');

        if (error) throw error;
        results.hospitalsTable = true;
        console.log(`   ✅ Hospitals table accessible (${data?.length || 0} records)`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 6. Test daily_activities table
    console.log('\n6️⃣ Testing daily_activities table...');
    try {
        const { data, error } = await supabase
            .from('daily_activities')
            .select('*');

        if (error) throw error;
        results.dailyActivitiesTable = true;
        console.log(`   ✅ Daily activities table accessible (${data?.length || 0} records)`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 7. Test job_structure table
    console.log('\n7️⃣ Testing job_structure table...');
    try {
        const { data, error } = await supabase
            .from('job_structure')
            .select('*');

        if (error) throw error;
        results.jobStructureTable = true;
        console.log(`   ✅ Job structure table accessible (${data?.length || 0} records)`);
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    const successCount = Object.values(results).filter(v => v === true).length;
    console.log(`📊 Test Results: ${successCount}/6 tests passed`);
    console.log('='.repeat(50));

    return results;
}

/**
 * Quick test - can be run from browser console
 */
export async function quickTest() {
    try {
        console.log('Testing Supabase...');

        // Test 1: Basic query
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .limit(5);

        if (error) throw error;

        console.log('✅ Supabase connected successfully!');
        console.log(`Found ${employees?.length || 0} employees`);

        // Test 2: Daily activities
        const { data: activities } = await supabase
            .from('daily_activities')
            .select('*');

        console.log(`Found ${activities?.length || 0} daily activities`);

        return true;
    } catch (error: any) {
        console.error('❌ Supabase test failed:', error.message);
        return false;
    }
}
