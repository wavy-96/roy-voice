# Environment Configuration Guide

## 📋 Overview

This project uses a **unified environment variable system** that works seamlessly across:
- **Local Development** (reads from `.env`)
- **Vercel Production** (reads from Vercel environment variables)
- **Any other deployment** (reads from `process.env`)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Application Code (server/index.js, etc.)  │
└──────────────────┬──────────────────────────┘
                   │
                   │ require('../config/env')
                   ↓
┌─────────────────────────────────────────────┐
│         config/env.js                       │
│  (Centralized Configuration Management)     │
└──────────────────┬──────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
  Local Dev              Production/Vercel
      │                         │
┌─────────────┐         ┌──────────────────┐
│   .env      │         │  process.env     │
│   file      │         │  (Vercel Dash)   │
└─────────────┘         └──────────────────┘
```

---

## 🚀 Quick Start

### 1. Local Development Setup

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

### 2. Vercel Production Setup

**Option A: Automated (Recommended)**
```bash
# Run the setup script
./scripts/setup-vercel-env.sh
```

**Option B: Manual**
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add each variable from `.env`
3. Select "Production" and "Preview" environments
4. Save

### 3. Deploy

```bash
vercel --prod
```

---

## 📝 Required Environment Variables

### Supabase (REQUIRED)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Authentication (REQUIRED)
```bash
JWT_SECRET=your-random-secret-here  # Generate with: openssl rand -base64 32
CONSOLE_USERNAME=admin
CONSOLE_PASSWORD=your-secure-password
```

### API Configuration (AUTO-CONFIGURED)
```bash
PUBLIC_BASE_URL=https://your-domain.vercel.app  # Set after first deploy
PORT=3002  # Only for local dev
```

### Optional
```bash
RETELL_API_KEY=your_retell_api_key  # If using direct Retell integration
NODE_ENV=production  # Auto-set by Vercel
```

---

## 🔒 Security Best Practices

### ✅ DO
- ✅ Keep `.env` in `.gitignore` (already configured)
- ✅ Use strong, random secrets for `JWT_SECRET`
- ✅ Store production credentials only in Vercel Dashboard
- ✅ Use different credentials for development vs production
- ✅ Rotate secrets regularly

### ❌ DON'T
- ❌ Never commit `.env` to git
- ❌ Never hardcode secrets in code
- ❌ Never share `.env` file publicly
- ❌ Never use weak passwords

---

## 🛠️ Configuration Management

### Access Configuration in Code

```javascript
const config = require('../config/env');

// Use configuration
console.log(config.supabase.url);
console.log(config.publicBaseUrl);
console.log(config.isProduction);  // boolean
console.log(config.isVercel);      // boolean
```

### Available Config Properties

```javascript
{
  // Environment
  nodeEnv: 'development' | 'production',
  port: 3002,
  
  // Supabase
  supabase: {
    url: string,
    anonKey: string,
    serviceRoleKey: string
  },
  
  // JWT
  jwtSecret: string,
  
  // Console Auth
  console: {
    username: string,
    password: string
  },
  
  // API
  publicBaseUrl: string,
  
  // Retell
  retellApiKey: string | undefined,
  
  // Computed
  isProduction: boolean,
  isDevelopment: boolean,
  isVercel: boolean
}
```

---

## 🧪 Testing Configuration

### Local Testing
```bash
# Test that config loads correctly
node -e "const config = require('./config/env'); console.log('Config loaded:', Object.keys(config))"

# Test server starts with current config
npm start
```

### Production Testing
```bash
# After deploying, test the health endpoint
curl https://your-domain.vercel.app/health

# Should return:
# {"status":"ok","timestamp":"2025-10-03T..."}
```

---

## 🔧 Troubleshooting

### Issue: "Missing required environment variables"

**Cause**: Required env vars not set

**Solution**:
```bash
# Check what's missing
node -e "require('./config/env')"

# Add missing variables to .env (local) or Vercel dashboard (production)
```

### Issue: "FUNCTION_INVOCATION_FAILED" on Vercel

**Cause**: Environment variables not set in Vercel

**Solution**:
```bash
# Run the setup script
./scripts/setup-vercel-env.sh

# Or add manually in Vercel dashboard
```

### Issue: Config works locally but not on Vercel

**Cause**: Variables not added to Vercel or wrong environment selected

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Ensure all variables are set for **"Production"** environment
3. Redeploy: `vercel --prod`

### Issue: "Cannot find module '../config/env'"

**Cause**: Wrong relative path or config directory doesn't exist

**Solution**:
```bash
# Ensure config directory exists
mkdir -p config

# Verify file exists
ls -la config/env.js
```

---

## 📦 Deployment Checklist

### Before First Deploy
- [ ] `.env.example` exists with all required variables documented
- [ ] `.env` exists locally with your development values
- [ ] `.env` is in `.gitignore`
- [ ] `config/env.js` exists and validates required variables

### Deploying to Vercel
- [ ] Run `./scripts/setup-vercel-env.sh` OR manually add env vars in dashboard
- [ ] Deploy: `vercel --prod`
- [ ] Note the production URL
- [ ] Update `PUBLIC_BASE_URL` in Vercel with the production URL
- [ ] Redeploy: `vercel --prod`
- [ ] Test: `curl https://your-domain.vercel.app/health`

### After Deployment
- [ ] Health endpoint returns 200
- [ ] API endpoints work correctly
- [ ] Webhooks can be received
- [ ] Authentication works
- [ ] Database queries execute successfully

---

## 🔄 Updating Environment Variables

### Local Development
```bash
# Edit .env
nano .env

# Restart server
npm start
```

### Vercel Production
```bash
# Option 1: Use CLI
vercel env add VARIABLE_NAME production
# Enter the value when prompted

# Option 2: Use Dashboard
# Go to Vercel → Settings → Environment Variables → Edit

# Then redeploy
vercel --prod
```

---

## 📚 Additional Resources

- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Supabase Keys**: https://supabase.com/docs/guides/api/api-keys
- **dotenv Documentation**: https://github.com/motdotla/dotenv

---

## 🎯 Summary

**Key Benefits of This Setup:**
✅ Single source of truth (`.env.example`)  
✅ Works in all environments (local, Vercel, Docker, etc.)  
✅ Validates required variables on startup  
✅ Centralized configuration management  
✅ Type-safe access to config values  
✅ Easy to audit and update  
✅ Production-ready security  

**Remember:**
- `.env` = Local development only
- Vercel Dashboard = Production environment variables
- `config/env.js` = Unified interface for both

