#!/bin/bash

# Sentry Setup Script for Roy Voice CRM
# This script helps you set up Sentry error logging

echo "🔧 Setting up Sentry Error Logging for Roy Voice CRM"
echo "=================================================="
echo ""

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from example..."
    cp server/env.example .env
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client/.env.local file from example..."
    cp client/env.example client/.env.local
    echo "✅ Created client/.env.local file"
else
    echo "✅ client/.env.local file already exists"
fi

echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo ""
echo "1. 🌐 Go to https://sentry.io and create a free account"
echo "2. 📦 Create a new project:"
echo "   - Select 'React' for frontend"
echo "   - Select 'Node.js' for backend"
echo "   - Name it 'Roy Voice CRM'"
echo ""
echo "3. 🔑 Get your DSN:"
echo "   - Go to Settings → Projects → Your Project"
echo "   - Click 'Client Keys (DSN)'"
echo "   - Copy the DSN (looks like: https://abc123@o123456.ingest.sentry.io/123456)"
echo ""
echo "4. 📝 Add DSN to your environment files:"
echo "   - Edit .env and add: SENTRY_DSN=your_dsn_here"
echo "   - Edit client/.env.local and add: REACT_APP_SENTRY_DSN=your_dsn_here"
echo ""
echo "5. 🚀 Deploy to production:"
echo "   - Add SENTRY_DSN to Vercel environment variables"
echo "   - Add REACT_APP_SENTRY_DSN to Vercel environment variables"
echo ""
echo "6. ✅ Test error logging:"
echo "   - Visit: https://your-app.vercel.app/api/monitoring/test-error"
echo "   - Check your Sentry dashboard for the error"
echo ""
echo "💡 TIP: You can run this script anytime to see these instructions"
echo ""
echo "🔗 Useful Links:"
echo "   - Sentry Signup: https://sentry.io/signup/"
echo "   - Sentry React Docs: https://docs.sentry.io/platforms/javascript/guides/react/"
echo "   - Sentry Node.js Docs: https://docs.sentry.io/platforms/node/"
echo ""
echo "✨ Happy coding!"
