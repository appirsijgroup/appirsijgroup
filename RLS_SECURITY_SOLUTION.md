# RLS Security Solution - Production Ready

## Current Status: ⚠️ INSECURE
- RLS is DISABLED on employees table
- Anyone with anon key can INSERT/UPDATE/DELETE employees
- **NOT SAFE for production**

## Solution: Use Service Role Key with API Route

### Step 1: Add Service Role Key to Environment

Add to `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get the key from:**
Supabase Dashboard → Settings → API → service_role (secret)

⚠️ **IMPORTANT**: Never commit this key to git!

### Step 2: API Route Already Created ✅

File: `src/app/api/admin/employees/route.ts`

This route:
- ✅ Verifies user is authenticated
- ✅ Checks if user is admin/super-admin
- ✅ Uses service role key to bypass RLS
- ✅ Only allows admins to create employees

### Step 3: Update employeeService.ts

Update the `createEmployee` function (lines 229-305 in `src/services/employeeService.ts`):

See instructions in: `UPDATE_EMPLOYEE_SERVICE.md`

### Step 4: Re-enable RLS with Secure Policies

After updating the code to use the API route, run this SQL:

```sql
-- Re-enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for all users" ON employees;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;

-- Create proper RLS policies

-- 1. Employees can view their own data
CREATE POLICY "Employees can view own data"
    ON employees FOR SELECT
    TO authenticated
    USING (id = auth.uid()::text);

-- 2. Admins can view all employees
CREATE POLICY "Admins can view all employees"
    ON employees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin', 'owner')
        )
    );

-- 3. Employees can update their own data
CREATE POLICY "Employees can update own data"
    ON employees FOR UPDATE
    TO authenticated
    USING (id = auth.uid()::text)
    WITH CHECK (id = auth.uid()::text);

-- 4. Admins can update any employee
CREATE POLICY "Admins can update any employee"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin', 'owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('admin', 'super-admin', 'owner')
        )
    );

-- 5. Admins can delete employees
CREATE POLICY "Admins can delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = auth.uid()::text
            AND role IN ('super-admin', 'owner')
        )
    );

-- 6. INSERT is handled by API route (service role), no policy needed
```

## How It Works

### Before (Insecure):
```
Browser → Direct Supabase Insert → RLS blocks it ❌
```

### After (Secure):
```
Browser → API Route (/api/admin/employees)
    → Server verifies admin ✅
    → Service role key bypasses RLS ✅
    → Employee created safely ✅
```

## Testing

1. Test with admin account: Should work ✅
2. Test with regular user account: Should fail with 403 ✅
3. Test without authentication: Should fail with 401 ✅

## Security Benefits

✅ Only admins can create employees
✅ RLS enabled for all other operations
✅ Service role key never exposed to client
✅ Server-side verification of admin role
✅ Proper authentication checks

## Migration Checklist

- [ ] Add SUPABASE_SERVICE_ROLE_KEY to .env.local
- [ ] Update employeeService.ts createEmployee function
- [ ] Test creating employee with admin account
- [ ] Test creating employee with regular user (should fail)
- [ ] Run RLS SQL to enable secure policies
- [ ] Verify all operations work correctly
- [ ] Deploy to production

## Development vs Production

### Development (Current):
- RLS disabled for easy testing
- OK for local development
- Not secure but acceptable for dev

### Production (Required):
- RLS enabled with proper policies
- API route uses service role key
- All operations properly secured
- **REQUIRED for production deployment**
