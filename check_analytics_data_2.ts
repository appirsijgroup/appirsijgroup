import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkData() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // With numeric filter
    const { count: withNumeric } = await supabase.from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .filter('id', 'match', '^[0-9]+$')
        .not('role', 'in', '(admin,super-admin)');

    // Without numeric filter
    const { count: withoutNumeric } = await supabase.from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('role', 'in', '(admin,super-admin)');

    console.log('With numeric filter:', withNumeric);
    console.log('Without numeric filter:', withoutNumeric);
}

checkData();
