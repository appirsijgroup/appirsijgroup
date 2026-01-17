-- ============================================================================
-- CHECK employee_monthly_activities
-- ============================================================================

-- Cek apakah ada data untuk employee 6000
SELECT
    'employee_monthly_activities' as table_name,
    COUNT(*) as total_records
FROM public.employee_monthly_activities
WHERE employee_id = '6000';

-- Lihat data lengkap untuk employee 6000
SELECT
    employee_id,
    activities,
    updated_at,
    created_at
FROM public.employee_monthly_activities
WHERE employee_id = '6000';

-- Jika ada data, lihat detailnya
SELECT
    employee_id,
    jsonb_each_key(activities) as month_data
FROM public.employee_monthly_activities
WHERE employee_id = '6000';
