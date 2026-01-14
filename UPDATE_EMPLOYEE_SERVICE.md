# Update employeeService.ts createEmployee function

Replace the createEmployee function in src/services/employeeService.ts (starting at line 229) with this updated version:

```typescript
// Create new employee
export const createEmployee = async (employee: Employee): Promise<Employee> => {
    // Convert camelCase to snake_case for database
    const dbEmployee = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        password: employee.password,
        last_visit_date: employee.lastVisitDate,
        role: employee.role,
        is_active: employee.isActive,
        notification_enabled: employee.notificationEnabled,
        profile_picture: employee.profilePicture,
        monthly_activities: employee.monthlyActivities,
        activated_months: employee.activatedMonths,
        ka_unit_id: employee.kaUnitId,
        supervisor_id: employee.supervisorId,
        mentor_id: employee.mentorId,
        dirut_id: employee.dirutId,
        can_be_mentor: employee.canBeMentor,
        can_be_supervisor: employee.canBeSupervisor,
        can_be_ka_unit: employee.canBeKaUnit,
        can_be_dirut: employee.canBeDirut,
        functional_roles: employee.functionalRoles as string[] | null,
        manager_scope: employee.managerScope ? JSON.stringify(employee.managerScope) : null,
        location_id: employee.locationId,
        location_name: employee.locationName,
        reading_history: employee.readingHistory,
        quran_reading_history: employee.quranReadingHistory,
        todo_list: employee.todoList,
        signature: employee.signature,
        last_announcement_read_timestamp: employee.lastAnnouncementReadTimestamp,
        managed_hospital_ids: employee.managedHospitalIds,
        achievements: employee.achievements,
        must_change_password: employee.mustChangePassword,
        hospital_id: employee.hospitalId,
        unit: employee.unit,
        bagian: employee.bagian,
        profession_category: employee.professionCategory,
        profession: employee.profession,
        gender: employee.gender,
    };

    console.log('📤 Sending to Supabase via API:', {
        id: dbEmployee.id,
        name: dbEmployee.name,
        email: dbEmployee.email,
        role: dbEmployee.role,
        gender: dbEmployee.gender,
        gender_type: typeof dbEmployee.gender,
        unit: dbEmployee.unit,
        bagian: dbEmployee.bagian,
        profession_category: dbEmployee.profession_category,
        profession: dbEmployee.profession,
        hospital_id: dbEmployee.hospital_id
    });

    // Get the session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('No active session found. Please log in again.');
    }

    // Use the API route to create employee (bypasses RLS using service role)
    const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(dbEmployee)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API insert error:', errorData);
        throw new Error(errorData.error || 'Failed to create employee');
    }

    const { data } = await response.json();

    console.log('✅ Successfully created employee in Supabase via API:', data);
    return convertToCamelCase(data);
};
```

## What Changed:
1. Instead of directly inserting into Supabase (which triggers RLS), it now calls the `/api/admin/employees` API route
2. The API route uses the service role key to bypass RLS
3. It checks if the user is an admin before allowing the creation
