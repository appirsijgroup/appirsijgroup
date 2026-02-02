/**
 * Supabase Client for Server Components
 * This is used in Server Components, Server Actions, and Route Handlers
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/services/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get current user from server-side
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get employee data for current user
 */
export async function getCurrentEmployee() {
  const user = await getUser()

  if (!user) {
    return null
  }

  const supabase = await createClient()
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
    .single()

  if (error || !employee) {
    return null
  }

  return employee
}

/**
 * Check if user has completed profile
 */
export async function isProfileComplete(): Promise<boolean> {
  const employee = await getCurrentEmployee()
  return employee?.is_profile_complete ?? false
}

/**
 * Check if user account is active
 */
export async function isAccountActive(): Promise<boolean> {
  const employee = await getCurrentEmployee()
  return employee?.is_active ?? false
}

/**
 * Check if user has specific role
 */
export async function hasRole(...roles: string[]): Promise<boolean> {
  const employee = await getCurrentEmployee()
  if (!employee) return false
  return roles.includes(employee.role)
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require specific role - throws if user doesn't have role
 */
export async function requireRole(...roles: string[]) {
  const employee = await getCurrentEmployee()
  if (!employee) {
    throw new Error('Authentication required')
  }
  if (!roles.includes(employee.role)) {
    throw new Error(`Role required: ${roles.join(' or ')}`)
  }
  return employee
}
