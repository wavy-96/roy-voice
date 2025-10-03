# Input Validation Documentation

## Overview

Comprehensive input validation is now implemented across all API endpoints using **Joi** validation library. This prevents injection attacks, data corruption, and provides clear error messages for API consumers.

## Validation Architecture

### Validation Middleware

All validation is handled by middleware functions that:
1. **Validate** incoming data against Joi schemas
2. **Sanitize** data by stripping unknown fields
3. **Convert** types when appropriate (e.g., string "50" → number 50)
4. **Return clear errors** with field-specific messages

### Middleware Order

```javascript
router.get('/calls', 
  validateMetricsQuery,    // 1. Validate first (fast fail)
  authMiddleware,          // 2. Then authenticate
  requireOrganizationAccess, // 3. Then authorize
  async (req, res) => {...}  // 4. Finally, handle request
);
```

**Why validation comes first:**
- Faster feedback for invalid requests
- Prevents wasting resources on malformed data
- Clear separation of concerns

## Validation Schemas

### 1. Organization Creation

**Endpoint**: `POST /api/organizations`

**Schema**:
```javascript
{
  name: string (2-100 chars, required),
  retell_api_key: string (pattern: /^key_[a-zA-Z0-9]+$/, required),
  retell_agent_id: string (pattern: /^agent_[a-zA-Z0-9]+$/, required),
  settings: {
    metrics_lookback_days: number (1-365, default: 30),
    timezone: string (max 50 chars, default: 'UTC'),
    currency: string (3 chars uppercase, default: 'USD')
  }
}
```

**Example Valid Request**:
```json
{
  "name": "Acme Corporation",
  "retell_api_key": "key_abc123def456",
  "retell_agent_id": "agent_xyz789"
}
```

**Example Error Response** (400):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Organization name must be at least 2 characters",
      "type": "string.min"
    },
    {
      "field": "retell_api_key",
      "message": "Retell API key must start with \"key_\"",
      "type": "string.pattern.base"
    }
  ]
}
```

### 2. Organization Update

**Endpoint**: `PUT /api/organizations/:orgId`

**Schema**:
```javascript
{
  name: string (2-100 chars, optional),
  retell_api_key: string (pattern: /^key_[a-zA-Z0-9]+$/, optional),
  retell_agent_id: string (pattern: /^agent_[a-zA-Z0-9]+$/, optional),
  settings: {
    metrics_lookback_days: number (1-365, optional),
    timezone: string (max 50 chars, optional),
    currency: string (3 chars uppercase, optional)
  }
}
```

**Requirements**:
- At least one field must be provided
- All fields are optional (partial updates supported)

### 3. Metrics Query Parameters

**Endpoints**: 
- `GET /api/multi-tenant/calls`
- `GET /api/multi-tenant/overview`

**Schema**:
```javascript
{
  from: ISO 8601 date (max: now, optional),
  to: ISO 8601 date (min: from, max: now, optional),
  limit: number (1-1000, default: 50),
  offset: number (min: 0, default: 0),
  organizationId: UUID (optional)
}
```

**Example Valid Request**:
```
GET /api/multi-tenant/calls?from=2024-01-01T00:00:00.000Z&to=2024-12-31T23:59:59.999Z&limit=100
```

**Validation Rules**:
- ✅ Dates must be in ISO 8601 format
- ✅ Dates cannot be in the future
- ✅ `to` date must be after `from` date
- ✅ `limit` capped at 1000 to prevent performance issues
- ✅ `organizationId` must be valid UUID

### 4. Webhook Validation

**Endpoint**: `POST /webhooks/retell`

**Schema**:
```javascript
{
  event: string (enum: ['call_started', 'call_ended', 'call_analyzed'], required),
  call_id: string (required),
  agent_id: string (optional),
  timestamp: ISO 8601 date (optional),
  data: object (required, allows unknown fields)
}
```

## Validation Features

### 1. Type Coercion

Joi automatically converts types when safe:

```javascript
// Query string: ?limit=50&offset=10
// Joi converts strings to numbers
req.query.limit  // 50 (number)
req.query.offset // 10 (number)
```

### 2. Unknown Field Stripping

Malicious or accidental extra fields are removed:

```javascript
// Request body:
{
  "name": "Test Org",
  "retell_api_key": "key_abc123",
  "retell_agent_id": "agent_xyz789",
  "malicious_field": "sql injection attempt",
  "another_unknown": "ignored"
}

// After validation (req.body):
{
  "name": "Test Org",
  "retell_api_key": "key_abc123",
  "retell_agent_id": "agent_xyz789"
}
```

### 3. Multiple Error Reporting

All validation errors are returned at once (not just the first one):

```javascript
{
  "error": "Validation failed",
  "details": [
    { "field": "name", "message": "Organization name must be at least 2 characters" },
    { "field": "retell_api_key", "message": "Retell API key must start with \"key_\"" },
    { "field": "retell_agent_id", "message": "Retell Agent ID must start with \"agent_\"" }
  ]
}
```

### 4. Custom Error Messages

Clear, user-friendly error messages:

```javascript
Joi.string()
  .min(2)
  .messages({
    'string.min': 'Organization name must be at least 2 characters',
    'any.required': 'Organization name is required'
  })
```

## Testing Validation

### Run the Test Suite

```bash
cd server
node scripts/test-validation.js
```

### Expected Results

```
✅ Accept valid organization data
✅ Reject missing name
✅ Reject invalid API key format
✅ Reject invalid agent ID format
✅ Reject name too short
✅ Strip unknown fields
✅ Accept valid update
✅ Reject empty update
✅ Reject invalid field in update
✅ Accept valid query params
✅ Reject limit too high
✅ Reject negative offset
✅ Reject invalid date format
✅ Reject future dates
✅ Reject invalid UUID
✅ Return multiple errors

16/16 tests passing
```

## Security Benefits

### 1. Injection Attack Prevention

**SQL Injection**:
```javascript
// Malicious input:
{ "name": "'; DROP TABLE calls; --" }

// Validation rejects (too many special chars or length)
// Even if it passes, parameterized queries prevent SQL injection
```

**NoSQL Injection**:
```javascript
// Malicious input:
{ "organizationId": { "$ne": null } }

// Validation rejects (must be UUID string)
```

### 2. Data Integrity

- Ensures only expected data types reach the database
- Prevents corrupt data from breaking application logic
- Maintains database schema integrity

### 3. Clear Error Messages

- Prevents information leakage (no stack traces or DB errors exposed)
- Guides API consumers to correct usage
- Improves developer experience

## Adding New Validation

### Step 1: Create Schema

Add to `server/middleware/validation.js`:

```javascript
const myNewSchema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().min(0).max(100).optional()
});
```

### Step 2: Create Middleware

```javascript
const validateMyNewEndpoint = validate(myNewSchema, 'body');

module.exports = {
  // ... existing exports
  validateMyNewEndpoint
};
```

### Step 3: Apply to Route

```javascript
const { validateMyNewEndpoint } = require('../middleware/validation');

router.post('/my-endpoint', validateMyNewEndpoint, async (req, res) => {
  // req.body is now validated and sanitized
});
```

### Step 4: Test

Add tests to `server/scripts/test-validation.js`:

```javascript
async function testMyNewValidation() {
  // Test valid data
  // Test invalid data
  // Test edge cases
}
```

## Common Patterns

### 1. UUID Validation

```javascript
Joi.string()
  .uuid()
  .required()
  .messages({
    'string.guid': 'ID must be a valid UUID'
  })
```

### 2. Date Range Validation

```javascript
Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date()
    .iso()
    .min(Joi.ref('from'))  // Must be after 'from'
    .required()
})
```

### 3. Enum Validation

```javascript
Joi.string()
  .valid('admin', 'viewer', 'editor')
  .required()
```

### 4. Conditional Validation

```javascript
Joi.object({
  type: Joi.string().valid('email', 'phone').required(),
  value: Joi.when('type', {
    is: 'email',
    then: Joi.string().email(),
    otherwise: Joi.string().pattern(/^\d{10}$/)
  })
})
```

## Performance Considerations

### Validation is Fast

- Joi validation typically takes < 1ms per request
- Validation prevents expensive downstream operations on invalid data
- Early rejection saves database queries and business logic execution

### Caching Schemas

Schemas are compiled once at startup, not per-request:

```javascript
// Good: Schema compiled once
const schema = Joi.object({...});

// Bad: Schema recompiled every request
router.post('/', (req, res) => {
  const schema = Joi.object({...}); // Don't do this!
});
```

## Troubleshooting

### Issue: Validation passing when it shouldn't

**Check**: Schema definition
```javascript
// Wrong: optional() allows empty values
field: Joi.string().optional()

// Right: required() enforces presence
field: Joi.string().required()
```

### Issue: Type coercion not working

**Check**: `convert` option
```javascript
validate(schema, 'query', {
  convert: true  // Enables type coercion
})
```

### Issue: Getting too many validation errors

**Check**: `abortEarly` option
```javascript
schema.validate(data, {
  abortEarly: false  // Return all errors (default in our setup)
  // abortEarly: true  // Stop at first error
})
```

## Best Practices

1. **Validate Early**: Apply validation before authentication when possible
2. **Be Specific**: Use precise patterns and ranges (not just "string" or "number")
3. **Custom Messages**: Provide clear, actionable error messages
4. **Strip Unknowns**: Always use `stripUnknown: true` to remove unexpected fields
5. **Test Thoroughly**: Test valid data, invalid data, edge cases, and boundary conditions
6. **Document Schemas**: Keep this documentation updated with schema changes

## Future Enhancements

- [ ] Generate OpenAPI/Swagger docs from Joi schemas
- [ ] Add validation for file uploads (size, type)
- [ ] Implement custom validators for business logic rules
- [ ] Add validation telemetry (track most common errors)
- [ ] Create validation schema versioning for API evolution

