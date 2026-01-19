/**
 * Supabase Client for Browser/Client Components
 * This is used in client components for authentication
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/services/database.types'

export function createClient() {
  // 🔥 FIX: Handle missing environment variables gracefully during build
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent errors
    if (typeof window === 'undefined') {
      return null as any
    }
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
