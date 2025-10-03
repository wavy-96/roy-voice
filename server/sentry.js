const Sentry = require('@sentry/node');

// Initialize Sentry for backend
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // Lower sample rate in production
  debug: process.env.NODE_ENV === 'development',
  
  // Capture unhandled promise rejections
  integrations: [
    new Sentry.Integrations.OnUncaughtException({
      exitEvenIfOtherHandlersAreRegistered: false,
    }),
    new Sentry.Integrations.OnUnhandledRejection({
      mode: 'warn',
    }),
  ],
  
  // Filter out sensitive data
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request && event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }
    
    // Remove sensitive environment variables from context
    if (event.contexts && event.contexts.runtime) {
      delete event.contexts.runtime.env;
    }
    
    return event;
  },
  
  // Add user context when available
  beforeBreadcrumb(breadcrumb) {
    // Filter out sensitive breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      delete breadcrumb.data.authorization;
      delete breadcrumb.data.cookie;
    }
    return breadcrumb;
  },
});

// Export Sentry for use in other files
module.exports = Sentry;
