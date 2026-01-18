#!/bin/bash

# ============================================================================
# AUTOMATED UID MIGRATION SCRIPT
# ============================================================================
# This script automates the UID migration process using Supabase CLI
# Prerequisites: Supabase CLI installed and logged in
# ============================================================================

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          AUTOMATED UID MIGRATION SCRIPT                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed!${NC}"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if logged in
echo ""
echo "🔍 Checking Supabase CLI login status..."
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase CLI!${NC}"
    echo "Run: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Supabase${NC}"
echo ""

# ============================================================================
# STEP 1: PREPARE UID COLUMN
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STEP 1: PREPARING UID COLUMN                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
read -p "Press Enter to run STEP 1 (01-safe-prepare-uid-column.sql)..."

supabase db execute --file supabase-migrations/01-safe-prepare-uid-column.sql

echo ""
echo -e "${GREEN}✅ STEP 1 completed!${NC}"
echo ""

# ============================================================================
# STEP 2: CREATE MISSING AUTH USERS
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STEP 2: CREATING MISSING AUTH USERS                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
read -p "Press Enter to run STEP 2 (create-missing-auth-users.js)..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install @supabase/supabase-js dotenv
fi

node scripts/create-missing-auth-users.js

echo ""
echo -e "${GREEN}✅ STEP 2 completed!${NC}"
echo ""

# ============================================================================
# STEP 3: VERIFY UID POPULATION
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STEP 3: VERIFYING UID POPULATION                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
read -p "Press Enter to run STEP 3 (02-verify-uid-population.sql)..."

supabase db execute --file supabase-migrations/02-verify-uid-population.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please check the output above."
echo ""
echo -e "${YELLOW}❓ Do all employees have UID? (100% completion)${NC}"
echo ""
read -p "If YES, press Enter to continue to STEP 4."
read -p "If NO, press Ctrl+C to stop, then run STEP 2 again."

echo ""

# ============================================================================
# STEP 4: TRANSFER PRIMARY KEY
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  STEP 4: TRANSFERRING PRIMARY KEY (FINAL STEP)                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${RED}⚠️  WARNING: This is a critical step! Make sure all employees have UID!${NC}"
echo ""
read -p "Press Enter to run STEP 4 (03-transfer-primary-key-to-uid.sql)..."

supabase db execute --file supabase-migrations/03-transfer-primary-key-to-uid.sql

echo ""
echo -e "${GREEN}✅ STEP 4 completed!${NC}"
echo ""

# ============================================================================
# COMPLETION
# ============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           MIGRATION COMPLETE! 🎉                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ✅ Update application code:"
echo "   - employee.id → employee.nip"
echo "   - employee.auth_user_id → employee.uid"
echo ""
echo "2. ✅ Test all features:"
echo "   - Login with email"
echo "   - Login with NIP"
echo "   - Profile management"
echo "   - Admin functions"
echo ""
echo "3. ✅ Update RLS policies:"
echo "   - Change 'id' references to 'uid'"
echo ""
echo "4. ✅ Deploy changes"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✨ Migration successful!${NC}"
echo ""
