import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/services/database.types';
import { getSession, hasRole } from '@/lib/auth';

// Service role client - bypasses RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const serviceRoleClient = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!serviceRoleClient) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Verify session and check admin role
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const isAdmin = await hasRole(['admin', 'super-admin', 'owner']);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can create employees' },
        { status: 403 }
      );
    }

    // Parse the request body
    const employeeData = await request.json();

    // Create the employee using service role client (bypasses RLS)
    const { data: newEmployee, error: insertError } = await serviceRoleClient
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error creating employee:', insertError);
      }
      return NextResponse.json(
        { error: insertError.message, details: insertError },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: newEmployee }, { status: 201 });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error in employee creation API:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
