import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/services/database.types';

// ✅ SIMPLE APPROACH: Direct initialization with env vars
// Next.js automatically makes NEXT_PUBLIC_* variables available in the browser

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === "development") {
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
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

// Function to create a new Supabase client with user's session token
export function createSupabaseClientWithToken(token: string) {
  return createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}

// Function to set user session for authenticated requests
export async function setSupabaseSession(token: string) {
  // Update the client's auth state with the user's JWT token
  const { data, error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: '' // You might want to handle refresh tokens separately
  });

  if (error) {
    console.error('Error setting Supabase session:', error);
    throw error;
  }

  return data;
}

// Function to get current user session from Supabase
export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }

  return data.session;
}

// Function to sign out from Supabase
export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out from Supabase:', error);
  }
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

