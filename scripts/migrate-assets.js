const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateAssets() {
    console.log('🚀 Starting Asset Migration (Avatars & Signatures)...');

    // 1. Fetch all employees
    // We select profile_picture and signature specifically
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name, profile_picture, signature, avatar_url, signature_url');

    if (error) {
        console.error('❌ Error fetching employees:', error.message);
        process.exit(1);
    }

    console.log(`📊 Found ${employees.length} employees. Checking for legacy assets...`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
        let updates = {};
        let needsUpdate = false;

        // --- Process Avatar ---
        // If we have a profile_picture (blob) and NO avatar_url (or we want to overwrite), sync it.
        // Logic: Only migrate if profile_picture looks like Base64 (long string)
        if (emp.profile_picture && emp.profile_picture.length > 200 && !emp.avatar_url) {
            try {
                console.log(`Processing Avatar for ${emp.name} (${emp.id})...`);
                const publicUrl = await uploadBase64ToStorage(emp.id, emp.profile_picture, 'Avatars', 'avatar');
                if (publicUrl) {
                    updates.avatar_url = publicUrl;
                    // Optionally clear the old blob immediately, or do it in a separate pass
                    updates.profile_picture = null;
                    needsUpdate = true;
                    console.log(`  ✅ Avatar uploaded: ${publicUrl}`);
                }
            } catch (e) {
                console.error(`  ❌ Failed to migrate avatar for ${emp.name}:`, e.message);
                errorCount++;
            }
        }

        // --- Process Signature ---
        if (emp.signature && emp.signature.length > 200 && !emp.signature_url) {
            try {
                console.log(`Processing Signature for ${emp.name} (${emp.id})...`);
                const publicUrl = await uploadBase64ToStorage(emp.id, emp.signature, 'Signatures', 'signature');
                if (publicUrl) {
                    updates.signature_url = publicUrl;
                    updates.signature = null; // Clear old blob
                    needsUpdate = true;
                    console.log(`  ✅ Signature uploaded: ${publicUrl}`);
                }
            } catch (e) {
                console.error(`  ❌ Failed to migrate signature for ${emp.name}:`, e.message);
                errorCount++;
            }
        }

        // --- Save Updates ---
        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from('employees')
                .update(updates)
                .eq('id', emp.id);

            if (updateError) {
                console.error(`  ❌ Failed to update employee record ${emp.name}:`, updateError.message);
                errorCount++;
            } else {
                updatedCount++;
            }
        }
    }

    console.log('\n🎉 Migration Complete!');
    console.log(`   Processed: ${employees.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);
}

/**
 * Helper to upload Base64 string to Supabase Storage
 */
async function uploadBase64ToStorage(userId, base64String, bucketName, prefix) {
    try {
        // 1. Parse Base64
        // Format usually: "data:image/png;base64,iVBORw0KGgo..."
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        let buffer;
        let contentType;

        if (matches && matches.length === 3) {
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Try treating raw string as base64 assuming png/jpeg
            // This is risky, but common fallback
            buffer = Buffer.from(base64String, 'base64');
            contentType = 'image/png'; // Default
        }

        // 2. Determine file extension
        const ext = contentType.split('/')[1] || 'png';
        const timestamp = Date.now();
        const fileName = `${prefix}_${userId}_${timestamp}.${ext}`;
        const filePath = `${userId}/${fileName}`; // Analyze folder structure: userID/file.png

        // 3. Upload
        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .upload(filePath, buffer, {
                contentType: contentType,
                upsert: true
            });

        if (error) throw error;

        // 4. Get Public URL
        const { data: publicData } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return publicData.publicUrl;

    } catch (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
}

migrateAssets().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
