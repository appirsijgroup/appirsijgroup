#!/bin/bash

echo "🧹 Cleaning console logs from source code..."

# Find all .ts and .tsx files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | while IFS= read -r -d '' file; do
  echo "Processing: $file"

  # Create temporary file
  tmpfile=$(mktemp)

  # Remove console.log, console.info, console.debug, console.warn
  # This handles multi-line cases by removing from console. to end of statement
  sed -E '/console\.(log|info|debug|warn)\(/,/\);/d' "$file" > "$tmpfile"

  # Replace original file
  mv "$tmpfile" "$file"
done

echo "✅ Console logs removed!"
echo "📦 Building..."

# Build
npm run build

echo "✅ Build complete!"
