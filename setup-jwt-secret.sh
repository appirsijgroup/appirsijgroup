#!/bin/bash

# Generate JWT secret and append to .env.local
JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo "🔐 Generating JWT Secret..."
echo ""

if [ -f .env.local ]; then
    # Check if JWT_SECRET already exists
    if grep -q "JWT_SECRET=" .env.local; then
        echo "⚠️  JWT_SECRET already exists in .env.local"
        echo "Skipping..."
    else
        echo "" >> .env.local
        echo "# JWT Secret for session management (generated $(date))" >> .env.local
        echo "JWT_SECRET=$JWT_SECRET" >> .env.local
        echo "✅ JWT_SECRET added to .env.local"
    fi
else
    echo "# JWT Secret for session management (generated $(date))" > .env.local
    echo "JWT_SECRET=$JWT_SECRET" >> .env.local
    echo "✅ Created .env.local with JWT_SECRET"
fi

echo ""
echo "📝 Your JWT_SECRET is: $JWT_SECRET"
echo ""
echo "⚠️  IMPORTANT: Never commit .env.local to git!"
echo ""
