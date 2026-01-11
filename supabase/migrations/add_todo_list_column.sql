-- Migration: Add todo_list column to employees table
-- Purpose: Enable saving personal to-do list items to database

-- Check if column exists, if not add it
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

        RAISE NOTICE 'Column todo_list added to employees table';
    ELSE
        RAISE NOTICE 'Column todo_list already exists in employees table';
    END IF;
END
$$;

-- Add comment for documentation
COMMENT ON COLUMN employees.todo_list IS 'Personal to-do list items stored as JSONB array of ToDoItem objects';

-- Example data structure:
-- [
--   {
--     "id": "1234567890",
--     "title": "Complete task",
--     "notes": "Some notes",
--     "date": "2025-01-10",
--     "time": "14:00",
--     "completed": false,
--     "createdAt": 1704885600000,
--     "completedAt": null,
--     "completionNotes": null
--   }
-- ]
