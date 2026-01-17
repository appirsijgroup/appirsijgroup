-- ============================================================================
-- INSERT ONLY: Tanpa DROP TABLE, langsung insert data
-- ============================================================================

-- Insert reading_history
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

-- Cek hasil
SELECT
    'employee_reading_history' as table_name,
    COUNT(*) as total_records
FROM public.employee_reading_history;

-- Lihat data yang baru diinsert
SELECT * FROM public.employee_reading_history ORDER BY created_at DESC;
