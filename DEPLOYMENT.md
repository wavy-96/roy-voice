# 🚀 Roy Voice - Complete Deployment Guide

## Overview

This guide walks you through deploying both the backend and frontend to Vercel and setting up a GitHub repository.

---

## 📋 Pre-Deployment Checklist

### **1. Accounts Required**
- [x] GitHub account
- [x] Vercel account (linked to GitHub)
- [x] Supabase account with project set up

### **2. Local Setup Complete**
- [x] Database migrations applied
- [x] Initial organization created
- [x] Super admin user created
- [x] Backend running locally (tested)
- [x] Frontend running locally (tested)

### **3. Configuration Files**
- [x] `.env` configured with Supabase credentials
- [x] `client/.env` configured
- [x] `vercel.json` (backend) exists
- [x] `client/vercel.json` (frontend) exists
- [x] `.gitignore` configured

---

## 🐙 Step 1: Push to GitHub

### **1.1 Create GitHub Repository**

```bash
# Option A: Via GitHub CLI
gh repo create roy-voice --public --source=. --remote=origin

# Option B: Via GitHub website
# 1. Go to github.com/new
# 2. Repository name: roy-voice
# 3. Description: Multi-tenant white-label CRM for Retell AI
# 4. Choose Public or Private
# 5. Do NOT initialize with README (we have one)
# 6. Create repository
```

### **1.2 Initialize Git and Push**

```bash
# Navigate to project root
cd /Users/tamimsangrar/Desktop/roy-voice

# Check git status
git status

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Roy Voice Multi-Tenant CRM v2.9

Features:
- Multi-tenant architecture with schema isolation
- Agent management with webhook validation
- Billable vs test call tracking
- Revenue calculation
- Rate limiting and security hardening
- Comprehensive documentation
- Per-agent Retell configuration"

# Add remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/roy-voice.git

# Push to GitHub
git push -u origin main
```

---

## 🔧 Step 2: Deploy Backend to Vercel

### **2.1 Install Vercel CLI**

```bash
npm install -g vercel
```

### **2.2 Login to Vercel**

```bash
vercel login
```

### **2.3 Configure Environment Variables**

**Option A: Automated Setup**
```bash
cd /Users/tamimsangrar/Desktop/roy-voice
chmod +x scripts/setup-vercel-env.sh
./scripts/setup-vercel-env.sh
```

**Option B: Manual Setup**
```bash
# Add each variable manually
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add CONSOLE_USERNAME production
vercel env add CONSOLE_PASSWORD production
vercel env add PUBLIC_BASE_URL production
```

### **2.4 Deploy Backend**

```bash
# Deploy to production
vercel --prod

# Note the deployment URL (e.g., https://roy-voice.vercel.app)
```

### **2.5 Verify Backend Deployment**

```bash
# Test health endpoint
curl https://your-backend-url.vercel.app/health

# Expected response:
# {"status":"ok","timestamp":"...","environment":"production"}

# Test with authentication (replace with your JWT)
curl https://your-backend-url.vercel.app/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **2.6 Update CORS Settings**

After deploying frontend, update backend CORS in `server/index.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-url.vercel.app'  // Add this
  ],
  credentials: true
}));
```

Redeploy:
```bash
vercel --prod
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### **3.1 Update Frontend Environment Variables**

```bash
cd client

# Create .env.production
cat > .env.production << EOF
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_API_URL=https://your-backend-url.vercel.app
REACT_APP_NAME=Roy Voice CRM
REACT_APP_VERSION=2.9
EOF
```

### **3.2 Test Build Locally**

```bash
npm run build

# Test the build
npx serve -s build
# Visit http://localhost:3000
```

### **3.3 Deploy Frontend**

```bash
# From client directory
vercel --prod

# Note the frontend URL (e.g., https://roy-voice-client.vercel.app)
```

### **3.4 Add Environment Variables to Vercel**

```bash
# In client directory
vercel env add REACT_APP_SUPABASE_URL production
vercel env add REACT_APP_SUPABASE_ANON_KEY production
vercel env add REACT_APP_API_URL production
vercel env add REACT_APP_NAME production
vercel env add REACT_APP_VERSION production
```

### **3.5 Redeploy Frontend**

```bash
vercel --prod
```

---

## 🔗 Step 4: Link Deployments

### **4.1 Update Backend CORS**

In `server/index.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-url.vercel.app'
  ],
  credentials: true
}));
```

Push to GitHub:
```bash
git add server/index.js
git commit -m "Update CORS for production frontend"
git push
```

### **4.2 Update PUBLIC_BASE_URL**

```bash
vercel env add PUBLIC_BASE_URL production
# Enter: https://your-backend-url.vercel.app
```

---

## 🔄 Step 5: Configure Retell Webhooks

### **5.1 Update Existing Agents**

For each existing agent:

```bash
# 1. Get agent webhook URL
curl https://your-backend-url.vercel.app/api/agents/:agentId \
  -H "Authorization: Bearer YOUR_JWT"

# 2. Copy webhook_url from response
# 3. Update in Retell dashboard
```

### **5.2 New Agent Creation**

When creating new agents, the webhook URL will automatically use the production `PUBLIC_BASE_URL`.

---

## ✅ Step 6: Post-Deployment Testing

### **6.1 Test Backend**

```bash
# Health check
curl https://your-backend-url.vercel.app/health

# Login
curl -X POST https://your-backend-url.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Test organizations endpoint
curl https://your-backend-url.vercel.app/api/organizations \
  -H "Authorization: Bearer YOUR_JWT"
```

### **6.2 Test Frontend**

1. Visit `https://your-frontend-url.vercel.app`
2. Login with super admin credentials
3. Check SuperAdminDashboard loads
4. Test organization drill-down
5. Verify metrics and calls load
6. Test user management

### **6.3 Test Webhooks**

```bash
# Test agent webhook (replace with actual agent UUID)
curl -X POST https://your-backend-url.vercel.app/webhooks/agent/your-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "call_id": "test_call_123",
      "agent_id": "agent_abc123"
    }
  }'

# Check agent validation status
curl https://your-backend-url.vercel.app/api/agents/your-uuid/validation \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 🔄 Step 7: Continuous Deployment

### **7.1 Auto-Deploy on Git Push**

Vercel will automatically deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update: description of changes"
git push

# Vercel will automatically:
# 1. Detect the push
# 2. Build the project
# 3. Deploy to production
# 4. Update the URL
```

### **7.2 Deployment Environments**

**Production**: `main` branch
```bash
git push origin main
```

**Preview**: Any other branch
```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
# Creates preview deployment
```

### **7.3 Rollback Deployment**

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback
```

---

## 📊 Step 8: Monitor Deployments

### **8.1 Vercel Dashboard**

Visit [vercel.com/dashboard](https://vercel.com/dashboard):
- View deployment status
- Check build logs
- Monitor performance
- View error logs

### **8.2 Real-time Logs**

```bash
# View backend logs
vercel logs https://your-backend-url.vercel.app --follow

# View frontend logs
vercel logs https://your-frontend-url.vercel.app --follow
```

### **8.3 Health Monitoring**

Set up monitoring:
```bash
# Add to your monitoring service
curl -f https://your-backend-url.vercel.app/health || exit 1
```

---

## 🔐 Step 9: Security Hardening

### **9.1 Environment Variables**

Verify all sensitive data is in environment variables:
```bash
vercel env ls production
```

### **9.2 CORS Configuration**

Ensure CORS only allows your frontend domain:
```javascript
origin: [
  'https://your-frontend-url.vercel.app'
]
```

### **9.3 Rate Limiting**

Verify rate limiting is active:
```bash
# Test rate limiting
for i in {1..10}; do
  curl https://your-backend-url.vercel.app/api/organizations \
    -H "Authorization: Bearer YOUR_JWT"
done
```

### **9.4 Webhook Security**

- Unique webhook URLs per agent ✅
- Validation of agent_id in payload ✅
- No public endpoints without auth ✅

---

## 🎯 Step 10: Custom Domains (Optional)

### **10.1 Add Custom Domain**

In Vercel dashboard:
1. Go to project settings
2. Domains tab
3. Add domain: `app.yourdomain.com`
4. Add domain: `api.yourdomain.com`

### **10.2 Update DNS**

Add CNAME records:
```
app.yourdomain.com  →  cname.vercel-dns.com
api.yourdomain.com  →  cname.vercel-dns.com
```

### **10.3 Update Environment Variables**

```bash
# Update frontend
vercel env add REACT_APP_API_URL production
# Enter: https://api.yourdomain.com

# Update backend
vercel env add PUBLIC_BASE_URL production
# Enter: https://api.yourdomain.com
```

### **10.4 Update CORS**

```javascript
origin: [
  'https://app.yourdomain.com'
]
```

---

## 🐛 Troubleshooting

### **Build Fails**

```bash
# Check build logs
vercel logs --since 1h

# Common issues:
# - Missing environment variables
# - Dependency conflicts
# - Build size too large
```

### **Environment Variables Not Working**

```bash
# List all env vars
vercel env ls production

# Pull env vars locally
vercel env pull .env.production

# Check values
cat .env.production
```

### **CORS Errors**

```bash
# Check CORS configuration in server/index.js
# Ensure frontend URL is in allowed origins
# Redeploy backend after changes
```

### **Webhook Not Receiving Events**

```bash
# Check webhook URL format
curl https://your-backend-url.vercel.app/api/agents/AGENT_ID \
  -H "Authorization: Bearer JWT"

# Verify PUBLIC_BASE_URL is correct
vercel env get PUBLIC_BASE_URL production

# Check Retell agent configuration
```

---

## 📝 Post-Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] Code pushed to GitHub
- [ ] Environment variables configured
- [ ] CORS updated with frontend URL
- [ ] Webhook URLs updated in Retell
- [ ] Super admin can login
- [ ] Organizations loading correctly
- [ ] Calls and metrics displaying
- [ ] User management working
- [ ] Agent creation working
- [ ] Webhooks receiving events
- [ ] Rate limiting functional
- [ ] Custom domains configured (optional)
- [ ] Monitoring set up
- [ ] Documentation updated

---

## 🎉 Deployment Complete!

Your Roy Voice CRM is now live and ready for production use!

**URLs:**
- Frontend: `https://your-frontend-url.vercel.app`
- Backend: `https://your-backend-url.vercel.app`
- GitHub: `https://github.com/YOUR_USERNAME/roy-voice`

**Next Steps:**
1. Create production organizations
2. Add production agents
3. Configure Retell webhooks
4. Invite team members
5. Monitor usage and performance

---

**Deployment Guide Version**: 1.0  
**Last Updated**: October 3, 2025  
**App Version**: 2.9

