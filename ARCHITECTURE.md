# Roy Voice - System Architecture

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Directory Structure](#directory-structure)

---

## 🎯 System Overview

**Roy Voice** is a multi-tenant white-label CRM system for Retell AI voice agents with complete data isolation, agent management, webhook validation, and billable call tracking.

### Key Features
- ✅ Multi-tenant architecture with schema-level isolation
- ✅ Agent management with webhook validation
- ✅ Billable vs test call differentiation
- ✅ Real-time metrics and revenue tracking
- ✅ Role-based access control (Super Admin, Org Admin, Org Viewer)
- ✅ Production-grade security and performance

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS                                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Super Admin  │  │   Org Admin  │  │  Org Viewer  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼────────┐
                    │                 │
                    │  FRONTEND (React)   │
                    │  Port: 3000     │
                    │                 │
                    │  Components:    │
                    │  - SuperAdminDashboard │
                    │  - OrganizationDashboard │
                    │  - UserManagement │
                    │  - CallsTable   │
                    │  - OverviewCard │
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   CORS/Proxy    │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    │              ┌─────────▼─────────┐              │
    │              │                   │              │
    │              │  BACKEND (Node.js/Express)       │
    │              │  Port: 3002       │              │
    │              │  Deployed: Vercel │              │
    │              │                   │              │
    │              └─────────┬─────────┘              │
    │                        │                        │
    └────────────────────────┼────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │   Middleware  │ │   Routes    │ │  Services   │
    │               │ │             │ │             │
    │ - Auth        │ │ /api/       │ │ - Agent     │
    │ - Rate Limit  │ │ /webhooks/  │ │ - Org       │
    │ - Validation  │ │ /health     │ │ - User      │
    │               │ │             │ │ - Metrics   │
    │               │ │             │ │ - Cache     │
    └───────┬───────┘ └─────┬──────┘ └──────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Configuration  │
                    │  (config/env.js)│
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │  Environment  │ │  Supabase  │ │   Retell    │
    │   Variables   │ │  Client    │ │   Service   │
    │               │ │            │ │  (Optional) │
    └───────────────┘ └─────┬──────┘ └─────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼───────┐       ┌──────▼──────┐
        │   SUPABASE    │       │   RETELL    │
        │   DATABASE    │       │   WEBHOOKS  │
        │               │       │             │
        │ ┌───────────┐ │       │ Agent → Webhook │
        │ │  system   │ │       │ Calls → Events  │
        │ │  schema   │ │       │             │
        │ ├───────────┤ │       └─────────────┘
        │ │ - orgs    │ │
        │ │ - agents  │ │
        │ │ - users   │ │
        │ └───────────┘ │
        │               │
        │ ┌───────────┐ │
        │ │  org_*    │ │
        │ │  schemas  │ │
        │ ├───────────┤ │
        │ │ - calls   │ │
        │ │ - rollups │ │
        │ └───────────┘ │
        │               │
        └───────────────┘
```

---

## 🧩 Component Breakdown

### **1. Frontend (React)**

#### **Location**: `client/`

#### **Components**:

| Component | Purpose | Access Level |
|-----------|---------|--------------|
| `SuperAdminDashboard` | System-wide view, all organizations | Super Admin |
| `OrganizationDashboard` | Single organization view | Org Admin, Org Viewer |
| `UserManagement` | Create/manage users | Super Admin |
| `CallsTable` | Display calls with billable badges | All |
| `OverviewCard` | Metrics cards with revenue | All |
| `DateRangePicker` | Filter calls by date | All |
| `Login` | Authentication | Public |
| `ErrorBoundary` | Graceful error handling | All |
| `ApiErrorBoundary` | API-specific error handling | All |

#### **Context**:
- `SupabaseContext` - Shared Supabase client for all components

#### **Key Features**:
- Real-time data updates
- Cursor-based pagination
- Error boundaries for resilience
- Responsive design (Tailwind CSS)

---

### **2. Backend (Node.js/Express)**

#### **Location**: `server/`

#### **Routes**:

| Route | Methods | Purpose | Auth Required |
|-------|---------|---------|---------------|
| `/health` | GET | Health check | No |
| `/api/organizations` | GET, POST, PUT, DELETE | Org management | Super Admin |
| `/api/users` | GET, POST, PUT, DELETE | User management | Super Admin |
| `/api/agents` | GET, POST, PUT, DELETE | Agent management | Super Admin |
| `/api/multi-tenant/overview` | GET | Organization metrics | Org Admin+ |
| `/api/multi-tenant/calls` | GET | Organization calls | Org Admin+ |
| `/api/cache/stats` | GET | Cache statistics | Any |
| `/webhooks/agent/:id` | POST | Agent-specific webhooks | No (validated) |

#### **Middleware**:

| Middleware | Purpose | Applied To |
|------------|---------|------------|
| `authMiddleware` | JWT validation | All `/api/*` routes |
| `requireSuperAdmin` | Super admin check | Admin-only routes |
| `requireOrganizationAccess` | Org isolation | Multi-tenant routes |
| `apiLimiter` | Rate limiting (100/15min) | All `/api/*` |
| `authLimiter` | Strict rate limiting (5/15min) | Auth routes |
| `orgCreationLimiter` | Very strict (3/hr) | Org creation |
| `healthCheckLimiter` | Lenient (1000/15min) | Health check |
| `validateMetricsQuery` | Input validation (Joi) | Metrics routes |

#### **Services**:

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `agent.js` | Agent CRUD, webhook URLs | createAgent, getAgentsByOrganization, updateAgentStatus |
| `organization.js` | Org CRUD, schema creation | createOrganization, getOrganization, listOrganizations |
| `user-management.js` | User CRUD, role assignment | createUser, assignUserToOrg, updateUserRole |
| `multi-tenant-metrics.js` | Cross-org metrics | getOrganizationCalls, getOrganizationOverview |
| `retell.js` | Retell integration | processWebhookEvent, validateWebhook |
| `cache.js` | In-memory caching | get, set, del, getStats |
| `supabase.js` | Supabase client factory | createClient |

---

### **3. Configuration**

#### **Location**: `config/`

| File | Purpose |
|------|---------|
| `env.js` | Centralized env var management |

**Features**:
- Automatic validation of required variables
- Environment detection (dev/prod/Vercel)
- Graceful degradation (warn in dev, fail in prod)
- Single source of configuration truth

---

### **4. Database (Supabase PostgreSQL)**

#### **Schema Architecture**:

```
┌─────────────────────────────────────────┐
│         SYSTEM SCHEMA                    │
├─────────────────────────────────────────┤
│                                          │
│  organizations                           │
│  ├─ id (UUID, PK)                       │
│  ├─ name                                 │
│  ├─ slug (unique)                        │
│  ├─ schema_name (org_uuid)              │
│  ├─ retell_api_key (encrypted)          │
│  ├─ billing_rate                         │
│  └─ status                               │
│                                          │
│  agents                                  │
│  ├─ id (UUID, PK)                       │
│  ├─ organization_id (FK)                │
│  ├─ agent_id (Retell ID)                │
│  ├─ name                                 │
│  ├─ webhook_url (unique)                │
│  ├─ status                               │
│  └─ is_validated                         │
│                                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     ORGANIZATION SCHEMAS (org_*)         │
│     One per organization                 │
├─────────────────────────────────────────┤
│                                          │
│  calls                                   │
│  ├─ id (UUID, PK)                       │
│  ├─ external_call_id (unique)           │
│  ├─ organization_id (FK)                │
│  ├─ agent_id                             │
│  ├─ from_e164                            │
│  ├─ to_e164                              │
│  ├─ status                               │
│  ├─ duration_seconds                     │
│  ├─ billed_minutes                       │
│  ├─ is_billable (BOOLEAN)               │
│  ├─ detailed_summary                     │
│  ├─ started_at                           │
│  └─ ended_at                             │
│                                          │
│  call_rollups                            │
│  ├─ Daily aggregates                     │
│  └─ Performance metrics                  │
│                                          │
└─────────────────────────────────────────┘
```

#### **RPC Functions**:

| Function | Purpose | Parameters |
|----------|---------|------------|
| `create_organization` | Create org + schema | name, retell_key, agent_id |
| `get_organization_calls` | Get calls with filters | org_id, limit, cursor, from, to, is_billable |
| `get_organization_overview` | Aggregated metrics | org_id, from, to, is_billable |
| `create_agent` | Create agent record | org_id, agent_id, name, webhook_url |
| `update_agent_status` | Update agent status | agent_id, status, is_validated |

---

### **5. External Integrations**

#### **Supabase**
- **Purpose**: Database, Auth, Real-time
- **Connection**: Via `@supabase/supabase-js`
- **Auth**: Service role key for backend, anon key for frontend

#### **Retell AI**
- **Purpose**: Voice agent platform
- **Integration**: Webhook-based (per-agent)
- **Configuration**: Agent IDs provided during agent creation (no env vars)
- **Flow**: Agent → Call → Webhook → Our Backend → Database
- **API Keys**: Stored encrypted per-organization in database

#### **Vercel**
- **Purpose**: Serverless deployment
- **Features**: Auto-scaling, edge network, preview deployments
- **Config**: `vercel.json`

---

## 🔄 Data Flow

### **1. User Authentication Flow**

```
User → Login Component → Supabase Auth
  ↓
JWT Token Generated
  ↓
Stored in Context → Used in API Calls
  ↓
Backend validates JWT → Checks role → Grants access
```

### **2. Organization Call Fetching Flow**

```
Dashboard → Fetch Calls (with filters)
  ↓
API: GET /api/multi-tenant/calls?org_id=X&isBillable=true
  ↓
Auth Middleware → Validates JWT → Checks org access
  ↓
Multi-Tenant Metrics Service
  ↓
Supabase RPC: get_organization_calls(...)
  ↓
Query org_X schema → Filter by is_billable
  ↓
Return paginated results with revenue calculation
  ↓
Frontend displays with billable badges
```

### **3. Agent Webhook Validation Flow**

```
Retell Agent makes test call
  ↓
Webhook sent to: https://roy-voice.vercel.app/webhooks/agent/:uuid
  ↓
Backend: Webhook Route
  ↓
1. Extract agent_id from URL
2. Validate agent exists in DB
3. Verify agent_id in payload matches
4. Update agent.is_validated = true
5. Store call in org schema
  ↓
Agent status: pending → active ✅
```

### **4. Real-time Metrics Update Flow**

```
New call → Webhook → Stored in DB
  ↓
Frontend polls /api/multi-tenant/overview
  ↓
Cache checks (60s TTL)
  ↓
If miss: Query DB → Calculate metrics → Cache
  ↓
Return: {
  total_calls,
  billable_calls,
  test_calls,
  total_billed_minutes,
  expected_revenue
}
```

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **HTTP Client**: Fetch API
- **Auth**: Supabase Auth SDK
- **Build Tool**: Create React App

### **Backend**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Auth**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: Joi
- **Caching**: NodeCache
- **Database Client**: @supabase/supabase-js

### **Database**
- **Platform**: Supabase (PostgreSQL 15)
- **Features**: Row Level Security, RPC Functions, Real-time
- **Connection**: pgBouncer (connection pooling)

### **Infrastructure**
- **Deployment**: Vercel (Serverless)
- **CDN**: Vercel Edge Network
- **SSL**: Auto-provisioned
- **Regions**: Washington D.C. (iad1)

### **Development Tools**
- **Version Control**: Git
- **Package Manager**: npm
- **Linting**: (not configured)
- **Testing**: Manual + Artillery (load testing)

---

## 📁 Directory Structure

```
roy-voice/
├── client/                    # Frontend React application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ApiErrorBoundary.js
│   │   │   ├── CallsTable.js         # Displays calls with billable badges
│   │   │   ├── DateRangePicker.js
│   │   │   ├── ErrorBoundary.js
│   │   │   ├── Login.js
│   │   │   ├── OrganizationDashboard.js  # Org-level dashboard
│   │   │   ├── OverviewCard.js           # Metrics cards with revenue
│   │   │   ├── SuperAdminDashboard.js    # System-wide dashboard
│   │   │   ├── UserManagement.js         # User CRUD interface
│   │   │   └── UserModal.js
│   │   ├── contexts/
│   │   │   └── SupabaseContext.js    # Shared Supabase client
│   │   ├── App.js                    # Main app component
│   │   └── index.js                  # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                    # Backend Express application
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # JWT validation, role checks
│   │   ├── rate-limit.js     # 5-tier rate limiting
│   │   └── validation.js     # Joi input validation
│   ├── routes/               # API route handlers
│   │   ├── agents.js         # Agent CRUD
│   │   ├── metrics.js        # Legacy metrics (unused)
│   │   ├── multi-tenant-metrics.js  # Cross-org metrics
│   │   ├── organizations.js  # Org CRUD
│   │   ├── users.js          # User CRUD
│   │   └── webhooks.js       # Webhook receiver
│   ├── services/             # Business logic
│   │   ├── agent.js          # Agent management
│   │   ├── cache.js          # In-memory caching
│   │   ├── migrations.js     # DB migrations (unused)
│   │   ├── multi-tenant-metrics.js  # Metrics aggregation
│   │   ├── organization.js   # Org management
│   │   ├── retell.js         # Retell integration
│   │   ├── supabase.js       # Supabase client factory
│   │   └── user-management.js  # User management
│   ├── scripts/              # Utility scripts
│   │   ├── setup-multi-tenant.js     # Initial setup
│   │   ├── setup-super-admin-password.js  # Reset admin password
│   │   ├── test-billable-system.js   # Test billable calls
│   │   ├── test-pagination.js        # Test pagination
│   │   ├── test-rate-limiting.js     # Test rate limits
│   │   └── test-validation.js        # Test input validation
│   ├── artillery/            # Load testing
│   │   └── processor.js
│   ├── index.js              # Main server entry point
│   └── package.json
│
├── config/                   # Unified configuration
│   └── env.js                # Environment variable management
│
├── database/                 # Database migrations & schema
│   ├── add_performance_indexes.sql  # Performance indexes
│   ├── fix_get_organization_calls.sql  # Bug fix
│   ├── supabase_organization_functions.sql  # Org RPC functions
│   └── supabase_system_schema.sql   # System schema
│
├── docs/                     # Technical documentation
│   ├── CONNECTION_POOLING.md
│   ├── DATABASE_SCHEMA.md
│   ├── ERROR_BOUNDARIES.md
│   ├── INPUT_VALIDATION.md
│   ├── LOAD_TESTING.md
│   └── RATE_LIMITING.md
│
├── scripts/                  # Deployment scripts
│   └── setup-vercel-env.sh   # Auto-setup Vercel env vars
│
├── .env.example              # Environment variables template
├── .vercelignore             # Files to exclude from deployment
├── package.json              # Root package.json
├── vercel.json               # Vercel configuration
├── ARCHITECTURE.md           # This file
├── ENVIRONMENT_SETUP.md      # Environment configuration guide
├── README.md                 # Project overview
└── WHITE_LABEL_CRM_SPEC.md   # Full product specification
```

---

## 🔐 Security Architecture

### **Authentication & Authorization**

```
Request → Auth Middleware
  ↓
1. Extract JWT from Authorization header
2. Verify JWT signature (config.jwtSecret)
3. Decode user payload: { role, organization_id, email }
4. Attach to req.user
  ↓
Role Checks:
  ├─ requireSuperAdmin → Checks role === 'super_admin'
  ├─ requireOrganizationAccess → Validates org_id matches
  └─ Allow/Deny request
```

### **Multi-Tenant Data Isolation**

```
Organization A
  ↓
Schema: org_a532b854...
  ├─ calls (only Org A's data)
  ├─ call_rollups
  └─ RLS policies

Organization B
  ↓
Schema: org_b7c8d912...
  ├─ calls (only Org B's data)
  ├─ call_rollups
  └─ RLS policies

✅ No cross-contamination possible
✅ Database-level isolation
✅ RPC functions enforce org_id checks
```

### **Rate Limiting Strategy**

| Tier | Limit | Applied To | Purpose |
|------|-------|------------|---------|
| Health | 1000/15min | `/health` | Lenient for monitoring |
| API | 100/15min | `/api/*` | General API usage |
| Auth | 5/15min | Auth endpoints | Prevent brute force |
| Org Creation | 3/hour | `POST /api/organizations` | Prevent abuse |

---

## 📊 Performance Characteristics

### **Caching Strategy**
- **In-Memory Cache** (NodeCache)
- **TTL**: 60 seconds for org data
- **Cache Keys**: `org:${orgId}`
- **Hit Rate**: ~80% for repeated org queries

### **Database Performance**
- **Indexes**: On all foreign keys, search fields, timestamps
- **Connection Pooling**: Via PgBouncer
- **Query Optimization**: Cursor-based pagination (no OFFSET)

### **API Response Times**
- **Health Check**: < 10ms
- **Org Overview**: 50-100ms (cached: < 5ms)
- **Call List**: 100-200ms (with pagination)
- **User Management**: 50-100ms

### **Scalability**
- **Serverless**: Auto-scales with traffic
- **Database**: Supabase handles connection pooling
- **Concurrent Users**: Unlimited (serverless)
- **Rate Limited**: Yes (prevents abuse)

---

## 🚀 Deployment Architecture

```
Developer
  ↓
Git Push to main
  ↓
Vercel Auto-Deploy
  ↓
Build: Install deps → Build function → Deploy
  ↓
Vercel Edge Network (Global CDN)
  ├─ Americas (iad1)
  ├─ Europe
  ├─ Asia-Pacific
  └─ All regions
  ↓
End Users (Low Latency Worldwide)
```

### **Environment Variables Flow**

```
Local Development:
  .env file → config/env.js → Application

Production (Vercel):
  Vercel Dashboard → process.env → config/env.js → Application

Both use same config/env.js interface!
```

---

## 🎯 Key Design Decisions

### **1. Multi-Tenancy via Schemas (Not Row-Level)**
**Why?** Complete data isolation, easier to manage permissions, better performance.

### **2. Centralized Config (config/env.js)**
**Why?** Single source of truth, works in all environments, validates on startup.

### **3. Serverless (Vercel) vs Traditional Hosting**
**Why?** Auto-scaling, zero maintenance, global CDN, pay-per-use.

### **4. In-Memory Caching (Not Redis)**
**Why?** Simpler, sufficient for current scale, no external dependencies.

### **5. Cursor-Based Pagination (Not Offset)**
**Why?** Consistent results, better performance on large datasets.

### **6. Joi Validation (Not Manual)**
**Why?** Declarative, reusable, comprehensive error messages.

### **7. is_billable Column (Not Computed)**
**Why?** Faster queries, allows admin overrides, resilient to logic changes.

---

## 📈 Future Enhancements

### **Planned Features**
- [ ] AgentWizardModal (4-step agent creation)
- [ ] OrganizationDetailView (drill-down interface)
- [ ] AgentDetailView (billable vs test tabs)
- [ ] Custom domain support
- [ ] Email notifications
- [ ] Webhook retry mechanism
- [ ] Real-time dashboard updates (WebSockets)

### **Performance Improvements**
- [ ] Redis caching (if scale requires)
- [ ] Read replicas (for analytics)
- [ ] CDN caching for static metrics
- [ ] Query result caching in database

### **Security Enhancements**
- [ ] 2FA for super admin
- [ ] Audit logging
- [ ] IP whitelisting
- [ ] Webhook signature validation

---

## 📞 Support & Maintenance

### **Monitoring**
- **Health Endpoint**: `https://roy-voice.vercel.app/health`
- **Cache Stats**: `https://roy-voice.vercel.app/api/cache/stats`
- **Vercel Dashboard**: Real-time metrics and logs

### **Logging**
```bash
# View production logs
vercel logs https://roy-voice.vercel.app --follow

# View specific deployment
vercel logs <deployment-url>
```

### **Troubleshooting**
See `ENVIRONMENT_SETUP.md` for common issues and solutions.

---

**Last Updated**: October 3, 2025  
**Version**: 2.6 (Agent Management + Billable Tracking)  
**Production URL**: https://roy-voice.vercel.app

