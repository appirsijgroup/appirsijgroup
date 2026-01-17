-- ============================================================================
-- VERIFICATION SCRIPT: Check UID migration completion
-- ============================================================================
-- Run this after completing the UID migration
-- ============================================================================

SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║         UID MIGRATION VERIFICATION REPORT                  ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';

-- ============================================================================
-- SECTION 1: OVERALL STATISTICS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'SECTION 1: OVERALL STATISTICS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

SELECT
  'Total Employees' as metric,
  COUNT(*)::text as value
FROM employees

UNION ALL

SELECT
  'Employees WITH UID' as metric,
  COUNT(*)::text as value
FROM employees
WHERE uid IS NOT NULL

UNION ALL

SELECT
  'Employees WITHOUT UID (⚠️)' as metric,
  COUNT(*)::text as value
FROM employees
WHERE uid IS NULL

UNION ALL

SELECT
  'Completion Rate' as metric,
  ROUND(100.0 * COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2)::text || '%' as value
FROM employees;

-- ============================================================================
-- SECTION 2: DATA INTEGRITY CHECKS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'SECTION 2: DATA INTEGRITY CHECKS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

-- Check for NULL emails (should be 0)
SELECT
  'Employees with NULL/empty email' as check_item,
  COUNT(*)::text as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Need to fix'
  END as status
FROM employees
WHERE email IS NULL OR email = ''

UNION ALL

-- Check for duplicate emails (should be 0)
SELECT
  'Duplicate emails' as check_item,
  COUNT(*)::text as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Need to fix'
  END as status
FROM (
  SELECT email, COUNT(*) as cnt
  FROM employees
  WHERE email IS NOT NULL AND email != ''
  GROUP BY email
  HAVING COUNT(*) > 1
) duplicates

UNION ALL

-- Check for NULL nip (should be 0)
SELECT
  'Employees with NULL nip' as check_item,
  COUNT(*)::text as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Need to fix'
  END as status
FROM employees
WHERE nip IS NULL OR nip = ''

UNION ALL

-- Check uid uniqueness (should be 0 duplicates)
SELECT
  'Duplicate UIDs' as check_item,
  COUNT(*)::text as count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Need to fix'
  END as status
FROM (
  SELECT uid, COUNT(*) as cnt
  FROM employees
  WHERE uid IS NOT NULL
  GROUP BY uid
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================================================
-- SECTION 3: AUTH.USER INTEGRATION CHECKS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'SECTION 3: AUTH.USER INTEGRATION' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

-- Employees with uid that don't exist in auth.users (orphaned)
SELECT
  'Employees with UID not in auth.users (⚠️)' as check_item,
  COUNT(*)::text as count
FROM employees e
WHERE e.uid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.id = e.uid
  );

-- Employees linked to valid auth.users
SELECT
  'Employees correctly linked to auth.users (✅)' as check_item,
  COUNT(*)::text as count
FROM employees e
WHERE e.uid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.id = e.uid
  );

-- ============================================================================
-- SECTION 4: PROBLEMATIC RECORDS (if any)
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'SECTION 4: PROBLEMATIC RECORDS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

-- Employees without uid - need attention
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE uid IS NULL
    LIMIT 1
  ) THEN
    RAISE NOTICE '⚠️  Employees without UID:';
    FOR emp IN
      SELECT nip, name, email
      FROM employees
      WHERE uid IS NULL
      LIMIT 10
    LOOP
      RAISE NOTICE '  - NIP: %, Name: %, Email: %',
        COALESCE(emp.nip, 'NULL'),
        COALESCE(emp.name, 'NULL'),
        COALESCE(emp.email, 'NULL');
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No problematic records found!';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: SAMPLE OF SUCCESSFULLY MIGRATED RECORDS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'SECTION 5: SAMPLE MIGRATED RECORDS (✅)' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

SELECT
  nip as "NIP",
  name as "Name",
  email as "Email",
  uid as "UID (UUID)",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM auth.users a WHERE a.id = e.uid
    ) THEN '✅ Valid'
    ELSE '❌ Orphaned'
  END as "Auth Status"
FROM employees e
WHERE uid IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- FINAL RECOMMENDATIONS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'FINAL RECOMMENDATIONS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

DO $$
DECLARE
  total_employees INT;
  with_uid INT;
  without_uid INT;
  completion_rate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_employees FROM employees;
  SELECT COUNT(*) INTO with_uid FROM employees WHERE uid IS NOT NULL;
  without_uid := total_employees - with_uid;
  completion_rate := ROUND(100.0 * with_uid / NULLIF(total_employees, 0), 2);

  IF without_uid = 0 THEN
    RAISE NOTICE '🎉 PERFECT! All employees have UID populated!';
    RAISE NOTICE '✅ You can now make uid the PRIMARY KEY';
    RAISE NOTICE '✅ Run: ALTER TABLE employees ADD CONSTRAINT employees_pkey PRIMARY KEY (uid);';
  ELSIF completion_rate >= 90 THEN
    RAISE NOTICE '⚠️  Almost there! % employees still need UID', without_uid;
    RAISE NOTICE '📝 Run: node scripts/create-missing-auth-users.js';
    RAISE NOTICE '📝 Then manually fix any remaining employees without email';
  ELSE
    RAISE NOTICE '❌ CRITICAL: % employees still need UID!', without_uid;
    RAISE NOTICE '📝 Run: node scripts/create-missing-auth-users.js';
    RAISE NOTICE '📝 Check employees without email and fix them manually';
  END IF;
END $$;

SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║              END OF VERIFICATION REPORT                   ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';
