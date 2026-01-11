import bcrypt from 'bcryptjs';
import { EMPLOYEES } from './employees';
import type { Employee, Attendance } from '@/types';
import { migrateAndInitializeData } from '@/components/migrations';

const SALT_ROUNDS = 10;

export const initializeUsersFromEmployees = (): Record<string, {
    employee: Employee;
    attendance: Attendance;
    history: Record<string, Attendance>;
}> => {
    const allUsersData: Record<string, any> = {};

    // Initialize users from EMPLOYEES data
    Object.entries(EMPLOYEES).forEach(([id, rawEmployee]) => {
        const hashedPassword = bcrypt.hashSync(id, SALT_ROUNDS);

        const employee: Employee = {
            id,
            email: `${id}@example.com`, // Default email
            password: hashedPassword,
            lastVisitDate: new Date().toISOString().split('T')[0], // Default to today
            role: 'user', // Default role, will be overridden for 6000
            isActive: true,
            notificationEnabled: true, // Default to true
            profilePicture: null, // Default to null
            monthlyActivities: {},
            activatedMonths: [],
            readingHistory: [],
            quranReadingHistory: [],
            signature: null,
            lastAnnouncementReadTimestamp: 0,
            canBeMentor: false,
            canBeSupervisor: false,
            canBeDirut: false,
            functionalRoles: [],
            managerScope: undefined,
            locationId: '1301',
            locationName: 'KOTA JAKARTA PUSAT',
            managedHospitalIds: [],
            todoList: [],
            mustChangePassword: true, // User must change password on first login
            ...rawEmployee,
        };

        // Set role for user 6000 as super-admin
        if (id === '6000') {
            employee.role = 'super-admin';
        } else {
            employee.role = 'user';
        }

        // Initialize empty attendance
        const attendance: Attendance = {};
        const history: Record<string, Attendance> = {};

        allUsersData[id] = {
            employee,
            attendance,
            history
        };
    });

    // Apply migrations to ensure all fields are up to date
    return migrateAndInitializeData(allUsersData);
};

export const ensureUsersInitialized = (
    currentUsersData: Record<string, any>
): Record<string, any> => {
    // If no users exist, initialize from EMPLOYEES
    if (!currentUsersData || Object.keys(currentUsersData).length === 0) {
        console.log('No users found. Initializing from EMPLOYEES data...');
        return initializeUsersFromEmployees();
    }

    // If users exist but user 6000 is missing, add it
    if (currentUsersData && !currentUsersData['6000']) {
        console.log('Super admin user 6000 not found. Creating...');
        const initializedUsers = initializeUsersFromEmployees();
        return {
            ...currentUsersData,
            '6000': initializedUsers['6000']
        };
    }

    // Otherwise just apply migrations
    return migrateAndInitializeData(currentUsersData);
};
