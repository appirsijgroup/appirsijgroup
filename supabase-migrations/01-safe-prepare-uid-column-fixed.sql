-- ============================================================================
-- SAFE MIGRATION PART 1: PREPARE UID COLUMN
-- ============================================================================
-- This migration prepares the uid column WITHOUT dropping primary key
-- Safe to run - won't break foreign keys
-- ============================================================================

-- ============================================================================
-- STEP 1: Add uid column if not exists
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'uid'
    ) THEN
        ALTER TABLE public.employees ADD COLUMN uid uuid;
        RAISE NOTICE 'Added uid column';
    ELSE
        RAISE NOTICE 'uid column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Populate uid from auth_user_id if exists
-- ============================================================================
UPDATE public.employees
SET uid = auth_user_id
WHERE uid IS NULL
  AND auth_user_id IS NOT NULL;

-- Show result
SELECT
  'Step 2: Populated uid from auth_user_id' as step,
  COUNT(*) as count
FROM public.employees
WHERE uid IS NOT NULL
  AND uid = auth_user_id;

-- ============================================================================
-- STEP 3: Link employees to auth.users by email
-- ============================================================================
UPDATE public.employees e
SET uid = a.id
FROM auth.users a
WHERE e.uid IS NULL
  AND e.email = a.email;

-- Show result
SELECT
  'Step 3: Linked by email' as step,
  COUNT(*) as count
FROM public.employees e
WHERE EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.id = e.uid
    AND a.email = e.email
);

-- ============================================================================
-- STEP 4: Create unique index on uid (prepare for primary key)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid ON public.employees(uid);

-- ============================================================================
-- STEP 5: Add foreign key constraint to auth.users
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
-- STEP 6: Rename auth_user_id to old_auth_user_id (we'll remove it later)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.employees RENAME COLUMN auth_user_id TO old_auth_user_id;
        RAISE NOTICE 'Renamed auth_user_id to old_auth_user_id';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Add comment
-- ============================================================================
COMMENT ON COLUMN public.employees.uid IS 'Supabase Auth UID from auth.users - will become primary key';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'CURRENT STATUS' as info;

SELECT
  'Total employees' as metric,
  COUNT(*)::text as value
FROM employees

UNION ALL

SELECT
  'Employees with uid populated' as metric,
  COUNT(*)::text as value
FROM employees
WHERE uid IS NOT NULL

UNION ALL

SELECT
  'Employees WITHOUT uid (need attention)' as metric,
  COUNT(*)::text as value
FROM employees
WHERE uid IS NULL

UNION ALL

SELECT
  'Completion rate' as metric,
  ROUND(100.0 * COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2)::text || '%' as value
FROM employees;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
SELECT 'NEXT STEPS' as info;

SELECT
  '1. Run: node scripts/create-missing-auth-users.js' as step;

SELECT
  '2. Verify: Run 02-verify-uid-population.sql' as step;

SELECT
  '3. Once 100% have uid, run: 03-transfer-primary-key-to-uid.sql' as step;
