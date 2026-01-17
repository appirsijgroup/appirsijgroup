import { supabase } from '@/lib/supabase';
import type { ToDoItem } from '@/types';

/**
 * Employee Todo Service
 * Handles all todo-related database operations
 */

// Get all todos for an employee
export const getEmployeeTodos = async (employeeId: string): Promise<ToDoItem[]> => {
    try {
        const { data, error } = await supabase
            .from('employee_todos')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error getting employee todos:', error);
            // Return empty array for graceful degradation
            return [];
        }

        // Transform database format to app format
        return (data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            date: item.due_date, // due_date → date
            time: null, // Not stored in new table
            notes: item.description, // description → notes
            completed: item.is_completed || false, // is_completed → completed
            createdAt: item.created_at,
            completedAt: item.completed_at ? new Date(item.completed_at).getTime() : null,
            completionNotes: null // Not stored in new table
        }));
    } catch (err) {
        console.error('❌ Unexpected error in getEmployeeTodos:', err);
        return [];
    }
};

// Add a new todo
export const addEmployeeTodo = async (
    employeeId: string,
    todo: Omit<ToDoItem, 'id'>
): Promise<ToDoItem | null> => {
    try {
        console.log('📝 Adding employee todo:', { employeeId, todo });

        const { data, error } = await supabase
            .from('employee_todos')
            .insert({
                employee_id: employeeId,
                title: todo.title,
                description: todo.notes || null,
                is_completed: todo.completed || false,
                due_date: todo.date || null,
                priority: todo.priority || 'medium',
                completed_at: todo.completedAt ? new Date(todo.completedAt).toISOString() : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error adding employee todo:', error);
            throw error;
        }

        console.log('✅ Employee todo added successfully:', data);
        return {
            id: data.id,
            title: data.title,
            date: data.due_date,
            time: null,
            notes: data.description,
            completed: data.is_completed || false,
            createdAt: data.created_at,
            completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
            completionNotes: null,
            priority: data.priority
        };
    } catch (err) {
        console.error('❌ Unexpected error in addEmployeeTodo:', err);
        throw err;
    }
};

// Update an existing todo
export const updateEmployeeTodo = async (
    id: string,
    updates: Partial<Omit<ToDoItem, 'id' | 'createdAt'>>
): Promise<ToDoItem | null> => {
    try {
        console.log('📝 Updating employee todo:', { id, updates });

        // Transform app format to database format
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };

        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.notes !== undefined) dbUpdates.description = updates.notes;
        if (updates.completed !== undefined) {
            dbUpdates.is_completed = updates.completed;
            dbUpdates.completed_at = updates.completed ? new Date().toISOString() : null;
        }
        if (updates.date !== undefined) dbUpdates.due_date = updates.date;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.completedAt !== undefined) {
            dbUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;
        }

        const { data, error } = await supabase
            .from('employee_todos')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating employee todo:', error);
            throw error;
        }

        console.log('✅ Employee todo updated successfully:', data);
        return {
            id: data.id,
            title: data.title,
            date: data.due_date,
            time: null,
            notes: data.description,
            completed: data.is_completed || false,
            createdAt: data.created_at,
            completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
            completionNotes: null,
            priority: data.priority
        };
    } catch (err) {
        console.error('❌ Unexpected error in updateEmployeeTodo:', err);
        throw err;
    }
};

// Delete a todo
export const deleteEmployeeTodo = async (id: string): Promise<boolean> => {
    try {
        console.log('🗑️ Deleting employee todo:', id);

        const { error } = await supabase
            .from('employee_todos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Error deleting employee todo:', error);
            throw error;
        }

        console.log('✅ Employee todo deleted successfully');
        return true;
    } catch (err) {
        console.error('❌ Unexpected error in deleteEmployeeTodo:', err);
        throw err;
    }
};

// Bulk update todos (replace all todos for an employee)
export const bulkUpdateEmployeeTodos = async (
    employeeId: string,
    todos: ToDoItem[]
): Promise<ToDoItem[]> => {
    try {
        console.log('📝 Bulk updating employee todos:', { employeeId, count: todos.length });

        // Delete all existing todos for this employee
        const { error: deleteError } = await supabase
            .from('employee_todos')
            .delete()
            .eq('employee_id', employeeId);

        if (deleteError) {
            console.error('❌ Error deleting old todos:', deleteError);
            throw deleteError;
        }

        // Insert new todos
        const todosToInsert = todos.map(todo => ({
            employee_id: employeeId,
            title: todo.title,
            description: todo.notes || null,
            is_completed: todo.completed || false,
            due_date: todo.date || null,
            priority: todo.priority || 'medium',
            completed_at: todo.completedAt ? new Date(todo.completedAt).toISOString() : null,
            created_at: todo.createdAt ? new Date(todo.createdAt).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('employee_todos')
            .insert(todosToInsert)
            .select();

        if (error) {
            console.error('❌ Error inserting new todos:', error);
            throw error;
        }

        // Transform back to app format
        const transformedTodos = (data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            date: item.due_date,
            time: null,
            notes: item.description,
            completed: item.is_completed || false,
            createdAt: item.created_at,
            completedAt: item.completed_at ? new Date(item.completed_at).getTime() : null,
            completionNotes: null,
            priority: item.priority
        }));

        console.log('✅ Bulk employee todos updated successfully:', transformedTodos.length);
        return transformedTodos;
    } catch (err) {
        console.error('❌ Unexpected error in bulkUpdateEmployeeTodos:', err);
        throw err;
    }
};
