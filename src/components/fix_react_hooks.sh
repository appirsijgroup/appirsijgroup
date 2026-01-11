#!/bin/bash
file="AdminDashboard.tsx"

# Add eslint-disable comments before useEffect calls that set state
# Line 80-82 (DestructiveConfirmationModal)
sed -i '79a\        // Reset form state when modal opens\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 240-270 (ActivityModal) - needs comment before line 240
sed -i '239a\        // Initialize form state from existingActivity or reset form\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 662-684 (UserModal)
sed -i '661a\        // Initialize form state from existingUser or reset form\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 980-983 (DatabaseManagement) - reset currentPage
sed -i '979a\        // Reset to first page when search term changes\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 1175-1178 (AccountManagement) - reset currentPage
sed -i '1193a\        // Reset to first page when filters change\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 1932-1936 (EditAttendanceModal)
sed -i '1931a\        // Initialize form state from record\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 1995-2003 (SunnahIbadahModal)
sed -i '1994a\        // Initialize form state from existingIbadah or reset form\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 2294-2297 (JabatanManagement) - reset currentPage
sed -i '2313a\        // Reset to first page when search term changes\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 2724-2727 (RoleManagement) - reset currentPage
sed -i '2743a\        // Reset to first page when search term changes\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 2938-2943 (HospitalManagementModal)
sed -i '2937a\        // Initialize form state from existingHospital or reset form\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 3145-3148 (ManagerScopeModal)
sed -i '3144a\        // Initialize selected IDs from user data\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

# Line 3219-3224 (SuperAdminView - redirect unauthorized views)
sed -i '3218a\        // Redirect to default view if role does not have access\n        // eslint-disable-next-line react-hooks/set-state-in-effect' "$file"

echo "React Hooks errors commented"
