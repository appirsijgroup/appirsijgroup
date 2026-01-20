-- ============================================
-- FIX: Add updated_at column to activities table
-- Error: record "new" has no field "updated_at"
-- Solution: Add column and trigger if not exists
-- ============================================

-- Step 1: Add updated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'activities'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE activities
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

-- Step 2: Create/update trigger function
CREATE OR REPLACE FUNCTION update_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS activities_updated_at ON activities;

CREATE TRIGGER activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_activities_updated_at();

-- Step 4: Verify
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'activities'
AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;
