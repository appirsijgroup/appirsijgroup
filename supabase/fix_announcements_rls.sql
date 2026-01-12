-- ==========================================
-- FIX RLS POLICY FOR ANNOUNCEMENTS TABLE
-- ==========================================
-- Run this in Supabase SQL Editor to fix the infinite recursion issue

-- Step 1: Drop all existing policies on announcements table
DROP POLICY IF EXISTS "Announcements can be viewed by everyone" ON announcements;
DROP POLICY IF EXISTS "Announcements can be inserted by authenticated users" ON announcements;
DROP POLICY IF EXISTS "Announcements can be updated by authors" ON announcements;
DROP POLICY IF EXISTS "Announcements can be deleted by authors or admins" ON announcements;
DROP POLICY IF EXISTS "Users can insert announcements if they are admins or mentors" ON announcements;
DROP POLICY IF EXISTS "Users can update own announcements" ON announcements;
DROP POLICY IF EXISTS "Users can delete own announcements" ON announcements;

-- Step 2: Create a helper function with SECURITY DEFINER to avoid recursion
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT role
        FROM employees
        WHERE id::text = auth.uid()::text
        LIMIT 1
    );
END;
$$;

-- Step 3: Create a helper function to check if user can delete announcement
CREATE OR REPLACE FUNCTION can_delete_announcement(announcement_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
    author_id TEXT;
BEGIN
    -- Get current user's role using the helper function
    user_role := get_current_user_role();

    -- Get the announcement author
    SELECT author_id INTO author_id
    FROM announcements
    WHERE id = announcement_id::text;

    -- Allow deletion if:
    -- 1. User is super-admin
    -- 2. User is admin
    -- 3. User is the author of the announcement
    RETURN
        user_role IN ('super-admin', 'admin')
        OR
        auth.uid()::text = author_id;
END;
$$;

-- Step 4: Create new policies without recursion

-- Policy for SELECT (read)
CREATE POLICY "Enable read access for all users"
ON announcements
FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT (create)
CREATE POLICY "Enable insert for admins and mentors"
ON announcements
FOR INSERT
TO authenticated
WITH CHECK (
    get_current_user_role() IN ('super-admin', 'admin')
    OR EXISTS (
        SELECT 1 FROM employees
        WHERE id::text = auth.uid()::text
        AND can_be_mentor = true
    )
);

-- Policy for UPDATE
CREATE POLICY "Enable update for announcement authors and admins"
ON announcements
FOR UPDATE
TO authenticated
USING (
    get_current_user_role() IN ('super-admin', 'admin')
    OR
    auth.uid()::text = author_id
)
WITH CHECK (
    get_current_user_role() IN ('super-admin', 'admin')
    OR
    auth.uid()::text = author_id
);

-- Policy for DELETE (this is the critical one that was causing recursion)
CREATE POLICY "Enable delete for announcement authors and admins"
ON announcements
FOR DELETE
TO authenticated
USING (
    get_current_user_role() IN ('super-admin', 'admin')
    OR
    auth.uid()::text = author_id
);

-- Step 5: Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_announcement(TEXT) TO authenticated;

-- Verification query (run this to check if policies are created correctly)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'announcements';
