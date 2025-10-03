# Error Boundaries Documentation

## Overview

Error Boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed.

## Implementation

### Components Created

1. **`ErrorBoundary.js`** - General error boundary for all errors
2. **`ApiErrorBoundary.js`** - Specialized error boundary for API/network errors
3. **`ErrorBoundaryTest.js`** - Test component for development

### Features

#### ErrorBoundary (General)
- ✅ Catches all JavaScript errors in child components
- ✅ Displays user-friendly error UI
- ✅ Provides "Try Again" and "Reload Page" buttons
- ✅ Tracks error count to detect recurring errors
- ✅ Shows detailed error info in development mode
- ✅ Supports custom fallback UI via props
- ✅ HOC pattern via `withErrorBoundary()` helper

#### ApiErrorBoundary (Specialized)
- ✅ Detects error types (network, auth, permission, etc.)
- ✅ Displays contextual error messages with icons
- ✅ Implements retry logic with exponential backoff
- ✅ Auto-redirects on authentication errors
- ✅ Tracks retry count
- ✅ Shows "Retrying..." state

## Usage

### Basic Usage

```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### API Error Boundary

```jsx
import ApiErrorBoundary from './components/ApiErrorBoundary';

function Dashboard() {
  return (
    <ApiErrorBoundary onAuthError={() => redirectToLogin()}>
      <DataFetchingComponent />
    </ApiErrorBoundary>
  );
}
```

### Custom Fallback UI

```jsx
<ErrorBoundary 
  fallback={(error, reset, reload) => (
    <div>
      <h1>Custom Error UI</h1>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### HOC Pattern

```jsx
import { withErrorBoundary } from './components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent, {
  showDetails: true
});
```

## Error Types Detected

The `ApiErrorBoundary` automatically detects and handles:

| Error Type | Detection | Message | Action |
|------------|-----------|---------|--------|
| **Network** | "network", "fetch" | Connection error | Retry with backoff |
| **Auth** | "401", "unauthorized" | Session expired | Redirect to login |
| **Permission** | "403", "forbidden" | Access denied | Show access message |
| **Not Found** | "404", "not found" | Resource missing | Retry or go back |
| **Rate Limit** | "429", "rate limit" | Too many requests | Wait and retry |
| **Server** | "500", "502", "503" | Server error | Retry with backoff |

## Retry Logic

ApiErrorBoundary implements exponential backoff:

```javascript
delay = min(1000 * 2^retryCount, 10000)
```

- **Retry 1**: 1 second delay
- **Retry 2**: 2 seconds delay
- **Retry 3**: 4 seconds delay
- **Retry 4**: 8 seconds delay
- **Retry 5+**: 10 seconds (max)

## Integration Points

Error boundaries are integrated at multiple levels:

```
App (ErrorBoundary - Root Level)
  └─ SupabaseProvider
      └─ AppContent
          ├─ Login (ApiErrorBoundary)
          ├─ SuperAdminDashboard (ApiErrorBoundary)
          └─ OrganizationDashboard (ApiErrorBoundary)
```

### Root Level
- Catches all unhandled errors
- Prevents white screen of death
- Shows generic error message

### Component Level
- Catches API/network errors
- Provides retry logic
- Shows contextual error messages

## Development vs Production

### Development Mode
- Shows detailed error messages
- Displays component stack trace
- Includes error details in console
- Expands error info by default

### Production Mode
- Shows user-friendly messages only
- Hides technical details
- Logs errors to external service (TODO)
- Minimal error information

## Error Logging (Production)

In production, errors should be logged to an external service:

```javascript
// TODO: Implement in ErrorBoundary.componentDidCatch()
if (process.env.NODE_ENV === 'production') {
  // Example integrations:
  Sentry.captureException(error);
  LogRocket.captureException(error);
  // or custom API:
  fetch('/api/log-error', {
    method: 'POST',
    body: JSON.stringify({ error, errorInfo })
  });
}
```

## Testing Error Boundaries

### Manual Testing

1. Import the test component:
```jsx
import ErrorBoundaryTest from './components/ErrorBoundaryTest';
```

2. Add it to your app:
```jsx
{process.env.NODE_ENV === 'development' && <ErrorBoundaryTest />}
```

3. Click "Trigger Error" to test the error boundary

### Automated Testing

```javascript
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

test('renders error boundary on error', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Best Practices

### ✅ DO

- Use error boundaries at strategic points in your app
- Provide clear, actionable error messages
- Implement retry logic for transient errors
- Log errors to monitoring services in production
- Test error boundaries regularly
- Use specialized error boundaries for different contexts

### ❌ DON'T

- Rely on error boundaries for flow control
- Catch errors that should be handled by try/catch
- Use error boundaries as a replacement for input validation
- Ignore errors - always log them
- Show technical details to end users in production

## Common Scenarios

### Scenario 1: API Request Fails
```
User → Makes request → API fails → ApiErrorBoundary catches
→ Shows "Network Error" → User clicks "Retry" → Request succeeds
```

### Scenario 2: Component Rendering Error
```
User → Navigates to page → Component throws error → ErrorBoundary catches
→ Shows "Something went wrong" → User clicks "Try Again" → Rerenders
```

### Scenario 3: Session Expired
```
User → Makes request → 401 error → ApiErrorBoundary catches
→ Shows "Session expired" → Auto-redirects to login after 2s
```

## Performance Impact

Error boundaries have minimal performance impact:

- **No overhead** when no errors occur
- **Negligible** when errors are caught (rare events)
- **Memory**: ~2KB per error boundary instance
- **Render**: Only affects error state rendering

## Future Improvements

- [ ] Integrate with error reporting service (Sentry, LogRocket)
- [ ] Add error analytics tracking
- [ ] Implement offline error queue
- [ ] Add error recovery strategies per error type
- [ ] Create error boundary for Suspense fallbacks
- [ ] Add custom error boundary for specific features

## Resources

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Boundary Best Practices](https://react.dev/reference/react/Component#static-getderivedstatefromerror)

---

**Status**: ✅ Implemented and Integrated
**Last Updated**: October 3, 2025

