import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: /api/activated-months
 * Purpose: Handle activated months CRUD operations with service role authentication
 * This bypasses RLS policies for authenticated users
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

    // Use service role to bypass RLS
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
      .from('employees')
      .select('activated_months')
      .eq('id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching activated months:', error);
      return NextResponse.json({ error: 'Failed to fetch activated months' }, { status: 500 });
    }

    return NextResponse.json({ activatedMonths: data?.activated_months || [] });
  } catch (error) {
    console.error('GET /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update activated months for an employee
export async function POST(request: NextRequest) {
  try {
    // Verify custom JWT authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, activatedMonths } = body;

    if (!employeeId || !activatedMonths) {
      return NextResponse.json({ error: 'employeeId and activatedMonths are required' }, { status: 400 });
    }

    // Users can only update their own data unless they are admins
    if (session.role !== 'admin' && session.role !== 'super-admin' && session.userId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to bypass RLS
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

    const updateData = {
      activated_months: activatedMonths,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating activated months:', error);
      return NextResponse.json({ error: 'Failed to update activated months' }, { status: 500 });
    }

    console.log('✅ [API] Updated activated months for', employeeId, ':', activatedMonths);

    return NextResponse.json({
      success: true,
      activatedMonths: data.activated_months
    });
  } catch (error) {
    console.error('POST /api/activated-months error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
