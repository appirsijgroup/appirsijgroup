#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const mainLayoutPath = path.join(__dirname, 'src/components/MainLayoutShell.tsx');

console.log('🔧 Memperbaiki MainLayoutShell.tsx untuk blocking logic...');

let content = fs.readFileSync(mainLayoutPath, 'utf8');

// 1. Tambahkan import untuk MutabaahContext dan LockClosedIcon
if (!content.includes("import { useMutabaah }")) {
  content = content.replace(
    "import { useUIStore, useAppDataStore, useAnnouncementStore, useNotificationStore } from '@/store/store'; // Ensure path is correct",
    "import { useUIStore, useAppDataStore, useAnnouncementStore, useNotificationStore } from '@/store/store'; // Ensure path is correct\nimport { useMutabaah } from '@/contexts/MutabaahContext';"
  );

  // Tambahkan LockClosedIcon ke icons import
  content = content.replace(
    "    AdminIcon\n} from './Icons';",
    "    AdminIcon,\n    LockClosedIcon\n} from './Icons';"
  );
}

// 2. Tambahkan useMutabaah hook di component
if (!content.includes("const { isCurrentMonthActivated, isLoading: isMutabaahLoading } = useMutabaah()")) {
  content = content.replace(
    "    const { notifications } = useNotificationStore();",
    "    const { notifications } = useNotificationStore();\n    const { isCurrentMonthActivated, isLoading: isMutabaahLoading } = useMutabaah();"
  );
}

// 3. Tambahkan Mutaba'ah Blocking Logic setelah filteredNavItems
if (!content.includes("// --- Mutaba'ah Blocking Logic ---")) {
  const blockingLogic = `
    // --- Mutaba'ah Blocking Logic ---
    const isMutabaahRequired = useMemo(() => {
        // Allow access to these pages without mutaba'ah activation
        const allowedPaths = [
            '/aktivitas-bulanan', // Lembar Mutaba'ah page itself
            '/profile',           // Profile page
            '/pengumuman',        // Announcements
            '/panduan-doa',       // Guide & Prayers
        ];

        // Admin, binroh, and super-admin are exempt from mutaba'ah requirement
        if (loggedInEmployee &&
            (loggedInEmployee.role === 'admin' ||
             loggedInEmployee.role === 'super-admin' ||
             loggedInEmployee.functionalRoles?.includes('BINROH'))) {
            return false;
        }

        // Check if current path is allowed
        const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));

        return !isAllowedPath && !isCurrentMonthActivated;
    }, [pathname, isCurrentMonthActivated, loggedInEmployee]);

    // Redirect to aktivitas-bulanan if mutaba'ah is not activated
    useEffect(() => {
        if (isHydrated && loggedInEmployee && !isMutabaahLoading && isMutabaahRequired) {
            // Show toast notification
            addToast({
                id: \`mutabaah-required-\${Date.now()}\`,
                type: 'error',
                title: 'Lembar Mutaba\\'ah Belum Diaktifkan',
                message: 'Silakan aktifkan lembar mutaba\\'ah bulan ini untuk mengakses fitur lainnya.',
            });
            // Redirect to aktivitas-bulanan page
            router.push('/aktivitas-bulanan');
        }
    }, [isHydrated, loggedInEmployee, isMutabaahLoading, isMutabaahRequired, router, addToast]);

`;

  content = content.replace(
    "    }, [loggedInEmployee]);\n",
    `    }, [loggedInEmployee]);${blockingLogic}`
  );
}

// 4. Update loading check
content = content.replace(
  "    if (!isHydrated || !loggedInEmployee) {",
  "    if (!isHydrated || !loggedInEmployee || isMutabaahLoading) {"
);

// 5. Tambahkan warning banner setelah Header
if (!content.includes("{isMutabaahRequired && pathname !== '/aktivitas-bulanan' && (")) {
  content = content.replace(
    "                />\n                <main",
    "                />\n\n                {/* Warning Banner when mutaba'ah is not activated */}\n                {isMutabaahRequired && pathname !== '/aktivitas-bulanan' && (\n                    <div className=\"bg-red-500/20 border-b border-red-500/30 px-4 py-3 flex items-center justify-center gap-3\">\n                        <LockClosedIcon className=\"w-5 h-5 text-red-300\" />\n                        <p className=\"text-red-200 text-sm font-semibold\">\n                            Lembar Mutaba'ah belum diaktifkan. Silakan aktifkan untuk mengakses fitur lainnya.\n                        </p>\n                    </div>\n                )}\n\n                <main"
  );
}

fs.writeFileSync(mainLayoutPath, content, 'utf8');

console.log('✅ MainLayoutShell.tsx berhasil diperbaiki!');
console.log('');
console.log('Perubahan yang dibuat:');
console.log('1. ✅ Import MutabaahContext dan LockClosedIcon');
console.log('2. ✅ Tambahkan useMutabaah hook');
console.log('3. ✅ Implementasi blocking logic untuk menu');
console.log('4. ✅ Redirect otomatis ke halaman aktivitas-bulanan');
console.log('5. ✅ Warning banner visual');
console.log('6. ✅ Loading state untuk mutabaah data');
