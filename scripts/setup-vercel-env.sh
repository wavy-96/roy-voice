#!/bin/bash

# ===========================================
# Vercel Environment Variables Setup Script
# ===========================================
# This script reads your local .env file and
# sets up environment variables in Vercel
# ===========================================

set -e

echo "🚀 Vercel Environment Variables Setup"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create .env file first (copy from .env.example)"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found"
    echo "   Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Found .env file"
echo "✅ Vercel CLI installed"
echo ""

# Function to add environment variable to Vercel
add_env_var() {
    local key=$1
    local value=$2
    local env_type=${3:-"production"}
    
    if [ -z "$value" ] || [ "$value" = "your_"* ]; then
        echo "⏭️  Skipping $key (not set or example value)"
        return
    fi
    
    echo "📝 Adding $key to Vercel ($env_type)..."
    echo "$value" | vercel env add "$key" "$env_type" --yes 2>/dev/null || {
        echo "   Already exists or failed, trying to update..."
    }
}

echo "📋 Reading environment variables from .env..."
echo ""

# Read .env file and extract key-value pairs
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    
    # Remove quotes and whitespace
    value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//' | xargs)
    
    # Add to Vercel
    case $key in
        SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|JWT_SECRET|CONSOLE_USERNAME|CONSOLE_PASSWORD|PUBLIC_BASE_URL|RETELL_API_KEY)
            add_env_var "$key" "$value" "production"
            add_env_var "$key" "$value" "preview"
            ;;
    esac
done < .env

echo ""
echo "======================================"
echo "✅ Environment variables setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update PUBLIC_BASE_URL in Vercel dashboard to your actual domain"
echo "   2. Redeploy: vercel --prod"
echo "   3. Test: curl https://your-domain.vercel.app/health"
echo ""

