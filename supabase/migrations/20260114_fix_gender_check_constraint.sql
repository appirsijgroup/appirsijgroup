-- ============================================
-- Fix Gender Check Constraint
-- Created: 2025-01-14
-- Description: Fix case mismatch in employees_gender_check constraint
-- Issue: Database has 'Laki-Laki' (capital L) but app sends 'Laki-laki' (lowercase l)
-- Fix: Update constraint to accept 'Laki-laki' and 'Perempuan' (lowercase l)
-- ============================================

-- Step 1: Check for existing invalid gender values
DO $$
DECLARE
    invalid_count INTEGER;
    invalid_genders TEXT[];
BEGIN
    -- Count rows with invalid gender values
    SELECT COUNT(*), ARRAY_AGG(DISTINCT gender)
    INTO invalid_count, invalid_genders
    FROM employees
    WHERE gender IS NULL
       OR gender NOT IN ('Laki-laki', 'Perempuan', 'laki-laki', 'perempuan', 'L', 'P', 'Male', 'Female', 'MALE', 'FEMALE', 'male', 'female');

    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % rows with invalid gender values: %', invalid_count, invalid_genders;
    ELSE
        RAISE NOTICE 'No invalid gender values found';
    END IF;
END $$;

-- Step 2: Update invalid gender values to valid ones
-- IMPORTANT: Fix case mismatch - convert 'Laki-Laki' (wrong) to 'Laki-laki' (correct)
UPDATE employees
SET gender = CASE
    WHEN gender IN ('laki-laki', 'L', 'Male', 'MALE', 'male', 'Laki-Laki') THEN 'Laki-laki'
    WHEN gender IN ('perempuan', 'P', 'Female', 'FEMALE', 'female') THEN 'Perempuan'
    WHEN gender IS NULL THEN 'Laki-laki' -- Default to Laki-laki if NULL
    ELSE 'Laki-laki' -- Default to Laki-laki for any other unexpected value
END
WHERE gender IS NULL
   OR gender NOT IN ('Laki-laki', 'Perempuan');

-- Show what was updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % invalid gender values to valid values', updated_count;
END $$;

-- Step 3: Drop the existing check constraint if it exists
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'employees_gender_check'
        AND conrelid = 'employees'::regclass
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT employees_gender_check;
        RAISE NOTICE 'Dropped existing employees_gender_check constraint';
    END IF;
END $$;

-- Step 4: Add the correct check constraint
ALTER TABLE employees
    ADD CONSTRAINT employees_gender_check
    CHECK (gender IN ('Laki-laki', 'Perempuan'));

-- Verify the constraint was created
DO $$
BEGIN
    RAISE NOTICE 'Successfully added employees_gender_check constraint with values: Laki-laki, Perempuan';
END $$;

-- Step 5: Verify all rows now have valid gender values
DO $$
DECLARE
    valid_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM employees;
    SELECT COUNT(*) INTO valid_count FROM employees WHERE gender IN ('Laki-laki', 'Perempuan');

    RAISE NOTICE 'Verification: %/% rows have valid gender values', valid_count, total_count;

    IF valid_count = total_count THEN
        RAISE NOTICE 'SUCCESS: All employees now have valid gender values!';
    ELSE
        RAISE WARNING 'WARNING: Some employees still have invalid gender values';
    END IF;
END $$;
