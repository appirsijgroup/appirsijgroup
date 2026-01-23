-- Migration to update announcements table with new fields and correct scope constraint
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns if they don't exist
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_name TEXT,
ADD COLUMN IF NOT EXISTS target_hospital_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_hospital_names TEXT[] DEFAULT '{}';

-- 2. Update scope constraint
-- First, drop the existing constraint
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_scope_check;

-- Add the new constraint with 'alliansi' instead of 'global'
-- We include 'global' just in case there's old data, but 'alliansi' is the new standard
ALTER TABLE announcements ADD CONSTRAINT announcements_scope_check 
CHECK (scope IN ('alliansi', 'mentor', 'global'));

-- 3. Update existing records if any (optional)
UPDATE announcements SET scope = 'alliansi' WHERE scope = 'global';
