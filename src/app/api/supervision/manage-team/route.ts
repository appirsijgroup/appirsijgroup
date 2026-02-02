import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/jwt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/supervision/manage-team
 * Supervisor/KaUnit/Manager mengelola tim yang diawasi
 * Data disimpan ke employees table (supervisor_id, ka_unit_id, dll)
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const body = await request.json()
        const { supervisorId, employeeIds, action, role } = body
        // role: 'supervisor' | 'kaunit' | 'manager'
        // action: 'add' | 'remove'

        if (!supervisorId || !employeeIds || !Array.isArray(employeeIds) || !action || !role) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

        // Determine which field to update based on role
        let fieldName = ''
        if (role === 'supervisor') fieldName = 'supervisor_id'
        else if (role === 'kaunit') fieldName = 'ka_unit_id'
        else if (role === 'manager') fieldName = 'manager_id'
        else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        if (action === 'add') {
            // Set supervisor/kaunit/manager for employees
            const { error: updateError } = await supabase
                .from('employees')
                .update({ [fieldName]: supervisorId })
                .in('id', employeeIds)

            if (updateError) {
                console.error('Error updating employees:', updateError)
                return NextResponse.json({ error: 'Failed to update employees' }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'Team members added successfully' })

        } else if (action === 'remove') {
            // Remove supervisor/kaunit/manager from employees
            const { error: updateError } = await supabase
                .from('employees')
                .update({ [fieldName]: null })
                .in('id', employeeIds)

            if (updateError) {
                console.error('Error updating employees:', updateError)
                return NextResponse.json({ error: 'Failed to update employees' }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'Team members removed successfully' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('Error in manage-team API:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
