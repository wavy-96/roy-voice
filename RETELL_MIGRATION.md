# 🔄 Retell Configuration Migration

## ✅ COMPLETED: Per-Agent Configuration

---

## 📋 Summary of Changes

### **What Changed**
- ❌ Removed global `RETELL_AGENT_ID` and `RETELL_API_KEY` from environment variables
- ✅ Added per-agent configuration through API
- ✅ Retell Agent IDs are now input during agent creation
- ✅ Each organization stores its own encrypted Retell API key in database
- ✅ Each agent generates a unique webhook URL

---

## 🎯 Benefits

### **Before (Single Agent, Global Config)**
```bash
# .env
RETELL_API_KEY=sk_...
RETELL_AGENT_ID=agent_abc123

# Problems:
# ❌ Only one agent for entire system
# ❌ Required redeployment to change agents
# ❌ Not multi-tenant friendly
# ❌ API key shared across organizations
```

### **After (Multi-Agent, Per-Org Config)**
```json
// API Request
POST /api/agents
{
  "organization_id": "uuid",
  "agent_id": "agent_abc123",
  "name": "Customer Support"
}

// Benefits:
// ✅ Unlimited agents per organization
// ✅ No redeployment needed
// ✅ True multi-tenancy
// ✅ Per-organization API keys (encrypted)
// ✅ Dynamic webhook URLs
// ✅ Webhook validation per agent
```

---

## 🔧 Technical Implementation

### **1. Updated Files**

| File | Changes | Purpose |
|------|---------|---------|
| `server/services/retell.js` | Removed global API key/agent ID | Dynamic per-org configuration |
| `server/routes/agents.js` | Added `agent_id` input validation | Accept Retell Agent ID from user |
| `server/services/agent.js` | Generate unique webhook URLs | Per-agent webhooks |
| `docs/AGENT_CONFIGURATION.md` | New comprehensive guide | Document new flow |

### **2. API Changes**

#### **New Agent Creation Endpoints**

**Option 1: Body-based organization ID**
```http
POST /api/agents
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "organization_id": "uuid-here",
  "agent_id": "agent_from_retell",
  "name": "My Agent"
}
```

**Option 2: URL parameter organization ID**
```http
POST /api/organizations/:organizationId/agents
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "agent_id": "agent_from_retell",
  "name": "My Agent"
}
```

#### **Validation Schema**
```javascript
{
  agent_id: Joi.string()
    .pattern(/^agent_[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Retell Agent ID must start with "agent_"',
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .required(),
  organization_id: Joi.string()
    .uuid()
    .optional()
}
```

### **3. Database Schema**

```sql
-- system.agents table
CREATE TABLE system.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    agent_id TEXT NOT NULL UNIQUE,        -- Retell agent ID
    name TEXT NOT NULL,
    webhook_url TEXT UNIQUE NOT NULL,     -- Generated unique URL
    status TEXT DEFAULT 'pending_validation',
    is_validated BOOLEAN DEFAULT FALSE,
    last_webhook_received TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_org_id ON system.agents(organization_id);
CREATE INDEX idx_agents_webhook_url ON system.agents(webhook_url);
CREATE UNIQUE INDEX idx_agents_agent_id ON system.agents(agent_id);
```

---

## 🚀 Migration Guide

### **For Existing Deployments**

If you currently have `RETELL_AGENT_ID` in your `.env`:

#### **Step 1: Create Agent Record**
```bash
curl -X POST https://your-domain.com/api/agents \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-existing-org-id",
    "agent_id": "your_existing_agent_id_from_env",
    "name": "Migrated Agent"
  }'
```

#### **Step 2: Copy Webhook URL**
```json
// Response
{
  "id": "new-uuid",
  "webhook_url": "https://your-domain.com/webhooks/agent/uuid-xxx"
}
```

#### **Step 3: Update Retell Dashboard**
1. Go to Retell AI dashboard
2. Find your agent
3. Update webhook URL to the new one
4. Save

#### **Step 4: Test with Web Call**
1. Trigger a test call in Retell
2. Verify webhook is received
3. Check agent validation status:
```bash
curl -X GET https://your-domain.com/api/agents/:agentId/validation \
  -H "Authorization: Bearer YOUR_JWT"
```

#### **Step 5: Remove Old Environment Variables**
```bash
# Remove from .env
# RETELL_AGENT_ID=agent_xxx  ← DELETE THIS LINE

# Remove from Vercel (if deployed)
vercel env rm RETELL_AGENT_ID production
```

#### **Step 6: Redeploy**
```bash
vercel --prod
```

---

## 🎨 Frontend Integration

### **Agent Creation Form Example**

```jsx
import React, { useState } from 'react';

const CreateAgentModal = ({ organizationId, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agent, setAgent] = useState(null);
  const [validating, setValidating] = useState(false);

  const handleCreate = async () => {
    const response = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization_id: organizationId,
        agent_id: agentId,
        name: agentName
      })
    });

    const newAgent = await response.json();
    setAgent(newAgent);
    setStep(2);
  };

  const pollValidation = async () => {
    setValidating(true);
    const interval = setInterval(async () => {
      const response = await fetch(`/api/agents/${agent.id}/validation`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      const status = await response.json();
      
      if (status.is_validated) {
        clearInterval(interval);
        setValidating(false);
        setStep(4);
        onSuccess(agent);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div className="modal">
      {step === 1 && (
        <div>
          <h2>Create New Agent</h2>
          <input
            type="text"
            placeholder="Retell Agent ID (e.g., agent_abc123)"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            pattern="^agent_[a-zA-Z0-9]+$"
          />
          <input
            type="text"
            placeholder="Agent Name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
          <button onClick={handleCreate}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Configure Webhook</h2>
          <p>Copy this webhook URL and paste it into your Retell agent settings:</p>
          <code>{agent.webhook_url}</code>
          <button onClick={() => navigator.clipboard.writeText(agent.webhook_url)}>
            Copy URL
          </button>
          <button onClick={() => setStep(3)}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Test Webhook</h2>
          <p>1. Open Retell dashboard</p>
          <p>2. Go to your agent: {agentId}</p>
          <p>3. Initiate a test web call</p>
          <p>4. Click "Ready" when done</p>
          <button onClick={pollValidation}>Ready - Check Validation</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>✅ Agent Validated!</h2>
          <p>Your agent is now active and ready to receive calls.</p>
        </div>
      )}
    </div>
  );
};
```

---

## 📊 Impact Assessment

### **Environment Variables**

**Before:**
- `RETELL_API_KEY` (global)
- `RETELL_AGENT_ID` (global)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CONSOLE_USERNAME`
- `CONSOLE_PASSWORD`
- `PUBLIC_BASE_URL`

**After (Removed 2):**
- ~~`RETELL_API_KEY`~~ ← Now in database per-org
- ~~`RETELL_AGENT_ID`~~ ← Now input per-agent
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CONSOLE_USERNAME`
- `CONSOLE_PASSWORD`
- `PUBLIC_BASE_URL`

**Result:** 22% fewer environment variables! ✅

### **Scalability**

**Before:**
- 1 agent per deployment
- Requires code change and redeploy to add agents

**After:**
- Unlimited agents per organization
- Dynamic agent creation via API
- No redeployment needed

---

## 🧪 Testing

### **Test Script**

```bash
#!/bin/bash

# Test agent creation with new flow
echo "Testing new agent configuration system..."

# 1. Create agent
echo "1. Creating agent..."
AGENT=$(curl -X POST http://localhost:3002/api/agents \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "'$ORG_ID'",
    "agent_id": "agent_test123",
    "name": "Test Agent"
  }')

echo "Agent created: $AGENT"

# 2. Extract webhook URL
WEBHOOK_URL=$(echo $AGENT | jq -r '.webhook_url')
echo "Webhook URL: $WEBHOOK_URL"

# 3. Simulate webhook
echo "3. Simulating webhook..."
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "call_id": "test_call",
      "agent_id": "agent_test123"
    }
  }'

# 4. Check validation
echo "4. Checking validation..."
AGENT_ID=$(echo $AGENT | jq -r '.id')
VALIDATION=$(curl -X GET http://localhost:3002/api/agents/$AGENT_ID/validation \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Validation status: $VALIDATION"
```

---

## 📝 Documentation Updates

### **Files Updated**
- ✅ `docs/AGENT_CONFIGURATION.md` - New comprehensive guide
- ✅ `ARCHITECTURE.md` - Updated Retell integration section
- ✅ `RETELL_MIGRATION.md` - This migration guide
- ✅ `server/routes/agents.js` - Added alternative endpoint
- ✅ `server/services/retell.js` - Removed global config

### **Files to Update (If Exist)**
- [ ] `.env.example` - Remove RETELL_* variables (if accessible)
- [ ] `README.md` - Update setup instructions
- [ ] Frontend components - Add agent creation UI

---

## 🔗 Related Resources

- [Agent Configuration Guide](docs/AGENT_CONFIGURATION.md) - Complete guide
- [Architecture Documentation](ARCHITECTURE.md) - System overview
- [Environment Setup](ENVIRONMENT_SETUP.md) - Environment variables

---

## ✅ Checklist

- [x] Remove global Retell environment variables
- [x] Update agent creation API to accept `agent_id` input
- [x] Add validation for Retell Agent ID format
- [x] Support both URL param and body organization ID
- [x] Create comprehensive documentation
- [x] Update architecture diagrams
- [x] Add migration guide
- [x] Update TODO list
- [ ] Update frontend UI (pending)
- [ ] Test migration with existing agent (user action)
- [ ] Remove old env vars from Vercel (user action)

---

**Migration Status**: ✅ Backend Complete | ⏳ Frontend Pending | 📋 Documentation Complete

**Last Updated**: October 3, 2025  
**Version**: 2.9

