@echo off
REM ============================================================================
REM AUTOMATED UID MIGRATION SCRIPT (Windows)
REM ============================================================================
REM This script automates the UID migration process using Supabase CLI
REM Prerequisites: Supabase CLI installed and logged in
REM ============================================================================

echo ╔════════════════════════════════════════════════════════════════╗
echo ║          AUTOMATED UID MIGRATION SCRIPT                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI is not installed!
    echo Install it from: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo ✅ Supabase CLI found
echo.

REM ============================================================================
REM STEP 1: PREPARE UID COLUMN
REM ============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  STEP 1: PREPARING UID COLUMN                                  ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
pause
supabase db execute --file supabase-migrations/01-safe-prepare-uid-column.sql

echo.
echo ✅ STEP 1 completed!
echo.

REM ============================================================================
REM STEP 2: CREATE MISSING AUTH USERS
REM ============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  STEP 2: CREATING MISSING AUTH USERS                          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
pause

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo ⚠️  node_modules not found. Installing dependencies...
    call npm install @supabase/supabase-js dotenv
)

node scripts/create-missing-auth-users.js

echo.
echo ✅ STEP 2 completed!
echo.

REM ============================================================================
REM STEP 3: VERIFY UID POPULATION
REM ============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  STEP 3: VERIFYING UID POPULATION                              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
pause
supabase db execute --file supabase-migrations/02-verify-uid-population.sql

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Please check the output above.
echo.
echo ❓ Do all employees have UID? (100%% completion)
echo.
pause

REM ============================================================================
REM STEP 4: TRANSFER PRIMARY KEY
REM ============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  STEP 4: TRANSFERRING PRIMARY KEY (FINAL STEP)                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⚠️  WARNING: This is a critical step! Make sure all employees have UID!
echo.
pause
supabase db execute --file supabase-migrations/03-transfer-primary-key-to-uid.sql

echo.
echo ✅ STEP 4 completed!
echo.

REM ============================================================================
REM COMPLETION
REM ============================================================================
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           MIGRATION COMPLETE! 🎉                               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo NEXT STEPS:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 1. Update application code:
echo    - employee.id ^> employee.nip
echo    - employee.auth_user_id ^> employee.uid
echo.
echo 2. Test all features:
echo    - Login with email
echo    - Login with NIP
echo    - Profile management
echo    - Admin functions
echo.
echo 3. Update RLS policies:
echo    - Change 'id' references to 'uid'
echo.
echo 4. Deploy changes
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ✨ Migration successful!
echo.
pause
