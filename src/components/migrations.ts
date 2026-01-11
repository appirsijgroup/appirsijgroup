import { type UserDataV2 } from '../types';

export const migrateAndInitializeData = (usersData: Record<string, any>): Record<string, UserDataV2> => {
    const allUsersData = JSON.parse(JSON.stringify(usersData)); // Deep copy to avoid mutation

    // Initialize or migrate users
    Object.keys(allUsersData).forEach(id => {
        const currentUserData = allUsersData[id];
        if (!currentUserData.employee) {
            // Data is corrupt, delete it to be re-initialized
            delete allUsersData[id];
            return;
        }

        const currentEmployee = currentUserData.employee;

        // --- MIGRATION LOGIC for monthlyActivities ---
        // Check if monthlyActivities exists and if it has the old format (e.g., an entry has a 'value' property)
        const firstMonthKey = currentUserData.employee.monthlyActivities ? Object.keys(currentUserData.employee.monthlyActivities)[0] : null;
        if (firstMonthKey) {
            const firstEntry = currentUserData.employee.monthlyActivities[firstMonthKey];
            const firstActivityKey = Object.keys(firstEntry)[0];
            // If the structure is { 'month': { 'activityId': { value: ... } } }, it's the old format.
            if (firstActivityKey && typeof firstEntry[firstActivityKey] === 'object' && firstEntry[firstActivityKey] !== null && 'value' in firstEntry[firstActivityKey]) {
                console.log(`Migrating monthlyActivities for user ${id}. Resetting old data.`);
                currentUserData.employee.monthlyActivities = {};
            }
        }
        
        // --- MIGRATION LOGIC for new relationship fields ---
        if (typeof currentUserData.employee.kaUnitId === 'undefined') {
            currentUserData.employee.kaUnitId = undefined;
        }
        if (typeof currentUserData.employee.supervisorId === 'undefined') {
            currentUserData.employee.supervisorId = undefined;
        }
        if (typeof currentUserData.employee.mentorId === 'undefined') {
            currentUserData.employee.mentorId = undefined;
        }
        if (typeof currentUserData.employee.dirutId === 'undefined') {
            currentUserData.employee.dirutId = undefined;
        }
        if (typeof currentUserData.employee.canBeMentor === 'undefined') {
            currentUserData.employee.canBeMentor = false;
        }
        if (typeof currentUserData.employee.canBeSupervisor === 'undefined') {
            currentUserData.employee.canBeSupervisor = false;
        }
        if (typeof currentUserData.employee.canBeDirut === 'undefined') {
            currentUserData.employee.canBeDirut = false;
        }
        if (typeof currentUserData.employee.functionalRoles === 'undefined') {
            currentUserData.employee.functionalRoles = [];
        }
        // --- MIGRATION LOGIC from managedBagian to managerScope ---
        if (typeof currentUserData.employee.managedBagian !== 'undefined') {
            // If old field exists, migrate it to the new structure and delete the old one
            currentUserData.employee.managerScope = {
                managedBagians: [currentUserData.employee.managedBagian],
                managedUnits: [],
                additionalManagedUserIds: [],
            };
            delete currentUserData.employee.managedBagian;
        } else if (typeof currentUserData.employee.managerScope === 'undefined') {
            // If neither old nor new field exists, initialize the new one
            currentUserData.employee.managerScope = undefined;
        }


        // --- MIGRATION for location fields
        if (typeof currentUserData.employee.locationId === 'undefined') {
            currentUserData.employee.locationId = '1301'; // Default: Jakarta Pusat
            currentUserData.employee.locationName = 'KOTA JAKARTA PUSAT';
        }
        
        // --- MIGRATION from 'isAdmin' to 'role' ---
        // @ts-ignore - isAdmin is deprecated, migrating to role
        if (typeof currentUserData.employee.isAdmin !== 'undefined') {
            // @ts-ignore - isAdmin is deprecated
            if (currentUserData.employee.isAdmin) {
                // @ts-ignore - role property may not exist on old Employee type
                currentUserData.employee.role = currentUserData.employee.id === '6000' ? 'super-admin' : 'admin';
            } else {
                currentUserData.employee.role = 'user';
            }
             // @ts-ignore - deleting deprecated property
            delete currentUserData.employee.isAdmin;
        }
        
        // --- MIGRATION to remove 'mentor' role ---
        if (currentUserData.employee.role === 'mentor') {
            currentUserData.employee.role = 'user';
        }

        // --- MIGRATION for monthly activation ---
        if (typeof currentUserData.employee.activatedMonths === 'undefined') {
            currentUserData.employee.activatedMonths = [];
        }

        // --- MIGRATION for profession -> professionCategory + profession
        // @ts-ignore - profession property may not exist on old Employee type
        if (currentEmployee.profession && !currentEmployee.professionCategory) {
            // @ts-ignore - accessing deprecated profession property
            const prof = currentEmployee.profession;
            if (prof === 'MEDIS' || prof === 'NON MEDIS') {
                currentEmployee.professionCategory = prof;
                currentEmployee.profession = prof; // Default specific profession to be the category
            }
        }
        // --- MIGRATION for bagian ---
        if (typeof currentEmployee.bagian === 'undefined') {
            const unit = currentEmployee.unit?.toLowerCase() || '';
            if (unit.includes('rawat inap')) {
                currentEmployee.bagian = 'Rawat Inap';
            } else if (unit.includes('rawat jalan')) {
                currentEmployee.bagian = 'Rawat Jalan';
            } else if (unit.includes('direksi') || unit.includes('humas')) {
                currentEmployee.bagian = 'Perkantoran & Umum';
            } else {
                currentEmployee.bagian = 'Tanpa Bagian';
            }
        }

        // Ensure fields exist
        if (!currentEmployee.professionCategory) {
            currentEmployee.professionCategory = 'NON MEDIS';
        }
        if (!currentEmployee.profession) {
            currentEmployee.profession = currentEmployee.professionCategory;
        }
        if (!currentEmployee.readingHistory) {
            currentEmployee.readingHistory = [];
        }
        if (!currentEmployee.quranReadingHistory) {
            currentEmployee.quranReadingHistory = [];
        }
        if (typeof currentEmployee.signature === 'undefined') {
            currentEmployee.signature = null;
        }
        if (typeof currentEmployee.lastAnnouncementReadTimestamp === 'undefined') {
            currentEmployee.lastAnnouncementReadTimestamp = 0;
        }
         if (typeof currentEmployee.hospitalId === 'undefined') {
            currentEmployee.hospitalId = undefined;
        }
        if (typeof currentEmployee.managedHospitalIds === 'undefined') {
            currentEmployee.managedHospitalIds = [];
        }
    });

    return allUsersData;
};
