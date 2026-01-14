#!/bin/bash
# Cleanup unused files from debugging session
# Run this script to remove temporary files created during troubleshooting

echo "🧹 Cleaning up unused files..."

# Temporary SQL files in supabase root (these were for debugging)
echo "Removing temporary SQL files..."
rm -f supabase/check-auth-setup.sql
rm -f supabase/create_attendance_records_simple.sql
rm -f supabase/create-admin-service-function.sql
rm -f supabase/diagnose-auth-issue.sql
rm -f supabase/diagnose-constraint.sql
rm -f supabase/DISABLE_RLS_AND_FIX.sql
rm -f supabase/disable-rls.sql
rm -f supabase/enable-rls.sql
rm -f supabase/fix_announcements_rls.sql
rm -f supabase/FIX_RLS_COMPLETE.sql
rm -f supabase/FIX_RLS_COMPLETE_SOLUTION.sql
rm -f supabase/fix-employees-insert-comprehensive.sql
rm -f supabase/fix-employees-insert-simple.sql
rm -f supabase/fix-gender-simple.sql
rm -f supabase/fix-rls-policy-correct.sql
rm -f supabase/fix-rls-simple.sql
rm -f supabase/QUICK_FIX_GENDER.sql
rm -f supabase/QUICK_FIX_RLS.sql
rm -f supabase/setup-default-hospital.sql

# Old/unnecessary markdown files
echo "Removing old documentation files..."
rm -f MISSING_FIELDS_ANALYSIS.md
rm -f FIX_NOTIFICATION_READ_STATUS.md
rm -f NOTIFICATION_SOLUTION_README.md
rm -f SECURITY_FIXES_SUMMARY.md

echo "✅ Cleanup complete!"
echo ""
echo "Files removed:"
echo "  - 18 temporary SQL files"
echo "  - 4 old markdown files"
echo ""
echo "Files kept for reference:"
echo "  - RLS_SECURITY_SOLUTION.md"
echo "  - UPDATE_EMPLOYEE_SERVICE.md"
echo "  - UPDATE_USER_MODAL_LOADING.md"
echo "  - README.md"
echo "  - supabase/schema.sql"
echo "  - supabase/migrations/*"
