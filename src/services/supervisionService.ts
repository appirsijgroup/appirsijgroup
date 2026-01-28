/**
 * Service for managing supervision relationships (Supervisor, Ka.Unit, Manager)
 */

export const manageSupervisionTeam = async (
    supervisorId: string,
    employeeIds: string[],
    action: 'add' | 'remove',
    role: 'supervisor' | 'kaunit' | 'manager'
): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch('/api/supervision/manage-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supervisorId, employeeIds, action, role }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to manage team');
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error managing supervision team:', error);
        return { success: false, error: error.message };
    }
};
