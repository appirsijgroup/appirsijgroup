-- ============================================================================
-- Cleanup and Migration Script
-- Purpose: Move data from employees.monthly_activities to employee_monthly_activities
-- ============================================================================

-- STEP 1: Check current state
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    -- Count data in old location
    SELECT COUNT(*) INTO old_count
    FROM employees
    WHERE monthly_activities IS NOT NULL
    AND monthly_activities::text != '{}'::text;

    -- Count data in new location
    SELECT COUNT(*) INTO new_count
    FROM employee_monthly_activities;

    RAISE NOTICE '📊 Current state:';
    RAISE NOTICE '  - Records in employees.monthly_activities: %', old_count;
    RAISE NOTICE '  - Records in employee_monthly_activities: %', new_count;
END $$;

-- STEP 2: Migrate data from old column to new table
DO $$
DECLARE
    emp_record RECORD;
    migrated_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Starting migration...';

    -- Loop through all employees with monthly_activities
    FOR emp_record IN
        SELECT id, monthly_activities
        FROM employees
        WHERE monthly_activities IS NOT NULL
        AND monthly_activities::text != '{}'::text
    LOOP
        BEGIN
            -- Insert into new table (ON CONFLICT to update if exists)
            INSERT INTO public.employee_monthly_activities (employee_id, activities)
            VALUES (emp_record.id, emp_record.monthly_activities)
            ON CONFLICT (employee_id)
            DO UPDATE SET activities = EXCLUDED.activities;

            migrated_count := migrated_count + 1;

            RAISE NOTICE '  ✅ Migrated employee: %', emp_record.id;

        EXCEPTION WHEN OTHERS THEN
            skipped_count := skipped_count + 1;
            RAISE NOTICE '  ⚠️ Skipped employee %: %', emp_record.id, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '📊 Migration summary:';
    RAISE NOTICE '  - Successfully migrated: %', migrated_count;
    RAISE NOTICE '  - Skipped (errors): %', skipped_count;
END $$;

-- STEP 3: Verify migration
DO $$
DECLARE
    remaining_old INTEGER;
    total_new INTEGER;
BEGIN
    -- Check remaining data in old column
    SELECT COUNT(*) INTO remaining_old
    FROM employees
    WHERE monthly_activities IS NOT NULL
    AND monthly_activities::text != '{}'::text;

    -- Check total in new table
    SELECT COUNT(*) INTO total_new
    FROM employee_monthly_activities;

    RAISE NOTICE '✅ Verification:';
    RAISE NOTICE '  - Remaining in employees.monthly_activities: %', remaining_old;
    RAISE NOTICE '  - Total in employee_monthly_activities: %', total_new;

    IF remaining_old = 0 THEN
        RAISE NOTICE '✅ All data successfully migrated!';
    ELSE
        RAISE NOTICE '⚠️ Some data still in old column';
    END IF;
END $$;
