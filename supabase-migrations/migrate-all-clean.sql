-- ============================================================================
-- MIGRASI BERSIH: Hapus semua data lama, migrasi ulang
-- ============================================================================

-- ============================================================================
-- PART 1: employee_reading_history
-- ============================================================================

-- Hapus semua data lama
TRUNCATE TABLE public.employee_reading_history CASCADE;

-- Insert data baru
INSERT INTO public.employee_reading_history (employee_id, book_title, pages_read, date_completed, created_at)
SELECT
    e.id,
    (item->>'bookTitle')::text,
    (item->>'pagesRead')::text,
    (item->>'dateCompleted')::text,
    COALESCE((item->>'createdAt')::timestamp, NOW())
FROM public.employees e,
     jsonb_array_elements(COALESCE(e.reading_history, '[]'::jsonb)) AS item
WHERE e.reading_history IS NOT NULL
  AND e.reading_history::text != 'null'
  AND e.reading_history::text != '[]'
  AND item->>'bookTitle' IS NOT NULL;

-- ============================================================================
-- PART 2: employee_quran_reading_history
-- ============================================================================

-- Hapus semua data lama
TRUNCATE TABLE public.employee_quran_reading_history CASCADE;

-- Insert data baru
INSERT INTO public.employee_quran_reading_history (employee_id, date, surah_name, surah_number, start_ayah, end_ayah, created_at)
SELECT
    e.id,
    (item->>'date')::text,
    (item->>'surahName')::text,
    (item->>'surahNumber')::integer,
    (item->>'startAyah')::integer,
    (item->>'endAyah')::integer,
    COALESCE((item->>'createdAt')::timestamp, NOW())
FROM public.employees e,
     jsonb_array_elements(COALESCE(e.quran_reading_history, '[]'::jsonb)) AS item
WHERE e.quran_reading_history IS NOT NULL
  AND e.quran_reading_history::text != 'null'
  AND e.quran_reading_history::text != '[]'
  AND item->>'surahName' IS NOT NULL;

-- ============================================================================
-- PART 3: employee_todos
-- ============================================================================

-- Hapus semua data lama
TRUNCATE TABLE public.employee_todos CASCADE;

-- Insert data baru
INSERT INTO public.employee_todos (employee_id, title, description, is_completed, due_date, priority, created_at, completed_at)
SELECT
    e.id,
    (item->>'title')::text,
    (item->>'notes')::text,
    COALESCE((item->>'completed')::boolean, false),
    (item->>'date')::date,
    COALESCE((item->>'priority')::text, 'medium'),
    COALESCE((item->>'createdAt')::timestamp, NOW()),
    CASE WHEN (item->>'completed')::boolean = true
         THEN (item->>'completedAt')::timestamp
         ELSE NULL
    END
FROM public.employees e,
     jsonb_array_elements(COALESCE(e.todo_list, '[]'::jsonb)) AS item
WHERE e.todo_list IS NOT NULL
  AND e.todo_list::text != 'null'
  AND e.todo_list::text != '[]'
  AND item->>'title' IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- employee_reading_history
SELECT
    'employee_reading_history' as table_name,
    COUNT(*) as total_records
FROM public.employee_reading_history;

-- employee_quran_reading_history
SELECT
    'employee_quran_reading_history' as table_name,
    COUNT(*) as total_records
FROM public.employee_quran_reading_history;

-- employee_todos
SELECT
    'employee_todos' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_completed = true) as completed,
    COUNT(*) FILTER (WHERE is_completed = false) as active
FROM public.employee_todos;

-- Sample data untuk verifikasi
SELECT 'Sample reading_history:' as info;
SELECT employee_id, book_title, date_completed FROM public.employee_reading_history LIMIT 3;

SELECT 'Sample todos:' as info;
SELECT employee_id, title, is_completed FROM public.employee_todos LIMIT 3;
