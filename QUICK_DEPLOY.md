# 🚀 Quick Deployment Guide

## One-Command Deployment

```bash
# 1. Push to GitHub
git commit -m "Initial commit: Roy Voice Multi-Tenant CRM v2.9"
git remote add origin https://github.com/YOUR_USERNAME/roy-voice.git
git push -u origin main

# 2. Deploy Backend
vercel --prod

# 3. Deploy Frontend
cd client && vercel --prod
```

---

## Step-by-Step Commands

### **1. Initialize Git & Push to GitHub**

```bash
cd /Users/tamimsangrar/Desktop/roy-voice

# Commit all files
git add -A
git commit -m "Initial commit: Roy Voice Multi-Tenant CRM v2.9

Features:
- Multi-tenant architecture with schema isolation
- Agent management with webhook validation
- Billable vs test call tracking
- Revenue calculation
- Rate limiting and security hardening
- Comprehensive documentation
- Per-agent Retell configuration"

# Create GitHub repo (Option A: GitHub CLI)
gh repo create roy-voice --public --source=. --remote=origin --push

# OR (Option B: Manual)
# 1. Go to https://github.com/new
# 2. Create repo named 'roy-voice'
# 3. Run these commands:
git remote add origin https://github.com/YOUR_USERNAME/roy-voice.git
git branch -M main
git push -u origin main
```

### **2. Deploy Backend**

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login
vercel login

# Setup environment variables (automated)
chmod +x scripts/setup-vercel-env.sh
./scripts/setup-vercel-env.sh

# Deploy
vercel --prod

# Note the URL: https://your-backend.vercel.app
```

### **3. Deploy Frontend**

```bash
cd client

# Update .env.production with your backend URL
cat > .env.production << EOF
REACT_APP_SUPABASE_URL=YOUR_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY
REACT_APP_API_URL=https://your-backend.vercel.app
REACT_APP_NAME=Roy Voice CRM
REACT_APP_VERSION=2.9
EOF

# Deploy
vercel --prod

# Note the URL: https://your-frontend.vercel.app
```

### **4. Update CORS**

```bash
cd ..

# Edit server/index.js and add your frontend URL to CORS
# Then commit and push
git add server/index.js
git commit -m "Update CORS for production frontend"
git push

# Backend will auto-redeploy
```

### **5. Test Deployment**

```bash
# Test backend
curl https://your-backend.vercel.app/health

# Test frontend
open https://your-frontend.vercel.app
```

---

## Environment Variables to Set

### **Backend (via scripts/setup-vercel-env.sh or manually)**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
CONSOLE_USERNAME
CONSOLE_PASSWORD
PUBLIC_BASE_URL
```

### **Frontend (via Vercel dashboard or CLI)**
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_API_URL
REACT_APP_NAME
REACT_APP_VERSION
```

---

## Post-Deployment

1. ✅ Test login at frontend URL
2. ✅ Verify backend health endpoint
3. ✅ Update Retell agent webhooks
4. ✅ Create production organizations
5. ✅ Invite team members

---

## Rollback

```bash
# List deployments
vercel ls

# Rollback if needed
vercel rollback
```

---

## Support

- Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Troubleshooting: [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)

---

**Total Deployment Time**: ~10 minutes  
**Prerequisites**: GitHub account, Vercel account, Supabase project

