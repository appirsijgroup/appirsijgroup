-- Migration: Rename 'id' to 'no_pegawai' and make 'uid' the primary key
-- WARNING: This is a complex migration. BACKUP YOUR DATABASE FIRST!

-- Step 1: Drop foreign key constraints within employees table (self-referencing)
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_mentor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_supervisor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_dirut_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_ka_unit_id_fkey;

-- Step 2: Drop the primary key constraint
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_pkey;

-- Step 3: Rename 'id' column to 'no_pegawai'
ALTER TABLE public.employees RENAME COLUMN id TO no_pegawai;

-- Step 4: Add uid column if not exists (UUID from auth.users)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'uid'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN uid uuid NULL;
    END IF;
END $$;

-- Step 5: Copy data from auth_user_id to uid if uid is null
UPDATE public.employees
SET uid = auth_user_id
WHERE uid IS NULL AND auth_user_id IS NOT NULL;

-- Step 6: Create unique index on no_pegawai (was id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_no_pegawai ON public.employees(no_pegawai);

-- Step 7: Create unique index on uid
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid ON public.employees(uid);

-- Step 8: Add foreign key constraint from uid to auth.users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'employees_uid_fkey'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_uid_fkey
        FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 9: Make uid the primary key (only after ensuring all records have uid)
-- WARNING: This will fail if any employee has NULL uid
-- Uncomment below when ready:
-- ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);

-- Step 10: Recreate self-referencing foreign keys to use no_pegawai
ALTER TABLE public.employees
ADD CONSTRAINT employees_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(no_pegawai) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_supervisor_id_fkey
FOREIGN KEY (supervisor_id) REFERENCES employees(no_pegawai) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_dirut_id_fkey
FOREIGN KEY (dirut_id) REFERENCES employees(no_pegawai) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_ka_unit_id_fkey
FOREIGN KEY (ka_unit_id) REFERENCES employees(no_pegawai) ON DELETE SET NULL;

-- Step 11: Update index names from id to no_pegawai
DROP INDEX IF EXISTS public.idx_emails;
CREATE INDEX idx_employees_email ON public.employees USING btree (email);

-- Step 12: Add comments for documentation
COMMENT ON COLUMN public.employees.no_pegawai IS 'Nomor Pegawai - unique employee identifier';
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UID - primary key linked to auth.users';

-- IMPORTANT NOTES:
-- 1. After running this migration, you need to ensure ALL employees have a uid value
-- 2. Once all uids are populated, uncomment Step 9 to make uid the primary key
-- 3. Update all application code that references 'id' to use 'no_pegawai' or 'uid' appropriately
-- 4. Update all foreign key references in OTHER tables that reference employees(id) to employees(uid)
