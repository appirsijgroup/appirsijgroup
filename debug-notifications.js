// Paste ini di Console browser saat login sebagai Admin
// Script untuk debug apa yang dikirim ke handleUpdateProfile

// 1. Hook ke console.log untuk capture logs
const originalLog = console.log;
console.log = function(...args) {
    if (args[0] === '🔄 Updating profile for user') {
        debugger; // Breakpoint di sini
        console.log('🔍 BREAKPOINT: Updating profile!');
        console.trace('Stack trace');
    }
    originalLog.apply(console, args);
};

console.log('✅ Debug script activated! Sekarang coba update user (ubah mentor/supervisor)');

// 2. Cek apakah relationFields detection jalan
console.log('📊 Relation fields yang akan di-check:', ['mentorId', 'supervisorId', 'kaUnitId']);

// 3. Test manual notification creation
window.testNotification = async function(userId) {
    const { createNotification } = await import('/src/store/store.ts');
    await createNotification({
        userId: userId || '6000',
        type: 'account_role_changed',
        title: 'TEST MANUAL',
        message: 'Ini test manual notification dari console',
        linkTo: {
            view: 'assignment_letter',
            params: {
                roleName: 'Mentor',
                assignmentType: 'assignment',
                assigneeId: '123'
            }
        }
    });
    console.log('✅ Test notification called!');
};

console.log('💡 Ketik testNotification("userId") di console untuk test manual');
