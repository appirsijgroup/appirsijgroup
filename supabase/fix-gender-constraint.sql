-- Fix gender constraint to accept correct Indonesian spelling
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE employees DROP CONSTRAINT employees_gender_check;

-- Add the corrected constraint (Laki-Laki with capital L)
ALTER TABLE employees ADD CONSTRAINT employees_gender_check
    CHECK (gender IN ('Laki-Laki', 'Perempuan'));
