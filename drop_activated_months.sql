-- Remove activated_months column from employees table
-- IMPORTANT: Make sure migration to mutabaah_activations is complete before running this!

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = 'activated_months'
    ) THEN
        ALTER TABLE public.employees DROP COLUMN activated_months;
    END IF;
END $$;
