-- ============================================================================
-- POPULATE UID SCRIPT: Link employees to auth.users
-- ============================================================================
-- This script populates the uid column in employees by linking to auth.users
-- Run this AFTER running the diagnostic script
-- ============================================================================

-- ============================================================================
-- STEP 1: Copy from auth_user_id column if exists
-- ============================================================================
UPDATE employees
SET uid = auth_user_id
WHERE uid IS NULL
  AND auth_user_id IS NOT NULL;

-- Show result
SELECT
  'Step 1: Copied from auth_user_id' as step,
  COUNT(*) as employees_updated
FROM employees
WHERE uid IS NOT NULL
  AND uid = auth_user_id;

-- ============================================================================
-- STEP 2: Link employees to auth.users by email
-- ============================================================================

-- First, let's see what we're linking
SELECT
  'Step 2: Will link these employees to auth.users by email' as step,
  COUNT(*) as count_to_link
FROM employees e
WHERE e.uid IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.email = e.email
  );

-- Now perform the link
UPDATE employees e
SET uid = a.id
FROM auth.users a
WHERE e.uid IS NULL
  AND e.email = a.email;

-- Show result
SELECT
  'Step 2: Linked by email' as step,
  COUNT(*) as employees_updated
FROM employees e
WHERE EXISTS (
  SELECT 1 FROM auth.users a
  WHERE a.id = e.uid
  AND a.email = e.email
);

-- ============================================================================
-- STEP 3: Verify results
-- ============================================================================

-- Total with uid now
SELECT
  'Step 3: Total employees with uid' as step,
  COUNT(*) as count
FROM employees
WHERE uid IS NOT NULL;

-- Still without uid (need manual/auth creation)
SELECT
  'Step 3: Still without uid (need auth.user creation)' as step,
  COUNT(*) as count
FROM employees
WHERE uid IS NULL;

-- Sample of employees still without uid
SELECT
  'Sample employees still without uid' as step,
  nip,
  name,
  email
FROM employees
WHERE uid IS NULL
LIMIT 10;

-- ============================================================================
-- STEP 4: Create unique index on uid (if not exists)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_uid ON public.employees(uid);

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT
  'FINAL SUMMARY' as summary,
  COUNT(*) as total_employees,
  COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) as with_uid,
  COUNT(CASE WHEN uid IS NULL THEN 1 END) as without_uid,
  ROUND(100.0 * COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) / COUNT(*), 2) as percentage_complete
FROM employees;
