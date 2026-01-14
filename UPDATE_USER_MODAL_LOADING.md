# Update UserModal with Loading State

## Changes needed in src/components/AdminDashboard.tsx

### 1. Update the UserModal state (around line 655-669):

ADD this new state after line 668:
```typescript
const [generatedPassword, setGeneratedPassword] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false); // NEW LINE
```

### 2. Update handleSubmit function (around line 714-748):

REPLACE the entire handleSubmit function with:
```typescript
const handleSubmit = async () => {
    if (!id || !name || !email || !unit || !profession || !bagian || !role) {
        setError('Semua field wajib diisi.');
        return;
    }

    // Clear error and start submitting
    setError('');
    setIsSubmitting(true);

    try {
        // Generate password only for new users
        const newPassword = existingUser ? undefined : generateSecurePassword();

        const result = await onSave(id, {
            name,
            email,
            password: newPassword || 'password123',
            role,
            unit,
            bagian,
            professionCategory,
            profession,
            gender,
            hospitalId,
            mustChangePassword: !existingUser
        });

        if (result.success) {
            if (!existingUser && newPassword) {
                // Show success modal with generated password
                setGeneratedPassword(newPassword);
                setShowSuccessModal(true);
            } else {
                // Clear form and close modal
                setId('');
                setName('');
                setEmail('');
                setRole('user');
                setUnit('');
                setBagian('');
                setProfessionCategory('NON MEDIS');
                setProfession('');
                setGender('Laki-laki');
                setHospitalId('');
                onClose();
            }
        } else {
            setError(result.error || 'Terjadi kesalahan.');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        setError('Terjadi kesalahan saat menyimpan data. Silakan coba lagi.');
    } finally {
        setIsSubmitting(false);
    }
};
```

### 3. Update the Submit Button (around line 829):

REPLACE line 829:
```typescript
<button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
```

WITH:
```typescript
<button
    onClick={handleSubmit}
    disabled={isSubmitting}
    className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
>
    {isSubmitting ? (
        <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Menyimpan...
        </>
    ) : (
        'Simpan'
    )}
</button>
```

### 4. Update Success Modal Close Button (around line 889):

AFTER the success modal closes, also clear the form. Update the onClose handler around line 889:

CHANGE:
```typescript
onClick={() => {
    setShowSuccessModal(false);
    onClose();
}}
```

TO:
```typescript
onClick={() => {
    setShowSuccessModal(false);
    // Clear form
    setId('');
    setName('');
    setEmail('');
    setRole('user');
    setUnit('');
    setBagian('');
    setProfessionCategory('NON MEDIS');
    setProfession('');
    setGender('Laki-laki');
    setHospitalId('');
    setGeneratedPassword('');
    setError('');
    onClose();
}}
```

These changes will:
- ✅ Show loading spinner while submitting
- ✅ Disable the submit button during submission
- ✅ Clear the form properly after successful save
- ✅ Close the modal properly
- ✅ Handle errors gracefully
