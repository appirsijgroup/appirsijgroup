-- Setup Default Hospital RSIJSP
-- Run this in Supabase SQL Editor

-- 1. Insert default hospital jika belum ada
INSERT INTO hospitals (id, name, brand, address, logo, is_active)
VALUES (
    'RSIJSP',
    'Rumah Sakit Islam Jakarta Sukapura',
    'RSIJSP',
    'Jl. Tipar Cakung No.5, Sukapura, Kec. Cilincing, Jakarta Utara',
    null,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    address = EXCLUDED.address,
    is_active = EXCLUDED.is_active;

-- 2. Update employees yang hospital_id-nya kosong atau NULL
UPDATE employees
SET hospital_id = 'RSIJSP'
WHERE hospital_id IS NULL
   OR hospital_id = ''
   OR hospital_id NOT IN (SELECT id FROM hospitals WHERE id = 'RSIJSP');

-- 3. Verify data
SELECT
    'Total Hospitals:' as info,
    COUNT(*) as count
FROM hospitals
UNION ALL
SELECT
    'Total Employees with RSIJSP:' as info,
    COUNT(*) as count
FROM employees
WHERE hospital_id = 'RSIJSP'
UNION ALL
SELECT
    'Employees without hospital_id:' as info,
    COUNT(*) as count
FROM employees
WHERE hospital_id IS NULL OR hospital_id = '';

-- 4. Show hospital data
SELECT id, brand, code, is_active FROM hospitals;
