/**
 * Supabase Client for Browser/Client Components
 * This is used in client components for authentication
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/services/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
