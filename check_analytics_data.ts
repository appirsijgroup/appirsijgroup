import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkData() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: hospitals } = await supabase.from('hospitals').select('id, name, brand');
    console.log('Hospitals in DB:', hospitals);

    const { data: empHospitals } = await supabase.from('employees').select('hospital_id').limit(1000);
    const counts = {};
    empHospitals?.forEach(e => {
        counts[e.hospital_id] = (counts[e.hospital_id] || 0) + 1;
    });
    console.log('Employee Hospital ID counts:', counts);

    const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true).not('role', 'in', '(admin,super-admin)');
    console.log('Total active real employees:', count);
}

checkData();
