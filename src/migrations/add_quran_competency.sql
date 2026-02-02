-- Migration to add Al-Quran competency tracking

-- 1. Table for Master Levels
CREATE TABLE IF NOT EXISTS public.quran_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dimension text NOT NULL, -- 'R', 'T', 'H', 'P'
    code text NOT NULL,      -- 'R1', 'T2', etc.
    label text NOT NULL,     -- 'Bisa membaca terbata-bata', etc.
    "order" integer NOT NULL,
    UNIQUE(dimension, code)
);

-- 2. Table for Current Competency
CREATE TABLE IF NOT EXISTS public.employee_quran_competency (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id text REFERENCES public.employees(id) ON DELETE CASCADE,
    reading_level text,       -- R0-R3
    tajwid_level text,        -- T0-T3
    memorization_level text,  -- H0-H5
    understanding_level text, -- P0-P3
    reading_checklist jsonb DEFAULT '[]',
    tajwid_checklist jsonb DEFAULT '[]',
    memorization_checklist jsonb DEFAULT '[]',
    understanding_checklist jsonb DEFAULT '[]',
    assessed_at timestamp with time zone DEFAULT now(),
    assessor_id text REFERENCES public.employees(id) ON DELETE SET NULL,
    UNIQUE(employee_id)
);

-- 3. Table for History/Growth
CREATE TABLE IF NOT EXISTS public.employee_quran_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id text REFERENCES public.employees(id) ON DELETE CASCADE,
    dimension text NOT NULL, -- 'R', 'T', 'H', 'P'
    from_level text,
    to_level text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_competency_employee_id ON public.employee_quran_competency(employee_id);
CREATE INDEX IF NOT EXISTS idx_history_employee_id ON public.employee_quran_history(employee_id);

-- 5. Seed Master Data
INSERT INTO public.quran_levels (dimension, code, label, "order") VALUES
('R', 'R0', 'Belum bisa membaca huruf Arab', 0),
('R', 'R1', 'Bisa membaca terbata-bata', 1),
('R', 'R2', 'Bisa membaca lancar (tajwid belum konsisten)', 2),
('R', 'R3', 'Lancar dan stabil', 3),

('T', 'T0', 'Belum mengenal tajwid', 0),
('T', 'T1', 'Mengenal tajwid dasar', 1),
('T', 'T2', 'Tajwid cukup tepat, masih ada kesalahan kecil', 2),
('T', 'T3', 'Tajwid baik dan konsisten', 3),

('H', 'H0', 'Belum memiliki hafalan', 0),
('H', 'H1', 'Juz ‘Amma', 1),
('H', 'H2', '1–5 Juz', 2),
('H', 'H3', '6–15 Juz', 3),
('H', 'H4', '16–29 Juz', 4),
('H', 'H5', '30 Juz (Hafidz)', 5),

('P', 'P0', 'Membaca tanpa memahami', 0),
('P', 'P1', 'Mengetahui makna global', 1),
('P', 'P2', 'Memahami ayat tematik', 2),
('P', 'P3', 'Tadabbur dan penerapan nilai', 3)
ON CONFLICT (dimension, code) DO NOTHING;
