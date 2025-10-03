# Rate Limiting Configuration

## Overview

Rate limiting is now implemented across all API endpoints to protect against abuse, ensure fair usage, and maintain system stability under load.

## Rate Limit Tiers

### 1. **General API Rate Limit** (`apiLimiter`)
- **Applies to**: All `/api/*` endpoints
- **Limit**: 100 requests per 15 minutes per IP
- **Window**: 15 minutes (sliding)
- **Use case**: Default protection for all API endpoints

### 2. **Health Check Rate Limit** (`healthCheckLimiter`)
- **Applies to**: `/health` endpoint
- **Limit**: 60 requests per minute per IP
- **Window**: 1 minute (sliding)
- **Use case**: Monitoring and health checks (lenient but not unlimited)

### 3. **Organization Creation Rate Limit** (`orgCreationLimiter`)
- **Applies to**: `/api/organizations` (POST)
- **Limit**: 10 organizations per hour per user
- **Window**: 1 hour (sliding)
- **Key**: User ID (for authenticated users) or IP address
- **Use case**: Prevents abuse of organization creation

### 4. **Authentication Rate Limit** (`authLimiter`)
- **Applies to**: Login endpoints (when implemented)
- **Limit**: 5 attempts per 15 minutes per IP
- **Window**: 15 minutes (sliding)
- **Skip**: Successful login attempts (only failed attempts count)
- **Use case**: Prevents brute force attacks

### 5. **Heavy Operation Rate Limit** (`heavyOperationLimiter`)
- **Applies to**: Future export/report endpoints
- **Limit**: 20 operations per hour per user
- **Window**: 1 hour (sliding)
- **Key**: User ID or IP address
- **Use case**: Expensive operations like CSV exports, large data queries

## Rate Limit Headers

All rate-limited responses include standard headers:

```
RateLimit-Limit: 100          # Maximum requests allowed in window
RateLimit-Remaining: 87       # Requests remaining in current window
RateLimit-Reset: 734          # Seconds until window resets
```

When rate limit is exceeded (429 response):

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Configuration

Rate limits are configured in `server/middleware/rate-limit.js`.

### Adjusting Limits

To change rate limits, modify the values in `rate-limit.js`:

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Adjust this number
  // ...
});
```

### Proxy Configuration

The server is configured to trust proxy headers for accurate IP detection:

```javascript
app.set('trust proxy', 1);
```

This is critical for:
- Ngrok tunneling
- Load balancers
- Reverse proxies

## Testing

Run the rate limiting test suite:

```bash
cd server
node scripts/test-rate-limiting.js
```

Expected results:
- ✅ Rate limit headers present
- ✅ Health check limit enforced at 60/minute
- ✅ API limit allows normal usage

## Best Practices

### 1. **Client-Side Handling**

Implement retry logic with exponential backoff:

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('RateLimit-Reset') || 60;
        console.warn(`Rate limited. Retrying in ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 2. **Monitor Rate Limit Headers**

Check remaining requests before making expensive operations:

```javascript
const remaining = parseInt(response.headers.get('RateLimit-Remaining'));
if (remaining < 10) {
  console.warn('Approaching rate limit, slowing down requests...');
}
```

### 3. **Use Authenticated Requests**

Some rate limiters (like `orgCreationLimiter`) use user ID instead of IP when authenticated, providing:
- Better tracking
- Per-user limits
- More accurate abuse detection

## Production Recommendations

### For High-Traffic Production:

1. **Increase API Limit**:
   ```javascript
   max: 500 // Instead of 100
   ```

2. **Use Redis Store** (for distributed systems):
   ```javascript
   const RedisStore = require('rate-limit-redis');
   const redis = require('redis');
   
   const client = redis.createClient();
   
   const apiLimiter = rateLimit({
     store: new RedisStore({ client }),
     windowMs: 15 * 60 * 1000,
     max: 500
   });
   ```

3. **Implement API Keys** with tiered limits:
   - Free tier: 100/15min
   - Pro tier: 1000/15min
   - Enterprise: 10000/15min

## Monitoring

### Log Rate Limit Events

```javascript
const apiLimiter = rateLimit({
  // ...
  handler: (req, res) => {
    console.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### Track Abuse

Monitor for patterns:
- Same IP hitting limits repeatedly
- Distributed attack patterns
- Unusual endpoint access

## Security Notes

1. **Trust Proxy**: Required for accurate IP detection behind ngrok/load balancers
2. **CORS Preflight**: OPTIONS requests are exempt from rate limiting
3. **Skip Successful Auth**: Login rate limiter only counts failed attempts
4. **User-Based Limits**: More secure than IP-based for authenticated endpoints

## Troubleshooting

### Issue: Rate limit hit immediately

**Cause**: Multiple browser tabs or services sharing same IP

**Solution**: Increase limits or implement user-based keying:
```javascript
keyGenerator: (req) => req.user?.id || req.ip
```

### Issue: Rate limit headers not appearing

**Cause**: `trust proxy` not configured

**Solution**: Add to server config:
```javascript
app.set('trust proxy', 1);
```

### Issue: All requests get same rate limit

**Cause**: All requests appear to come from same IP (proxy)

**Solution**: Configure proxy to forward real IP in headers

## Future Enhancements

- [ ] Redis-backed rate limiting for horizontal scaling
- [ ] Per-user tiered rate limits based on subscription
- [ ] API key-based rate limiting
- [ ] Rate limit dashboard in admin panel
- [ ] Automated abuse detection and blocking
- [ ] Whitelisting for trusted IPs
- [ ] Dynamic rate limits based on system load

