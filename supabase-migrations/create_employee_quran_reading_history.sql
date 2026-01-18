-- =====================================================
-- CREATE TABLE: employee_quran_reading_history
-- Purpose: Menyimpan riwayat bacaan Quran karyawan
-- Integration: Digunakan di Lembar Mutaba'ah dan Aktivitas Pribadi
-- =====================================================

-- Drop table jika ada (untuk development)
DROP TABLE IF EXISTS public.employee_quran_reading_history CASCADE;

-- Create tabel employee_quran_reading_history
CREATE TABLE public.employee_quran_reading_history (
    -- Primary Key
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Key ke employees
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- Data Bacaan Quran
    date DATE NOT NULL, -- Tanggal baca (YYYY-MM-DD)
    surah_name TEXT NOT NULL, -- Nama surah (misal: "Al-Fatihah")
    surah_number INTEGER NOT NULL, -- Nomor surah (1-114)
    start_ayah INTEGER NOT NULL, -- Ayat mulai
    end_ayah INTEGER NOT NULL, -- Ayat selesai

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_ayah_range CHECK (end_ayah >= start_ayah),
    CONSTRAINT check_surah_number CHECK (surah_number BETWEEN 1 AND 114),
    CONSTRAINT check_ayah_positive CHECK (start_ayah > 0 AND end_ayah > 0)
);

-- Indexes untuk performa query
-- Drop index jika sudah ada (untuk re-run migration)
DROP INDEX IF EXISTS public.idx_quran_reading_employee CASCADE;
DROP INDEX IF EXISTS public.idx_quran_reading_date CASCADE;
DROP INDEX IF EXISTS public.idx_quran_reading_surah CASCADE;

-- Create indexes
CREATE INDEX idx_quran_reading_employee ON public.employee_quran_reading_history(employee_id);
CREATE INDEX idx_quran_reading_date ON public.employee_quran_reading_history(date DESC);
CREATE INDEX idx_quran_reading_surah ON public.employee_quran_reading_history(surah_number);

-- Trigger untuk auto-update timestamp (jika ada trigger function)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        -- Comment: Tidak perlu trigger untuk updated_at karena hanya created_at yang digunakan
        NULL;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.employee_quran_reading_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies jika ada (untuk re-run migration)
DROP POLICY IF EXISTS "Users can view own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can insert own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can update own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Users can delete own Quran reading history" ON public.employee_quran_reading_history;
DROP POLICY IF EXISTS "Admins can view all Quran reading history" ON public.employee_quran_reading_history;

-- Policy: User bisa lihat riwayat bacaan sendiri
CREATE POLICY "Users can view own Quran reading history"
    ON public.employee_quran_reading_history
    FOR SELECT
    USING (employee_id = auth.uid()::TEXT);

-- Policy: User bisa insert riwayat bacaan sendiri
CREATE POLICY "Users can insert own Quran reading history"
    ON public.employee_quran_reading_history
    FOR INSERT
    WITH CHECK (employee_id = auth.uid()::TEXT);

-- Policy: User bisa update riwayat bacaan sendiri
CREATE POLICY "Users can update own Quran reading history"
    ON public.employee_quran_reading_history
    FOR UPDATE
    USING (employee_id = auth.uid()::TEXT);

-- Policy: User bisa delete riwayat bacaan sendiri
CREATE POLICY "Users can delete own Quran reading history"
    ON public.employee_quran_reading_history
    FOR DELETE
    USING (employee_id = auth.uid()::TEXT);

-- Policy: Admin bisa lihat semua riwayat bacaan
CREATE POLICY "Admins can view all Quran reading history"
    ON public.employee_quran_reading_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()::TEXT AND role IN ('super-admin', 'admin')
        )
    );

-- =====================================================
-- COMMENTS untuk dokumentasi
-- =====================================================

COMMENT ON TABLE public.employee_quran_reading_history IS 'Tabel riwayat bacaan Quran karyawan';
COMMENT ON COLUMN public.employee_quran_reading_history.employee_id IS 'ID karyawan';
COMMENT ON COLUMN public.employee_quran_reading_history.date IS 'Tanggal baca Quran';
COMMENT ON COLUMN public.employee_quran_reading_history.surah_name IS 'Nama surah yang dibaca';
COMMENT ON COLUMN public.employee_quran_reading_history.surah_number IS 'Nomor surah (1-114)';
COMMENT ON COLUMN public.employee_quran_reading_history.start_ayah IS 'Ayat mulai baca';
COMMENT ON COLUMN public.employee_quran_reading_history.end_ayah IS 'Ayat selesai baca';

-- =====================================================
-- MIGRATE DATA dari quran_reading_history JSON field
-- =====================================================

-- Migrate data dari JSON field ke tabel baru
INSERT INTO public.employee_quran_reading_history (employee_id, date, surah_name, surah_number, start_ayah, end_ayah, created_at)
SELECT
    e.id::TEXT,
    (item->>'date')::DATE,
    (item->>'surahName')::TEXT,
    (item->>'surahNumber')::INTEGER,
    (item->>'startAyah')::INTEGER,
    (item->>'endAyah')::INTEGER,
    COALESCE((item->>'createdAt')::TIMESTAMPTZ, NOW())
FROM public.employees e,
     jsonb_array_elements(COALESCE(e.quran_reading_history, '[]'::jsonb)) AS item
WHERE e.quran_reading_history IS NOT NULL
  AND e.quran_reading_history::text != 'null'
  AND e.quran_reading_history::text != '[]'
  AND item->>'surahName' IS NOT NULL
  AND item->>'surahNumber' IS NOT NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Tampilkan hasil migrasi
SELECT
    'employee_quran_reading_history' as table_name,
    COUNT(*) as total_records,
    '✅ Table created and data migrated' as status
FROM public.employee_quran_reading_history;

-- Sample data untuk verifikasi
SELECT
    'Sample Quran reading history:' as info,
    employee_id,
    date,
    surah_name,
    surah_number,
    start_ayah,
    end_ayah
FROM public.employee_quran_reading_history
ORDER BY date DESC
LIMIT 5;
