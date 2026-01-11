-- ============================================
-- VERIFICATION SCRIPT: Todo List Column
-- ============================================
-- Purpose: Check if todo_list column is properly set up in employees table

-- 1. Check if column exists
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name = 'todo_list';

-- Expected result:
-- column_name: todo_list
-- data_type: jsonb
-- is_nullable: YES
-- column_default: '[]'::jsonb

-- 2. Test insert a sample todo item
UPDATE employees
SET todo_list = '[
    {
        "id": "test_001",
        "title": "Test Task",
        "notes": "This is a test task",
        "date": "2025-01-10",
        "time": "10:00",
        "completed": false,
        "createdAt": 1704885600000,
        "completedAt": null,
        "completionNotes": null
    }
]'::jsonb
WHERE id = 'YOUR_EMPLOYEE_ID'  -- Replace with actual employee ID
RETURNING id, name, todo_list;

-- 3. Query to see all employees with non-empty todo lists
SELECT
    id,
    name,
    jsonb_array_length(todo_list) as task_count,
    todo_list
FROM employees
WHERE todo_list IS NOT NULL
  AND jsonb_array_length(todo_list) > 0
ORDER BY jsonb_array_length(todo_list) DESC;

-- 4. Check specific employee's todo list
SELECT
    id,
    name,
    todo_list,
    jsonb_pretty(todo_list) as formatted_todo_list
FROM employees
WHERE id = 'YOUR_EMPLOYEE_ID';  -- Replace with actual employee ID

-- 5. Verify JSONB structure (check for any invalid data)
SELECT
    id,
    name,
    todo_list,
    CASE
        WHEN jsonb_typeof(todo_list) = 'array' THEN 'Valid array'
        ELSE 'INVALID: Not an array'
    END as structure_check,
    CASE
        WHEN todo_list IS NULL THEN 'NULL'
        WHEN jsonb_array_length(todo_list) = 0 THEN 'Empty array'
        ELSE concat(jsonb_array_length(todo_list), ' items')
    END as content_check
FROM employees
LIMIT 10;

-- 6. Add column if missing (safety script)
-- Run this only if step 1 shows no results
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'todo_list'
    ) THEN
        ALTER TABLE employees
        ADD COLUMN todo_list JSONB DEFAULT '[]'::jsonb;

        RAISE NOTICE '✅ Column todo_list has been added';
    ELSE
        RAISE NOTICE 'ℹ️ Column todo_list already exists';
    END IF;
END
$$;

-- 7. Add index for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_employees_todo_list
ON employees USING GIN (todo_list);

-- 8. Verify index was created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'employees'
  AND indexname LIKE '%todo_list%';

-- ============================================
-- EXPECTED RESULTS SUMMARY
-- ============================================
-- After running all queries, you should see:
-- 1. Column exists with type jsonb
-- 2. Default value is '[]'::jsonb
-- 3. Can insert/update JSONB data
-- 4. Can query and filter by todo_list content
-- 5. GIN index created for performance (optional)
