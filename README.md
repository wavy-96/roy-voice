# Roy Voice - Multi-Tenant White-Label CRM for Retell AI

A production-ready, multi-tenant CRM system for managing Retell AI voice agents with complete data isolation, agent management, webhook validation, and billable call tracking.

![Version](https://img.shields.io/badge/version-2.9-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen)
![React](https://img.shields.io/badge/react-18.2-blue)

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18.x or higher
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### **Local Development Setup**

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/roy-voice.git
cd roy-voice

# 2. Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

cd client
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
# Run the SQL migrations in Supabase SQL Editor:
# - database/supabase_system_schema.sql
# - database/supabase_organization_functions.sql
# - database/add_performance_indexes.sql

# 5. Create initial organization and super admin
cd ../server
node scripts/setup-multi-tenant.js

# 6. Start development servers
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd client
npm start
```

Visit:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3002
- **Console**: http://localhost:3002/console

---

## 📦 Project Structure

```
roy-voice/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   └── App.js           # Main app
│   ├── public/              # Static assets
│   └── package.json
│
├── server/                    # Express backend
│   ├── middleware/           # Auth, rate limiting, validation
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── scripts/             # Utility scripts
│   └── index.js             # Server entry point
│
├── config/                   # Configuration
│   └── env.js               # Centralized env management
│
├── database/                # SQL migrations
│   ├── supabase_system_schema.sql
│   ├── supabase_organization_functions.sql
│   └── add_performance_indexes.sql
│
├── docs/                    # Documentation
│   ├── AGENT_CONFIGURATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── RATE_LIMITING.md
│   └── ...
│
└── scripts/                 # Deployment scripts
    └── setup-vercel-env.sh
```

---

## 🌟 Features

### **Core Functionality**
- ✅ Multi-tenant architecture with schema-level isolation
- ✅ Role-based access control (Super Admin, Org Admin, Org Viewer)
- ✅ Agent management with webhook validation
- ✅ Billable vs test call differentiation
- ✅ Real-time revenue tracking
- ✅ Organization management (CRUD)
- ✅ User management with org assignment

### **Performance & Security**
- ✅ 5-tier rate limiting system
- ✅ Input validation with Joi schemas
- ✅ JWT authentication
- ✅ Row Level Security (RLS)
- ✅ In-memory caching (60s TTL)
- ✅ Cursor-based pagination
- ✅ Connection pooling (PgBouncer)
- ✅ Error boundaries

### **Developer Experience**
- ✅ Comprehensive documentation
- ✅ Centralized configuration
- ✅ Automated environment setup
- ✅ Load testing scripts
- ✅ Test utilities

---

## 🔧 Technology Stack

### **Frontend**
- React 18
- Tailwind CSS
- Supabase JS Client
- Context API
- Fetch API

### **Backend**
- Node.js 18+
- Express.js
- JWT Authentication
- Joi Validation
- NodeCache
- Helmet Security

### **Database**
- Supabase (PostgreSQL 15)
- Row Level Security
- RPC Functions
- Connection Pooling

### **Infrastructure**
- Vercel (Serverless)
- GitHub
- Edge Network

---

## 🚀 Deployment

### **Backend Deployment**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Setup environment variables
./scripts/setup-vercel-env.sh

# 4. Deploy backend
vercel --prod

# Note your backend URL for frontend configuration
```

### **Frontend Deployment**

```bash
# 1. Update frontend environment variables
cd client
# Edit .env with your production backend URL
# REACT_APP_API_URL=https://your-backend.vercel.app

# 2. Deploy frontend
vercel --prod

# 3. Note your frontend URL
```

### **Post-Deployment**
- Update CORS settings in backend to allow frontend domain
- Test all API endpoints
- Verify webhook URLs
- Update Retell agent webhook configurations

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Complete system architecture |
| [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) | Environment configuration guide |
| [AGENT_CONFIGURATION.md](docs/AGENT_CONFIGURATION.md) | Agent setup and webhook validation |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Database structure |
| [RATE_LIMITING.md](docs/RATE_LIMITING.md) | Rate limiting details |
| [INPUT_VALIDATION.md](docs/INPUT_VALIDATION.md) | Validation rules |
| [WHITE_LABEL_CRM_SPEC.md](WHITE_LABEL_CRM_SPEC.md) | Product specification |
| [RETELL_MIGRATION.md](RETELL_MIGRATION.md) | Retell config migration guide |

---

## 🔑 Environment Variables

### **Backend (.env)**
```bash
# Required
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret

# Optional
PORT=3002
CONSOLE_USERNAME=admin
CONSOLE_PASSWORD=secure-password
PUBLIC_BASE_URL=http://localhost:3002
```

### **Frontend (client/.env)**
```bash
# Required
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=http://localhost:3002

# Optional
REACT_APP_NAME=Roy Voice CRM
REACT_APP_VERSION=2.9
```

---

## 🧪 Testing

```bash
# Backend tests
cd server

# Test billable call system
node scripts/test-billable-system.js

# Test rate limiting
node scripts/test-rate-limiting.js

# Test input validation
node scripts/test-validation.js

# Test pagination
node scripts/test-pagination.js

# Load testing
npm install -g artillery
artillery run artillery/load-test.yml
```

---

## 📊 API Endpoints

### **Authentication**
- `POST /api/login` - User login

### **Organizations**
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

### **Agents**
- `POST /api/agents` - Create agent
- `GET /api/organizations/:orgId/agents` - List agents
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/:id/validation` - Check validation status
- `PATCH /api/agents/:id/status` - Update agent status
- `DELETE /api/agents/:id` - Delete agent

### **Users**
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Metrics**
- `GET /api/multi-tenant/overview` - Organization overview
- `GET /api/multi-tenant/calls` - Organization calls

### **Webhooks**
- `POST /webhooks/agent/:id` - Agent-specific webhook

### **Utility**
- `GET /health` - Health check
- `GET /api/cache/stats` - Cache statistics

---

## 🔐 Security Features

- **Authentication**: JWT-based with role validation
- **Authorization**: Role-based access control (RBAC)
- **Data Isolation**: Separate PostgreSQL schema per organization
- **Rate Limiting**: 5-tier system (1000/15min to 3/hour)
- **Input Validation**: Joi schemas on all endpoints
- **CORS**: Configured for specific domains
- **Helmet**: Security headers
- **Encryption**: Sensitive data encrypted in database
- **RLS**: Row Level Security on all tables

---

## 🎯 Key Design Decisions

### **Multi-Tenancy via Schemas**
Complete data isolation using PostgreSQL schemas instead of row-level filtering.

### **Per-Agent Configuration**
Retell Agent IDs are configured per-agent (not in environment variables) for true multi-tenancy.

### **Serverless Architecture**
Deployed on Vercel for auto-scaling and global distribution.

### **Cursor-Based Pagination**
Efficient pagination for large datasets without OFFSET.

### **Centralized Configuration**
Single `config/env.js` works across all environments.

---

## 🐛 Troubleshooting

### **Backend not connecting to Supabase**
```bash
# Check environment variables
node -e "const config = require('./config/env'); console.log(config);"

# Verify Supabase credentials in dashboard
```

### **Frontend showing CORS errors**
```bash
# Update backend CORS settings in server/index.js
# Add your frontend domain to allowed origins
```

### **Webhook validation failing**
```bash
# Check webhook URL format
# Verify agent_id in Retell matches database
# Check server logs for webhook events
```

### **Database functions not working**
```bash
# Re-run migrations in Supabase SQL Editor
# Check function exists: SELECT * FROM pg_proc WHERE proname LIKE 'get_organization%';
```

---

## 📈 Performance Metrics

- **API Response Time**: 50-200ms (cached: <5ms)
- **Cache Hit Rate**: ~80%
- **Pagination**: Cursor-based (no performance degradation)
- **Concurrent Users**: Unlimited (serverless auto-scale)
- **Rate Limits**: Configurable per endpoint
- **Database Queries**: Optimized with indexes

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🔗 Links

- **Documentation**: [Full Docs](docs/)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Spec**: [WHITE_LABEL_CRM_SPEC.md](WHITE_LABEL_CRM_SPEC.md)
- **Supabase**: [supabase.com](https://supabase.com)
- **Vercel**: [vercel.com](https://vercel.com)
- **Retell AI**: [retellai.com](https://retellai.com)

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check documentation in `docs/` folder
- Review architecture diagrams in `ARCHITECTURE.md`

---

**Built with ❤️ for scalable voice AI applications**

**Version**: 2.9  
**Last Updated**: October 3, 2025
