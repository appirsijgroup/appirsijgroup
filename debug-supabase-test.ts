import { supabase } from './src/lib/supabase';
import { getEmployeeById, updateEmployee } from './src/services/employeeService';

async function testSupabaseConnection() {
    console.log('🧪 Starting Supabase connection test...');

    try {
        // Test basic connection
        console.log('1. Testing basic connection...');
        const { data: testData, error: testError } = await supabase
            .from('employees')
            .select('id, name')
            .limit(1);

        if (testError) {
            console.error('❌ Basic connection test failed:', testError);
            return;
        }

        console.log('✅ Basic connection test passed');
        console.log('Sample employee:', testData?.[0]);

        // Get a specific employee to test
        if (testData && testData.length > 0) {
            const employeeId = testData[0].id;
            console.log(`\n2. Testing getEmployeeById with ID: ${employeeId}`);

            const employee = await getEmployeeById(employeeId);
            if (employee) {
                console.log('✅ getEmployeeById test passed');
                console.log('Employee name:', employee.name);
                console.log('Monthly activities count:', Object.keys(employee.monthlyActivities || {}).length);
                
                // Test updating monthly activities
                console.log('\n3. Testing updateEmployee with monthly activities...');
                
                const testMonthKey = 'test-' + new Date().toISOString().slice(0, 7); // Format: test-YYYY-MM
                const testDayKey = new Date().getDate().toString().padStart(2, '0');
                
                const updatedMonthlyActivities = {
                    ...(employee.monthlyActivities || {}),
                    [testMonthKey]: {
                        ...(employee.monthlyActivities?.[testMonthKey] || {}),
                        [testDayKey]: {
                            'debug_test_activity': true
                        }
                    }
                };
                
                console.log('Updating with:', {
                    monthKey: testMonthKey,
                    dayKey: testDayKey,
                    activity: 'debug_test_activity'
                });
                
                const updatedEmployee = await updateEmployee(employeeId, {
                    monthlyActivities: updatedMonthlyActivities
                });
                
                console.log('✅ updateEmployee test passed');
                console.log('Updated employee has monthly activities:', Object.keys(updatedEmployee.monthlyActivities || {}).length);
                
                // Now test reading back the data
                console.log('\n4. Testing read-back of updated data...');
                const refreshedEmployee = await getEmployeeById(employeeId);
                
                if (refreshedEmployee && refreshedEmployee.monthlyActivities?.[testMonthKey]?.[testDayKey]?.['debug_test_activity']) {
                    console.log('✅ Data persistence test passed - data survived round trip!');
                    console.log('Verified data exists in:', testMonthKey, '->', testDayKey);
                } else {
                    console.error('❌ Data persistence test failed - updated data not found after refresh');
                    console.log('Refreshed employee monthly activities:', refreshedEmployee?.monthlyActivities);
                }
            } else {
                console.error('❌ Could not retrieve employee for testing');
            }
        } else {
            console.error('❌ No employees found to test with');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error during tests:', error);
    }

    console.log('\n🏁 Supabase connection test completed');
}

// Run the test
testSupabaseConnection();