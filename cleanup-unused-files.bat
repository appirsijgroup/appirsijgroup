@echo off
REM Cleanup unused files from debugging session
REM Windows version

echo 🧹 Cleaning up unused files...

REM Temporary SQL files in supabase root
echo Removing temporary SQL files...
del /F /Q supabase\check-auth-setup.sql
del /F /Q supabase\create_attendance_records_simple.sql
del /F /Q supabase\create-admin-service-function.sql
del /F /Q supabase\diagnose-auth-issue.sql
del /F /Q supabase\diagnose-constraint.sql
del /F /Q supabase\DISABLE_RLS_AND_FIX.sql
del /F /Q supabase\disable-rls.sql
del /F /Q supabase\enable-rls.sql
del /F /Q supabase\fix_announcements_rls.sql
del /F /Q supabase\FIX_RLS_COMPLETE.sql
del /F /Q supabase\FIX_RLS_COMPLETE_SOLUTION.sql
del /F /Q supabase\fix-employees-insert-comprehensive.sql
del /F /Q supabase\fix-employees-insert-simple.sql
del /F /Q supabase\fix-gender-simple.sql
del /F /Q supabase\fix-rls-policy-correct.sql
del /F /Q supabase\fix-rls-simple.sql
del /F /Q supabase\QUICK_FIX_GENDER.sql
del /F /Q supabase\QUICK_FIX_RLS.sql
del /F /Q supabase\setup-default-hospital.sql

REM Old/unnecessary markdown files
echo Removing old documentation files...
del /F /Q MISSING_FIELDS_ANALYSIS.md
del /F /Q FIX_NOTIFICATION_READ_STATUS.md
del /F /Q NOTIFICATION_SOLUTION_README.md
del /F /Q SECURITY_FIXES_SUMMARY.md

echo ✅ Cleanup complete!
echo.
echo Files removed:
echo   - 18 temporary SQL files
echo   - 4 old markdown files
echo.
echo Files kept for reference:
echo   - RLS_SECURITY_SOLUTION.md
echo   - UPDATE_EMPLOYEE_SERVICE.md
echo   - UPDATE_USER_MODAL_LOADING.md
echo   - README.md
echo   - supabase\schema.sql
echo   - supabase\migrations\*

pause
