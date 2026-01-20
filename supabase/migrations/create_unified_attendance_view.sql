-- ============================================
-- CREATE VIEW: unified_attendance
-- Menggabungkan activity_attendance dan team_attendance_records
-- Tujuan: Mempermudah Dashboard & Lembar Mutaba'ah membaca data
-- ============================================

CREATE OR REPLACE VIEW public.unified_attendance AS
SELECT
    -- Identitas
    aa.id as record_id,
    aa.activity_id as entity_id,
    aa.employee_id as user_id,
    'activity' as attendance_type,

    -- Data attendance
    aa.status,
    aa.submitted_at as attended_at,
    aa.created_at,
    aa.updated_at,

    -- Data activity
    a.name as entity_name,
    a.activity_type as activity_type,
    a.date,

    -- Helper fields
    CASE
        WHEN a.activity_type = 'Kajian Selasa' THEN 'kajianSelasa'
        WHEN a.activity_type = 'Pengajian Persyarikatan' THEN 'pengajianPersyarikatan'
        ELSE 'kegiatanTerjadwal'
    END as field_name

FROM public.activity_attendance aa
JOIN public.activities a ON aa.activity_id = a.id
WHERE aa.status = 'hadir'

UNION ALL

SELECT
    -- Identitas
    tr.id as record_id,
    tr.session_id as entity_id,
    tr.user_id,
    'session' as attendance_type,

    -- Data attendance
    'hadir' as status,
    tr.attended_at,
    tr.created_at,
    tr.updated_at,

    -- Data session
    ts.type as entity_name,
    ts.type as activity_type,
    ts.date,

    -- Helper fields
    CASE
        WHEN ts.type = 'KIE' THEN 'kie'
        WHEN ts.type = 'Doa Bersama' THEN 'doaBersama'
        ELSE 'session'
    END as field_name

FROM public.team_attendance_records tr
JOIN public.team_attendance_sessions ts ON tr.session_id = ts.id;

-- Comment
COMMENT ON VIEW public.unified_attendance IS 'Menggabungkan activity_attendance dan team_attendance_records untuk kemudahan query Dashboard & Lembar Mutaba\'ah';

-- Verify
SELECT * FROM public.unified_attendance WHERE user_id = '6000' ORDER BY attended_at DESC;
