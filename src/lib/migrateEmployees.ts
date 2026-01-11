/**
 * Migrate Employees from CSV to Supabase
 * File: employeesdata.csv
 */

import { supabase } from '@/lib/supabase';
import { Database } from '@/services/database.types';

interface CSVEmployee {
    'RS ID': string;
    NIP: string;
    Nama: string;
    Unit: string;
    Bagian: string;
    'Kategori Profesi': string;
    Profesi: string;
    'Jenis Kelamin': string;
}

// Use the Supabase-generated Insert type directly
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];

/**
 * Simple password hash (for demo purposes)
 * In production, use bcrypt on server-side
 */
function hashPassword(password: string): string {
    // Simple hash - INSECURE! Only for demo!
    // In production, use bcrypt on backend
    return `hashed_${password}`;
}

/**
 * Parse CSV text to array of objects
 */
function parseCSV(csvText: string): CSVEmployee[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');

    const employees: CSVEmployee[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted fields (with commas inside)
        const matches: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                matches.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        matches.push(current.trim());

        if (matches.length >= 8) {
            employees.push({
                'RS ID': matches[0],
                NIP: matches[1],
                Nama: matches[2].replace(/^"|"$/g, '').trim(), // Remove quotes
                Unit: matches[3],
                Bagian: matches[4],
                'Kategori Profesi': matches[5],
                Profesi: matches[6],
                'Jenis Kelamin': matches[7]
            });
        }
    }

    return employees;
}

/**
 * Convert CSV employee to database format
 */
function convertToEmployeeInsert(csvEmp: CSVEmployee): EmployeeInsert {
    const nip = csvEmp.NIP.trim();
    const hospitalId = csvEmp['RS ID'] || 'RSIJSP';

    // Generate email from NIP
    const email = `${nip.toLowerCase()}@rsijsp.co.id`;

    // Hash NIP as default password
    const password = hashPassword(nip);

    // Map profession category
    let professionCategory: 'MEDIS' | 'NON MEDIS';
    const category = csvEmp['Kategori Profesi'].toLowerCase();
    if (category === 'medis') {
        professionCategory = 'MEDIS';
    } else {
        professionCategory = 'NON MEDIS';
    }

    // Clean up profession (remove "-" if empty)
    const profession = csvEmp.Profesi === '-' ? null : csvEmp.Profesi;

    return {
        id: nip,
        email,
        password,
        name: csvEmp.Nama,
        hospital_id: hospitalId,
        unit: csvEmp.Unit,
        bagian: csvEmp.Bagian,
        profession_category: professionCategory,
        profession: profession || 'Staf',
        gender: csvEmp['Jenis Kelamin'] as 'Laki-laki' | 'Perempuan',
        last_visit_date: new Date().toISOString().split('T')[0], // Today
        role: 'user',
        is_active: true,
        notification_enabled: true,
        profile_picture: null,
        monthly_activities: {},
        activated_months: [],
        can_be_mentor: false,
        can_be_supervisor: false,
        can_be_ka_unit: false,
        can_be_dirut: false,
        functional_roles: [],
        manager_scope: null,
        location_id: null,
        location_name: null,
        reading_history: [],
        quran_reading_history: [],
        todo_list: [],
        signature: null,
        last_announcement_read_timestamp: null,
        managed_hospital_ids: [],
        achievements: [],
        must_change_password: true // Force password change on first login
    };
}

/**
 * Migrate employees to Supabase
 */
export async function migrateEmployeesToSupabase(
    csvText: string,
    options: {
        batchSize?: number;
        dryRun?: boolean;
    } = {}
) {
    const { batchSize = 50, dryRun = false } = options;

    console.log('🔄 Starting employee migration...\n');

    // Parse CSV
    console.log('📄 Parsing CSV file...');
    const csvEmployees = parseCSV(csvText);
    console.log(`   Found ${csvEmployees.length} employees in CSV\n`);

    // Convert to insert format
    console.log('🔄 Converting to database format...');
    const employeesToInsert = csvEmployees.map(convertToEmployeeInsert);

    if (dryRun) {
        console.log('🔍 DRY RUN - No data will be inserted\n');
        console.log('Sample first 3 employees:');
        employeesToInsert.slice(0, 3).forEach((emp, idx) => {
            console.log(`${idx + 1}. ${emp.name} (${emp.id}) - ${emp.profession}`);
        });
        return { success: true, inserted: 0, total: employeesToInsert.length, errors: [] };
    }

    // Batch insert
    console.log(`💾 Inserting employees in batches of ${batchSize}...\n`);

    let inserted = 0;
    let errors: Array<{ index: number; nip: string; error: string }> = [];

    for (let i = 0; i < employeesToInsert.length; i += batchSize) {
        const batch = employeesToInsert.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(employeesToInsert.length / batchSize);

        console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} employees)...`);

        try {
            const { error } = await (supabase
                .from('employees') as any)
                .insert(batch);

            if (error) {
                // Try one by one if batch fails
                console.log(`   ⚠️  Batch insert failed, trying one by one...`);

                for (const emp of batch) {
                    const { error: singleError } = await (supabase
                        .from('employees') as any)
                        .insert(emp);

                    if (singleError) {
                        errors.push({
                            index: i + batch.indexOf(emp),
                            nip: emp.id as string,
                            error: singleError.message
                        });
                        console.log(`      ❌ ${emp.name} (${emp.id}): ${singleError.message}`);
                    } else {
                        inserted++;
                        console.log(`      ✅ ${emp.name} (${emp.id})`);
                    }
                }
            } else {
                inserted += batch.length;
                console.log(`   ✅ Batch ${batchNum} inserted successfully`);
            }
        } catch (error: any) {
            console.log(`   ❌ Batch ${batchNum} failed: ${error.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total employees: ${employeesToInsert.length}`);
    console.log(`✅ Successfully inserted: ${inserted}`);
    console.log(`❌ Failed: ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.slice(0, 10).forEach(({ index, nip, error }) => {
            console.log(`   ${nip}: ${error}`);
        });
        if (errors.length > 10) {
            console.log(`   ... and ${errors.length - 10} more errors`);
        }
    }

    console.log('\n💡 Tips:');
    console.log('   - Default password is NIP (hashed)');
    console.log('   - Users must change password on first login');
    console.log('   - Check Supabase Dashboard → Table Editor → employees');

    return {
        success: true,
        inserted,
        total: employeesToInsert.length,
        errors
    };
}

/**
 * Validate CSV data before migration
 */
export function validateEmployeeCSV(csvText: string): {
    valid: boolean;
    errors: string[];
    sample: CSVEmployee[];
} {
    const errors: string[] = [];

    // Parse CSV
    const csvEmployees = parseCSV(csvText);

    if (csvEmployees.length === 0) {
        errors.push('CSV file is empty or could not be parsed');
        return { valid: false, errors, sample: [] };
    }

    // Check required fields
    csvEmployees.forEach((emp, idx) => {
        if (!emp.NIP) errors.push(`Row ${idx + 1}: Missing NIP`);
        if (!emp.Nama) errors.push(`Row ${idx + 1}: Missing Nama`);
        if (!emp.Unit) errors.push(`Row ${idx + 1}: Missing Unit`);
        if (!emp['Kategori Profesi']) errors.push(`Row ${idx + 1}: Missing Kategori Profesi`);
    });

    return {
        valid: errors.length === 0,
        errors,
        sample: csvEmployees.slice(0, 5)
    };
}
