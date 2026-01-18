-- Optimasi Index Database untuk Mempercepat Query
-- Script ini akan membuat index pada kolom yang sering digunakan untuk filter (WHERE clause)

-- 1. Index untuk employee_monthly_activities
CREATE INDEX IF NOT EXISTS idx_employee_monthly_activities_employee_id 
ON public.employee_monthly_activities (employee_id);

-- 2. Index untuk employee_reading_history
CREATE INDEX IF NOT EXISTS idx_employee_reading_history_employee_id 
ON public.employee_reading_history (employee_id);

-- 3. Index untuk employee_quran_reading_history
CREATE INDEX IF NOT EXISTS idx_employee_quran_reading_history_employee_id 
ON public.employee_quran_reading_history (employee_id);

-- 4. Index untuk employee_todos
CREATE INDEX IF NOT EXISTS idx_employee_todos_employee_id 
ON public.employee_todos (employee_id);

-- 5. Index tambahan untuk pencarian user saat login (nip, email)
-- (Biasanya UNIQUE constraint sudah membuat index, tapi kita pastikan)
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees (nip);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email);

-- Verifikasi index yang berhasil dibuat
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename IN ('employees', 'employee_monthly_activities', 'employee_reading_history', 'employee_quran_reading_history', 'employee_todos')
ORDER BY 
    tablename, 
    indexname;
