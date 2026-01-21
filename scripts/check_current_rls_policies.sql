-- ============================================
-- CHECK CURRENT RLS POLICIES
-- Run this to see what policies currently exist
-- ============================================

SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employee_monthly_activities'
ORDER BY policyname;
