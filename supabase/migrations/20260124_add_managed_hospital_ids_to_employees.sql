-- Migration to add managed_hospital_ids to employees table
-- This is required for the "Kelola Akses Rumah Sakit" feature for admins

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS managed_hospital_ids TEXT[] DEFAULT '{}';

-- Add a comment for clarity
COMMENT ON COLUMN employees.managed_hospital_ids IS 'List of Hospital IDs (brands) that this admin/super-admin can manage';

-- Optional: Re-run permissions if needed, but adding a column usually doesn't affect existing RLS unless referenced
