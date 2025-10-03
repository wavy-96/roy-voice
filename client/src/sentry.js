import * as Sentry from '@sentry/react';

// Initialize Sentry for frontend
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
  
  // Capture unhandled promise rejections
  integrations: [
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      sentry: true,
      xhr: true,
    }),
  ],
  
  // Filter out sensitive data
  beforeSend(event) {
    // Remove sensitive data from URLs
    if (event.request && event.request.url) {
      event.request.url = event.request.url.replace(/[?&]token=[^&]*/g, '&token=***');
      event.request.url = event.request.url.replace(/[?&]key=[^&]*/g, '&key=***');
    }
    
    // Remove sensitive data from user context
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    
    return event;
  },
  
  // Add user context when available
  beforeBreadcrumb(breadcrumb) {
    // Filter out sensitive breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      if (breadcrumb.data.url) {
        breadcrumb.data.url = breadcrumb.data.url.replace(/[?&]token=[^&]*/g, '&token=***');
      }
    }
    return breadcrumb;
  },
});

// Export Sentry for use in other files
export default Sentry;
