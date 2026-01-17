-- ============================================================================
-- VERIFY UID POPULATION
-- ============================================================================
-- Run this after creating missing auth users to check if ready for next step
-- ============================================================================

SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║           UID POPULATION VERIFICATION                      ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';

-- ============================================================================
-- STATISTICS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'UID POPULATION STATUS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

SELECT
  'Total Employees' as metric,
  COUNT(*)::text as total
FROM employees

UNION ALL

SELECT
  '✅ With UID' as metric,
  COUNT(*)::text as total
FROM employees
WHERE uid IS NOT NULL

UNION ALL

SELECT
  '❌ Without UID' as metric,
  COUNT(*)::text as total
FROM employees
WHERE uid IS NULL

UNION ALL

SELECT
  'Completion Rate' as metric,
  ROUND(100.0 * COUNT(CASE WHEN uid IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0), 2)::text || '%' as total
FROM employees;

-- ============================================================================
-- CAN WE PROCEED?
-- ============================================================================
DO $$
DECLARE
  total_count INT;
  without_uid INT;
  completion_rate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_count FROM employees;
  SELECT COUNT(*) INTO without_uid FROM employees WHERE uid IS NULL;
  completion_rate := ROUND(100.0 * (total_count - without_uid) / NULLIF(total_count, 0), 2);

  IF total_count = 0 THEN
    RAISE NOTICE '⚠️  No employees found!';
  ELSIF without_uid = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 EXCELLENT! All employees have UID populated!';
    RAISE NOTICE '✅ You can now proceed to: 02-transfer-primary-key.sql';
    RAISE NOTICE '';
  ELSIF completion_rate >= 95 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Almost there! % employees still need UID', without_uid;
    RAISE NOTICE '📝 Run: node scripts/create-missing-auth-users.js';
    RAISE NOTICE '📝 Or manually fix the remaining employees';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ NOT READY! % employees still need UID!', without_uid;
    RAISE NOTICE '📝 Run: node scripts/create-missing-auth-users.js';
    RAISE NOTICE '📝 Check employees with NULL or invalid emails';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================================================
-- PROBLEMATIC RECORDS (if any)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE uid IS NULL
    LIMIT 1
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Employees still without UID:';
    RAISE NOTICE '─────────────────────────────────────────────────';
    FOR emp IN
      SELECT nip, name, email, id
      FROM employees
      WHERE uid IS NULL
      ORDER BY id
      LIMIT 20
    LOOP
      RAISE NOTICE '  NIP: % | Name: % | Email: % | ID: %',
        COALESCE(emp.nip::text, 'NULL'),
        COALESCE(emp.name, 'NULL'),
        COALESCE(emp.email, 'NULL'),
        COALESCE(emp.id::text, 'NULL');
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- INTEGRITY CHECKS
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════' as '';
SELECT 'INTEGRITY CHECKS' as section;
SELECT '═══════════════════════════════════════════════════════════' as '';

-- Check NULL emails
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

-- Check duplicate emails
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

-- Check uid validity (exist in auth.users)
SELECT
  'UIDs that exist in auth.users' as check_item,
  COUNT(*)::text as count,
  CASE
    WHEN COUNT(*) = 0 THEN '⚠️  No uids yet'
    ELSE '✅ GOOD'
  END as status
FROM employees e
WHERE e.uid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM auth.users a
    WHERE a.id = e.uid
  );

SELECT '╔════════════════════════════════════════════════════════════╗' as '';
SELECT '║              END OF VERIFICATION                           ║' as '';
SELECT '╚════════════════════════════════════════════════════════════╝' as '';
