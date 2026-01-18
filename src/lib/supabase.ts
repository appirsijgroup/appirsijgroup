import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/services/database.types';

// ✅ SIMPLE APPROACH: Direct initialization with env vars
// Next.js automatically makes NEXT_PUBLIC_* variables available in the browser

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === "development") {
    console.error('❌ MISSING SUPABASE CONFIGURATION:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
    console.error('\n⚠️ Please create .env.local file with your Supabase credentials:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key');
    console.error('\n💡 JWT_SECRET is optional - auto-generated for development\n');
    console.error('Then restart your dev server (Ctrl+C → npm run dev)\n');
  }
}

// Create and export Supabase client directly
export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

if (supabaseUrl && supabaseAnonKey) {
  if (process.env.NODE_ENV === "development") console.log('✅ Supabase client initialized');
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

// Helper functions for case conversion (used by services)
export function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const converted: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      converted[camelKey] = toCamelCase(obj[key]);
    }
  }
  return converted;
}

export function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  const converted: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      converted[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return converted;
}

