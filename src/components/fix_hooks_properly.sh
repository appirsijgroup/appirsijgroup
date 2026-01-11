#!/bin/bash
file="AdminDashboard.tsx"

# Remove the incorrectly placed eslint-disable comments
sed -i '/\/\/ Reset form state when modal opens$/d' "$file"
sed -i '/\/\/ Initialize form state from existingActivity or reset form$/d' "$file"
sed -i '/\/\/ Initialize form state from existingUser or reset form$/d' "$file"
sed -i '/\/\/ Reset to first page when search term changes$/d' "$file"
sed -i '/\/\/ Reset to first page when filters change$/d' "$file"
sed -i '/\/\/ Initialize form state from record$/d' "$file"
sed -i '/\/\/ Initialize form state from existingIbadah or reset form$/d' "$file"
sed -i '/\/\/ Initialize selected IDs from user data$/d' "$file"
sed -i '/\/\/ Redirect to default view if role does not have access$/d' "$file"

# Add eslint-disable-line comments on actual setState calls
# Line ~84-85 (DestructiveConfirmationModal)
sed -i "84s/^\(                setReason('');\)$/\1  \/\/ eslint-disable-line react-hooks\/set-state-in-effect -- Reset form when modal opens/" "$file"
sed -i "85s/^\(                setError('');\)$/\1  \/\/ eslint-disable-line react-hooks\/set-state-in-effect/" "$file"

echo "Fixed React Hooks comments"
