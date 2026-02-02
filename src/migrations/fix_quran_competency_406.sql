-- Migration to fix 406 Not Acceptable error and setup proper RLS for Quran Competency
-- This error usually indicates a stale PostgREST schema cache.

-- 1. Ensure tables exist (they should, but for safety)
DO $$ 
BEGIN
    -- This is just a placeholder to ensure the script runs within a transaction if needed
END $$;

-- 2. Explicitly Enable RLS
ALTER TABLE IF EXISTS public.quran_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_quran_competency ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_quran_history ENABLE ROW LEVEL SECURITY;

-- 3. Setup Policies for quran_levels (Master Data - Public Read)
DROP POLICY IF EXISTS "Allow public read on quran_levels" ON public.quran_levels;
CREATE POLICY "Allow public read on quran_levels" 
ON public.quran_levels FOR SELECT USING (true);

-- 4. Setup Policies for employee_quran_competency
-- Users can read their own
DROP POLICY IF EXISTS "Users can read own competency" ON public.employee_quran_competency;
CREATE POLICY "Users can read own competency"
ON public.employee_quran_competency FOR SELECT
USING (auth.uid()::text IN (SELECT id FROM public.employees WHERE id = employee_id));

-- Users can update their own? Usually assessed by mentor, but let's allow read for now.
-- Actually, according to requirements, assessed by mentor/assessor.

-- Superiors/Mentors can read their subordinates' competency
DROP POLICY IF EXISTS "Superiors can read subordinate competency" ON public.employee_quran_competency;
CREATE POLICY "Superiors can read subordinate competency"
ON public.employee_quran_competency FOR SELECT
USING (auth.uid()::text IN (
    SELECT id FROM public.employees 
    WHERE id IN (
        SELECT mentor_id FROM public.employees WHERE id = employee_id
        UNION
        SELECT supervisor_id FROM public.employees WHERE id = employee_id
        UNION
        SELECT ka_unit_id FROM public.employees WHERE id = employee_id
        UNION
        SELECT manager_id FROM public.employees WHERE id = employee_id
    )
));

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all competency" ON public.employee_quran_competency;
CREATE POLICY "Admins can manage all competency"
ON public.employee_quran_competency FOR ALL
USING (auth.uid()::text IN (SELECT id FROM public.employees WHERE role IN ('admin', 'super-admin')));

-- Assessors can update competency
DROP POLICY IF EXISTS "Assessors can update competency" ON public.employee_quran_competency;
CREATE POLICY "Assessors can update competency"
ON public.employee_quran_competency FOR ALL
USING (auth.uid()::text IN (SELECT id FROM public.employees WHERE can_be_mentor = true OR can_be_supervisor = true OR can_be_manager = true));

-- 5. Similar Policies for History
DROP POLICY IF EXISTS "Everyone can read history" ON public.employee_quran_history;
CREATE POLICY "Everyone can read history" ON public.employee_quran_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage history" ON public.employee_quran_history;
CREATE POLICY "Admins can manage history" ON public.employee_quran_history FOR ALL 
USING (auth.uid()::text IN (SELECT id FROM public.employees WHERE role IN ('admin', 'super-admin')));

-- 6. FINAL FIX: RELOAD SCHEMA CACHE
-- This is the most important part for fixing 406 error after schema changes
NOTIFY pgrst, 'reload schema';
