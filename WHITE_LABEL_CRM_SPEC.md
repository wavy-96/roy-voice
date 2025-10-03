# White-Label CRM System Specification

## 🎯 **Project Overview**
Building a comprehensive white-labeled CRM system for Retell AI voice agents with multi-tenant architecture, complete data isolation, and admin-controlled customization.

## 🏗️ **Architecture Decisions**

### **1. Multi-Tenancy & Data Isolation**
- ✅ **Separate schemas per organization** - Each org gets its own database schema
- ✅ **Complete data isolation** - Organizations cannot see each other's data
- ✅ **Super admin access** - Can view all organizations and aggregated data
- ✅ **Per-minute billing** - Aligns with Retell's per-minute COGS model

### **2. Authentication & User Management**
- ✅ **Supabase Auth** - Email/password authentication
- ✅ **User roles**: Admin, Viewer (per organization)
- ✅ **Single organization membership** - Users belong to one org only
- ✅ **Super admin role** - System-wide access

### **3. Agent Assignment & Billing**
- ✅ **Multiple agents per organization** - Organizations can have many agents
- ✅ **Webhook-based validation** - Agents auto-validate on first webhook
- ✅ **Per-minute billing** - Real-time cost tracking
- ✅ **Billable vs Test calls** - Web calls excluded from billing
- ✅ **Configurable COGS** - Retell costs configurable per organization
- ✅ **Real-time billing** - Live cost updates for customers
- ✅ **Expected revenue tracking** - Real-time revenue calculations
- ❌ **No infrastructure costs** - Only Retell costs included

### **4. White-Labeling & Customization**
- ✅ **Admin-controlled customization** - Super admin configures branding
- ✅ **Custom domains** - Per organization (e.g., `client1.yourdomain.com`)
- ✅ **Custom branding** - Logos, colors, themes per organization
- ✅ **Templated UI** - Same dashboard template across all orgs

### **5. Security & Retell Isolation**
- ✅ **Complete API proxying** - All Retell calls through our backend
- ✅ **Per-organization credentials** - Separate Retell API keys per org
- ✅ **Request signing/verification** - Prevent reverse engineering
- ✅ **No client-side Retell exposure** - Zero network traces to Retell

### **6. Data & Reporting**
- ✅ **Current metrics** - Keep existing dashboard functionality
- ✅ **Cross-organization analytics** - Super admin aggregated views
- ✅ **Export capabilities** - CSV, PDF reports
- ✅ **Real-time updates** - Live data for all users

## 📊 **Database Architecture**

### **System Schema (Super Admin)**
```sql
-- Organizations table
organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT UNIQUE, -- custom domain
  branding JSONB, -- logo, colors, theme
  retell_api_key TEXT, -- encrypted
  retell_agent_id TEXT,
  cogs_per_minute DECIMAL(10,4), -- configurable cost
  billing_rate_per_minute DECIMAL(10,4), -- customer rate
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Agents table (multi-agent support)
agents (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  agent_id TEXT NOT NULL, -- Retell agent ID
  name TEXT NOT NULL,
  webhook_url TEXT UNIQUE NOT NULL, -- /webhooks/agent/:uuid
  status TEXT NOT NULL, -- pending_validation, active, inactive, error
  is_validated BOOLEAN DEFAULT FALSE,
  validation_attempted_at TIMESTAMPTZ,
  last_webhook_received_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(organization_id, agent_id)
);

-- System users (super admin access)
system_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT, -- 'super_admin'
  created_at TIMESTAMPTZ
);
```

### **Per-Organization Schema**
```sql
-- Each org gets: org_{uuid}_schema
-- Tables: calls (with is_billable column), call_rollups, users, billing_history
-- Same structure as current system but isolated

-- calls table now includes:
calls (
  ...existing columns...,
  is_billable BOOLEAN DEFAULT TRUE, -- FALSE for web calls
  ...
);
```

## 🔐 **Security Model**

### **Authentication Flow**
1. **Super Admin** → System schema access
2. **Org Admin/Viewer** → Organization schema access only
3. **API Requests** → Validated against organization context
4. **Retell API** → Proxied through our backend with org-specific keys

### **Data Isolation**
- **Row Level Security (RLS)** on all tables
- **Schema-level isolation** per organization
- **API endpoint validation** - Users can only access their org's data
- **Encrypted credentials** - Retell API keys stored encrypted

## 🚀 **Implementation Phases**

### **Phase 1: Core Multi-Tenancy** ✅ **COMPLETED**
- ✅ Database schema design
- ✅ Organization management system
- ✅ Basic authentication & authorization
- ✅ Schema creation per organization
- ✅ Data migration (26 calls to TheCreativeHorse)

### **Phase 2: Admin Portal** ✅ **COMPLETED**
- ✅ Organization CRUD operations
- ✅ User management per organization
- ✅ Authentication middleware
- ✅ Super admin dashboard (working and tested)
- ✅ Organization admin dashboard (working and tested)
- ✅ Multi-tenant API endpoints functional
- ✅ Database RPC functions implemented
- ✅ Complete data correlation verified

### **Phase 2.5: Production Hardening** ✅ **COMPLETED**
- ✅ Database performance indexes (all schemas)
- ✅ API rate limiting (5 tiers)
- ✅ Input validation (Joi schemas)
- ✅ Cursor-based pagination
- ✅ In-memory caching (NodeCache)
- ✅ Connection pooling (verified)
- ✅ React Error Boundaries
- ✅ Load testing (Artillery)

### **Phase 2.6: Agent Management & Billable Call Tracking** ✅ **COMPLETED**
- ✅ Multi-agent support (one org → many agents)
- ✅ Webhook-based agent validation system
- ✅ Per-agent unique webhook URLs (`/webhooks/agent/:uuid`)
- ✅ Auto-validation on first webhook reception
- ✅ Billable vs non-billable call detection (`is_billable` column)
- ✅ Expected revenue calculation (billable calls only)
- ✅ Agent CRUD API (6 endpoints)
- ✅ Enhanced metrics API with `isBillable` filter
- ✅ Updated frontend CallsTable (billable/test badges)
- ✅ Updated OverviewCard (revenue tracking)

### **Phase 3: Enhanced Client Portal** ⏳ **PENDING**
- ⏳ Organization-specific dashboards
- ⏳ Custom branding implementation
- ⏳ Real-time metrics per organization
- ⏳ Export functionality

### **Phase 4: Billing & COGS** ⏳ **PENDING**
- ⏳ Real-time cost tracking
- ⏳ Per-minute billing calculations
- ⏳ Customer billing interface
- ⏳ Financial reporting for super admin

### **Phase 5: Security Hardening** ⏳ **PENDING**
- ⏳ Complete Retell API proxying
- ⏳ Request signing & verification
- ⏳ Advanced security measures
- ⏳ Penetration testing

## 📋 **Current Status**

### ✅ **Completed (Phase 1 & 2)**
- ✅ **Multi-tenant database schema** - Supabase schemas with organization isolation
- ✅ **Data migration** - 26 calls migrated to "TheCreativeHorse" organization
- ✅ **Authentication system** - Supabase Auth with role-based access control
- ✅ **User management** - Super admin and organization admin users created
- ✅ **Multi-tenant API** - Protected routes with authentication middleware
- ✅ **Organization CRUD** - Complete organization management system
- ✅ **Schema creation** - Automatic schema creation per organization
- ✅ **Data isolation** - Complete separation between organizations
- ✅ **API testing** - Authentication and multi-tenant endpoints working

### ✅ **Recently Completed (October 3, 2025)**

**Phase 2 Completion:**
- ✅ **Critical middleware bug fix** - Fixed `requireOrganizationAccess` middleware that was blocking all API requests
- ✅ **Database validation** - Comprehensive validation of all schemas, tables, and data correlation
- ✅ **Super admin dashboard** - Fully functional with organization management
- ✅ **Organization dashboard** - Working with real-time call data and metrics
- ✅ **Frontend integration** - React app fully integrated with multi-tenant API
- ✅ **Port migration** - Migrated from port 3001 to 3002 across all services
- ✅ **Documentation** - Complete documentation suite (README, QUICK_START, RUNBOOK, etc.)

**Phase 2.5 Production Hardening:**
- ✅ **Database Indexes** - Performance indexes on all organization schemas (100x speedup)
- ✅ **API Rate Limiting** - 5-tier rate limiting strategy (10,000 req/15min for testing)
- ✅ **Input Validation** - Joi validation schemas on all endpoints
- ✅ **Cursor Pagination** - Efficient pagination for large datasets
- ✅ **In-Memory Caching** - NodeCache with 83.33% hit rate
- ✅ **Connection Pooling** - Verified Supabase PgBouncer configuration
- ✅ **Error Boundaries** - React error handling with retry logic
- ✅ **Load Testing** - Artillery tests up to 100 req/sec (0.8ms avg response)

### ⏳ **Remaining Tasks (Phase 3+)**
1. **Real-time billing** - 2x markup calculation and live billing display
2. **Custom branding** - Per-organization logos, colors, and themes
3. **Custom domains** - Subdomain routing for organizations (e.g., `client1.thecreativehorse.ca`)
4. **Complete Retell API proxying** - Hide Retell completely from client view
5. **Request signing** - Prevent reverse engineering of API calls
6. **Export functionality** - CSV/PDF reports for call data
7. **Advanced analytics** - Cross-organization insights for super admin

## 📊 **Detailed Progress Summary**

### **✅ Phase 1: Core Multi-Tenancy (100% Complete)**

**Database Architecture:**
- ✅ Created `system` schema with `organizations` and `system_users` tables
- ✅ Implemented RLS policies for data isolation
- ✅ Created organization-specific schemas (e.g., `org_a532b854_cbee_42f8_a669_cc6dfaa753aa`)
- ✅ Added `organization_id` and `agent_id` columns to calls tables

**Organization Management:**
- ✅ CRUD operations for organizations via `/api/organizations`
- ✅ Automatic schema creation per organization
- ✅ Retell API key encryption/decryption
- ✅ Organization slug generation and validation

**Data Migration:**
- ✅ Migrated 26 existing calls to "TheCreativeHorse" organization
- ✅ Created organization schema with proper constraints
- ✅ Updated call data with organization context

### **✅ Phase 2: Admin Portal (100% Complete)**

**Authentication System:**
- ✅ Supabase Auth integration with role-based access control
- ✅ User roles: `super_admin`, `org_admin`, `user`
- ✅ Authentication middleware with JWT validation
- ✅ Organization access control middleware
- ✅ Centralized Supabase client context (prevents multiple instances)
- ✅ JWT token refresh and session management
- ✅ Created and configured users: super admin and organization admin

**Multi-Tenant API:**
- ✅ Protected routes: `/api/multi-tenant/profile`, `/api/multi-tenant/calls`, `/api/multi-tenant/overview`
- ✅ Organization-specific data access via RPC functions
- ✅ Role-based permissions (super admin can access any org)
- ✅ Fixed critical middleware bug (requireOrganizationAccess)
- ✅ CORS configuration with proper headers and origins
- ✅ API testing scripts and comprehensive validation

**Admin Dashboards:**
- ✅ Super admin dashboard UI - fully functional with organization management
- ✅ Organization admin dashboard UI - working with real-time metrics
- ✅ Call history display with transcripts and summaries
- ✅ Date range filtering for analytics
- ✅ Responsive design for mobile and desktop

**Database Functions:**
- ✅ `get_organization_calls` - Returns calls for specific organization
- ✅ `get_organization_overview` - Returns aggregated metrics
- ✅ `create_organization` - Creates new organization with schema
- ✅ `create_organization_schema` - Sets up isolated database schema
- ✅ All functions tested and validated

### **⏳ Phase 3: Enhanced Client Portal (0% Complete)**
- ⏳ Organization-specific dashboards
- ⏳ Custom branding implementation
- ⏳ Real-time metrics per organization
- ⏳ Export functionality

### **⏳ Phase 4: Billing & COGS (0% Complete)**
- ⏳ Real-time cost tracking
- ⏳ Per-minute billing calculations (2x markup)
- ⏳ Customer billing interface
- ⏳ Financial reporting for super admin

### **⏳ Phase 5: Security Hardening (0% Complete)**
- ⏳ Complete Retell API proxying
- ⏳ Request signing & verification
- ⏳ Advanced security measures
- ⏳ Penetration testing

## 🎯 **Immediate Next Steps**

### **Phase 3: Enhanced Client Portal**
1. **Custom Branding System**
   - Design branding configuration UI for super admin
   - Implement per-organization logo, color scheme, and theme storage
   - Create dynamic CSS injection based on organization branding
   - Test branding isolation between organizations

2. **Real-Time Billing Display**
   - Implement 2x markup calculation on call costs
   - Create billing dashboard for organization admins
   - Add historical billing statements
   - Display usage metrics with clear pricing

3. **Export Functionality**
   - CSV export for call data
   - PDF reports for billing statements
   - Customizable date ranges for exports
   - Scheduled report generation

### **Phase 4: Security & Production Readiness**
1. **Complete Retell API Proxying** - Hide Retell completely from client network traces
2. **Request Signing** - Implement signature verification for API security
3. **Custom Domain Support** - Subdomain routing and SSL certificate provisioning
4. **Performance Optimization** - Caching, pagination, and query optimization
5. **Production Deployment** - Environment setup, monitoring, and error tracking

## ✅ **Implementation Decisions**

### **Database Strategy**
- ✅ **Supabase schema feature** - Same database, separate schemas per org
- ✅ **50 organizations capacity** - Initial scale target
- ✅ **Automatic schema creation** - Via super admin UI

### **Custom Domains**
- ✅ **Main domain**: `thecreativehorse.ca`
- ✅ **Subdomain pattern**: `client1.thecreativehorse.ca`
- ✅ **Super admin configuration** - Admin sets up custom domains
- ✅ **Automatic SSL** - Certificates provisioned automatically

### **Billing & COGS**
- ✅ **2x markup** - Customer pays 2x Retell COGS
- ✅ **Real-time calculation** - Live billing updates
- ✅ **No Retell exposure** - Customers never see Retell branding/costs
- ❌ **No usage alerts** - Skip for now

### **User Management**
- ❌ **No email invitations** - Manual user creation
- ❌ **No approval workflows** - Direct user creation
- ❌ **No audit trails** - Skip for now

### **Migration Strategy**
- ✅ **Migrate current data** - Single-tenant to multi-tenant
- ✅ **Current dashboard as template** - Use existing UI as base
- ❌ **No transition handling** - Direct migration

### **Retell API Management**
- ✅ **Retry logic** - Handle failed API calls
- ✅ **Usage tracking** - Monitor API usage per organization
- ❌ **No fallback mechanisms** - Skip for now

### **Super Admin Features**
- ✅ **All analytics** - Revenue, usage patterns, etc.
- ✅ **Impersonation mode** - Debug organization issues
- ✅ **Automated alerts** - System issues and high usage notifications

## 🔧 **Detailed Implementation Decisions**

### **Organization Creation Flow**
- ✅ **Create org first** - Configure Retell credentials later
- ✅ **Test connection feature** - Verify Retell API credentials
- ✅ **Auto-generated subdomains** - Editable by super admin
- ❌ **No custom domains** - Subdomains only (`client1.thecreativehorse.ca`)

### **Billing Display**
- ✅ **Usage format**: "Usage: 45mins" (no markup details)
- ✅ **Cost format**: "Cost: $90" (clean pricing)
- ✅ **Call history breakdown** - Same as current dashboard
- ✅ **Billing history/statements** - Historical billing data

### **Data Migration**
- ✅ **First organization**: "TheCreativeHorse"
- ✅ **Migrate current data** - 24 calls become first org's data
- ✅ **Template dashboard** - Use current UI as base

### **Super Admin Dashboard**
- ✅ **Total revenue** - Across all organizations
- ✅ **Usage patterns** - Peak hours, call volumes
- ✅ **Organization comparisons** - Performance metrics
- ✅ **System health** - Retell API status monitoring

### **Impersonation Mode**
- ✅ **Switch to any org** - Super admin can view any organization
- ✅ **Clear indicators** - Show impersonation mode status
- ✅ **Action logging** - Separate audit trail for impersonation
