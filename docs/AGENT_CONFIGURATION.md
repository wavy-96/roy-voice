# Agent Configuration Guide

## Overview

As of the latest version, **Retell Agent IDs are no longer stored in environment variables**. Instead, they are configured per-agent through the API or UI during the agent creation flow.

---

## 🔄 What Changed?

### ❌ **Old Way (Deprecated)**
```bash
# .env file
RETELL_API_KEY=your-retell-api-key
RETELL_AGENT_ID=agent_xxxxx
```

**Problems:**
- Only supported one agent globally
- Required redeployment to add new agents
- Not suitable for multi-tenant architecture

### ✅ **New Way (Current)**
```json
{
  "organization_id": "uuid-here",
  "agent_id": "agent_xxxxx",
  "name": "Customer Support Agent"
}
```

**Benefits:**
- ✅ Multiple agents per organization
- ✅ No redeployment needed
- ✅ Dynamic agent creation
- ✅ Per-organization Retell API keys
- ✅ Webhook validation per agent

---

## 📋 Agent Creation Flow

### **Step 1: Super Admin Creates Agent**

**API Endpoint:**
```http
POST /api/agents
Authorization: Bearer <super_admin_jwt>
Content-Type: application/json

{
  "organization_id": "a532b854-...",
  "agent_id": "agent_abc123xyz",
  "name": "My Voice Agent"
}
```

**Alternative Endpoint:**
```http
POST /api/organizations/:organizationId/agents
Authorization: Bearer <super_admin_jwt>
Content-Type: application/json

{
  "agent_id": "agent_abc123xyz",
  "name": "My Voice Agent"
}
```

**Response:**
```json
{
  "id": "uuid",
  "organization_id": "a532b854-...",
  "agent_id": "agent_abc123xyz",
  "name": "My Voice Agent",
  "webhook_url": "https://your-domain.com/webhooks/agent/uuid-webhook-id",
  "status": "pending_validation",
  "is_validated": false,
  "created_at": "2025-10-03T..."
}
```

### **Step 2: Configure Webhook in Retell**

1. Copy the `webhook_url` from the response
2. Go to Retell AI dashboard
3. Navigate to your agent settings (agent_abc123xyz)
4. Paste the webhook URL into the agent configuration
5. Save the agent

### **Step 3: Test Webhook with Web Call**

1. In Retell dashboard, initiate a test web call
2. The webhook will send data to your backend
3. Backend validates the webhook and updates agent status

### **Step 4: Agent Validation**

**Check validation status:**
```http
GET /api/agents/:agentId/validation
Authorization: Bearer <super_admin_jwt>
```

**Response (pending):**
```json
{
  "is_validated": false,
  "status": "pending_validation",
  "webhook_url": "https://...",
  "last_webhook_received": null
}
```

**Response (validated):**
```json
{
  "is_validated": true,
  "status": "active",
  "webhook_url": "https://...",
  "last_webhook_received": "2025-10-03T..."
}
```

---

## 🔧 API Endpoints

### **Create Agent**

**Method 1: With organization_id in body**
```bash
curl -X POST https://your-domain.com/api/agents \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "a532b854-...",
    "agent_id": "agent_abc123xyz",
    "name": "Customer Support"
  }'
```

**Method 2: With organization_id in URL**
```bash
curl -X POST https://your-domain.com/api/organizations/a532b854-.../agents \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_abc123xyz",
    "name": "Customer Support"
  }'
```

### **List Agents for Organization**
```bash
curl -X GET https://your-domain.com/api/organizations/a532b854-.../agents \
  -H "Authorization: Bearer YOUR_JWT"
```

### **Get Agent Details**
```bash
curl -X GET https://your-domain.com/api/agents/:agentId \
  -H "Authorization: Bearer YOUR_JWT"
```

### **Check Agent Validation**
```bash
curl -X GET https://your-domain.com/api/agents/:agentId/validation \
  -H "Authorization: Bearer YOUR_JWT"
```

### **Update Agent Status**
```bash
curl -X PATCH https://your-domain.com/api/agents/:agentId/status \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "is_validated": true
  }'
```

### **Delete Agent**
```bash
curl -X DELETE https://your-domain.com/api/agents/:agentId \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 🔐 Security

### **Agent ID Validation**
- Must start with `agent_`
- Alphanumeric characters only
- Pattern: `/^agent_[a-zA-Z0-9]+$/`

### **Organization Isolation**
- Each agent belongs to exactly one organization
- Agents cannot be shared between organizations
- Webhook URLs are unique per agent

### **Webhook Validation**
When a webhook is received:
1. Extract agent UUID from URL path
2. Verify agent exists in database
3. Check `agent_id` in webhook payload matches database
4. Update `is_validated` to `true`
5. Store call in organization schema

---

## 🎯 Frontend Implementation Guide

### **Agent Creation Form**

```jsx
// Example React component
const CreateAgentForm = ({ organizationId, onSuccess }) => {
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organization_id: organizationId,
          agent_id: agentId, // User inputs this from Retell dashboard
          name: agentName
        })
      });

      const agent = await response.json();
      setWebhookUrl(agent.webhook_url);
      onSuccess(agent);
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Retell Agent ID (e.g., agent_abc123)"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        pattern="^agent_[a-zA-Z0-9]+$"
        required
      />
      
      <input
        type="text"
        placeholder="Agent Name"
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Agent'}
      </button>

      {webhookUrl && (
        <div>
          <h3>Webhook URL</h3>
          <code>{webhookUrl}</code>
          <button onClick={() => navigator.clipboard.writeText(webhookUrl)}>
            Copy
          </button>
        </div>
      )}
    </form>
  );
};
```

### **4-Step Agent Wizard** (Recommended UX)

```jsx
const AgentWizard = ({ organizationId }) => {
  const [step, setStep] = useState(1);
  const [agent, setAgent] = useState(null);
  const [isValidated, setIsValidated] = useState(false);

  // Step 1: Input agent details
  // Step 2: Display webhook URL with copy button
  // Step 3: Instruct user to configure webhook in Retell
  // Step 4: Poll for validation status

  return (
    <div>
      {step === 1 && <AgentDetailsForm />}
      {step === 2 && <WebhookDisplay webhookUrl={agent.webhook_url} />}
      {step === 3 && <ValidationPending agentId={agent.id} />}
      {step === 4 && <ValidationSuccess />}
    </div>
  );
};
```

---

## 📝 Database Schema

```sql
-- system.agents table
CREATE TABLE system.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES system.organizations(id),
    agent_id TEXT NOT NULL, -- Retell agent ID (e.g., agent_abc123)
    name TEXT NOT NULL,
    webhook_url TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending_validation',
    is_validated BOOLEAN DEFAULT FALSE,
    last_webhook_received TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_org_id ON system.agents(organization_id);
CREATE INDEX idx_agents_webhook_url ON system.agents(webhook_url);
CREATE UNIQUE INDEX idx_agents_agent_id ON system.agents(agent_id);
```

---

## 🚀 Migration from Old System

### **If you have existing agents in environment variables:**

```bash
# 1. Create agent via API with existing agent_id
curl -X POST https://your-domain.com/api/agents \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-org-id",
    "agent_id": "agent_from_env_var",
    "name": "Legacy Agent"
  }'

# 2. Update webhook URL in Retell dashboard

# 3. Test with web call to validate

# 4. Remove RETELL_AGENT_ID from .env

# 5. Redeploy application
```

---

## 🧪 Testing

### **Test Agent Creation**
```bash
node server/scripts/test-billable-system.js
```

### **Manual Test**
```bash
# 1. Create agent
AGENT_RESPONSE=$(curl -X POST http://localhost:3002/api/agents \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-org-id",
    "agent_id": "agent_test123",
    "name": "Test Agent"
  }')

echo $AGENT_RESPONSE

# 2. Extract webhook URL
WEBHOOK_URL=$(echo $AGENT_RESPONSE | jq -r '.webhook_url')
echo "Webhook URL: $WEBHOOK_URL"

# 3. Simulate webhook (for testing)
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "call_id": "test_call_123",
      "agent_id": "agent_test123",
      "from_e164": "+15555555555"
    }
  }'

# 4. Check validation status
curl -X GET http://localhost:3002/api/agents/:agentId/validation \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Full system architecture
- [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md) - Environment configuration
- [WHITE_LABEL_CRM_SPEC.md](../WHITE_LABEL_CRM_SPEC.md) - Product specification

---

**Last Updated**: October 3, 2025  
**Version**: 2.9 (Per-Agent Configuration)

