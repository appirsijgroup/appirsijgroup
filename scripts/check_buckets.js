
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Buckets:', buckets.map(b => b.name));
    }
}

checkStorage();
