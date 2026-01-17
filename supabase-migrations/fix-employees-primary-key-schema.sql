-- ============================================================================
-- CORRECTED EMPLOYEES TABLE SCHEMA
-- ============================================================================
-- This migration fixes the employees table structure:
-- 1. Renames 'id' (TEXT, e.g., "6000") to 'nip' (Nomor Pegawai)
-- 2. Removes duplicate 'nip' column if exists
-- 3. Renames 'auth_user_id' to 'uid'
-- 4. Makes 'uid' the PRIMARY KEY (UUID from auth.users)
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop self-referencing foreign key constraints
-- ============================================================================
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_mentor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_supervisor_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_dirut_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_ka_unit_id_fkey;

-- ============================================================================
-- STEP 2: Drop old primary key constraint
-- ============================================================================
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_pkey;

-- ============================================================================
-- STEP 3: Handle duplicate nip column
-- ============================================================================
-- Check if there's an old 'nip' column and migrate data to 'id' first
DO $$
DECLARE
    has_old_nip BOOLEAN;
    has_id_column BOOLEAN;
BEGIN
    -- Check if old nip column exists (separate from id)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'nip'
    ) INTO has_old_nip;

    -- Check if id column still exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'id'
    ) INTO has_id_column;

    IF has_old_nip AND has_id_column THEN
        -- Migrate data from old nip to id if id is null
        UPDATE public.employees
        SET id = nip
        WHERE id IS NULL AND nip IS NOT NULL;

        -- Drop the old nip column
        ALTER TABLE public.employees DROP COLUMN IF EXISTS nip;
        RAISE NOTICE 'Dropped duplicate nip column, data preserved in id column';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Rename 'id' to 'nip' (No Pegawai)
-- ============================================================================
DO $$
BEGIN
    -- Only rename if id column still exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE public.employees RENAME COLUMN id TO nip;
        RAISE NOTICE 'Renamed id column to nip';
    ELSE
        RAISE NOTICE 'id column already renamed or does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Ensure nip column has proper type and constraints
-- ============================================================================
ALTER TABLE public.employees
  ALTER COLUMN nip SET DATA TYPE TEXT USING nip::TEXT;

-- Create unique constraint on nip
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'employees_nip_key'
    ) THEN
        ALTER TABLE public.employees
        ADD CONSTRAINT employees_nip_key UNIQUE (nip);
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Rename 'auth_user_id' to 'uid'
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.employees RENAME COLUMN auth_user_id TO uid;
        RAISE NOTICE 'Renamed auth_user_id to uid';
    ELSE
        -- If uid doesn't exist yet, add it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'employees'
            AND column_name = 'uid'
        ) THEN
            ALTER TABLE public.employees ADD COLUMN uid uuid;
            RAISE NOTICE 'Added uid column';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Create unique index on uid
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid ON public.employees(uid);

-- ============================================================================
-- STEP 8: Make uid the PRIMARY KEY
-- ============================================================================
-- WARNING: This requires all records to have a uid value
-- Uncomment below when all employees have uid populated:
-- ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);

-- ============================================================================
-- STEP 9: Recreate self-referencing foreign keys using nip
-- ============================================================================

-- Drop constraints if they exist (ignore errors if they don't)
DO $$
BEGIN
  -- Drop mentor_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_mentor_id_fkey'
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_mentor_id_fkey;
  END IF;

  -- Drop supervisor_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_supervisor_id_fkey'
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_supervisor_id_fkey;
  END IF;

  -- Drop dirut_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_dirut_id_fkey'
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_dirut_id_fkey;
  END IF;

  -- Drop ka_unit_id constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_ka_unit_id_fkey'
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE public.employees DROP CONSTRAINT employees_ka_unit_id_fkey;
  END IF;
END $$;

-- Now add the constraints
ALTER TABLE public.employees
ADD CONSTRAINT employees_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_supervisor_id_fkey
FOREIGN KEY (supervisor_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_dirut_id_fkey
FOREIGN KEY (dirut_id) REFERENCES employees(nip) ON DELETE SET NULL;

ALTER TABLE public.employees
ADD CONSTRAINT employees_ka_unit_id_fkey
FOREIGN KEY (ka_unit_id) REFERENCES employees(nip) ON DELETE SET NULL;

-- ============================================================================
-- STEP 10: Update foreign key to auth.users
-- ============================================================================
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

-- ============================================================================
-- STEP 11: Update indexes
-- ============================================================================
-- Drop old id index if exists
DROP INDEX IF EXISTS public.idx_employees_id;

-- Ensure nip index exists
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees USING btree (nip);

-- Ensure email index exists
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees USING btree (email);

-- Ensure uid index exists
CREATE INDEX IF NOT EXISTS idx_employees_uid ON public.employees USING btree (uid);

-- ============================================================================
-- STEP 12: Update column comments
-- ============================================================================
COMMENT ON COLUMN public.employees.nip IS 'Nomor Induk Pegawai (No Pegawai) - unique employee identifier (e.g., "6000")';
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UID - primary key linked to auth.users table';

-- ============================================================================
-- FINAL NOTES
-- ============================================================================
-- After this migration:
-- 1. 'nip' = Nomor Pegawai (TEXT, e.g., "6000") - was 'id'
-- 2. 'uid' = UUID from auth.users - was 'auth_user_id'
-- 3. PRIMARY KEY = 'uid' (after uncommenting step 8)
-- 4. All self-referencing FKs use 'nip'
-- 5. All app code must update:
--    - employee.id → employee.nip
--    - employee.auth_user_id → employee.uid

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('nip', 'uid', 'email')
ORDER BY ordinal_position;
