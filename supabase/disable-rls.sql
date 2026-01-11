-- Disable RLS temporarily for employee migration
-- Run this in Supabase SQL Editor before migration

-- Disable RLS on employees table
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- After migration is complete, run enable-rls.sql to re-enable security
