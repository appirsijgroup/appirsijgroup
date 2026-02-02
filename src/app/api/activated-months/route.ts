import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/activated-months
 * Purpose: Handle activated months CRUD operations using the dedicated 'mutabaah_activations' table.
 */

// Get activated months for an employee
export async function GET(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Users can only view their own data unless they are admins
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to ensure consistent access (or use standard client if RLS is perfect)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseServiceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase
      .from('mutabaah_activations')
      .select('month_key')
      .eq('employee_id', employeeId);

    if (error) {
      console.error('Error fetching activated months:', error);
      return NextResponse.json({ error: 'Failed to fetch activated months' }, { status: 500 });
    }

    // Transform [{ month_key: '2025-01' }] -> ['2025-01']
    const activatedMonths = data.map((row) => row.month_key);

    return NextResponse.json({ activatedMonths });
  } catch (error) {
    console.error('GET /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Activate a month for an employee
export async function POST(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, monthKey } = body;

    if (!employeeId || !monthKey) {
      return NextResponse.json({ error: 'employeeId and monthKey are required' }, { status: 400 });
    }

    // Users can only update their own data unless they are admins
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseServiceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if already exists
    const { data: existing } = await supabase
      .from('mutabaah_activations')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('month_key', monthKey)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from('mutabaah_activations')
        .insert({
          employee_id: employeeId,
          month_key: monthKey
        });

      if (error) {
        console.error('Error activating month:', error);
        return NextResponse.json({ error: 'Failed to activate month' }, { status: 500 });
      }
    }

    // Return updated list
    const { data: allData, error: fetchError } = await supabase
      .from('mutabaah_activations')
      .select('month_key')
      .eq('employee_id', employeeId);

    if (fetchError) {
      return NextResponse.json({ activatedMonths: [monthKey] }); // Fallback
    }

    return NextResponse.json({
      success: true,
      activatedMonths: allData.map(d => d.month_key)
    });
  } catch (error) {
    console.error('POST /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
