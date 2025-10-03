import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * API Error Boundary Component
 * Specialized error boundary for API/network errors
 * Provides retry logic and better error messages for API failures
 */
class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo);
    
    // Send error to Sentry (if configured)
    if (process.env.REACT_APP_SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag('errorBoundary', 'ApiErrorBoundary');
        scope.setLevel('error');
        scope.setContext('errorInfo', errorInfo);
        scope.setContext('retryCount', this.state.retryCount);
        scope.setContext('errorType', this.getErrorType(error));
        Sentry.captureException(error);
      });
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    // Wait a bit before retrying (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }));
  };

  getErrorType(error) {
    if (!error) return 'unknown';
    
    const errorString = error.toString().toLowerCase();

    if (errorString.includes('network') || errorString.includes('fetch')) {
      return 'network';
    }
    if (errorString.includes('401') || errorString.includes('unauthorized')) {
      return 'auth';
    }
    if (errorString.includes('403') || errorString.includes('forbidden')) {
      return 'permission';
    }
    if (errorString.includes('404') || errorString.includes('not found')) {
      return 'notfound';
    }
    if (errorString.includes('429') || errorString.includes('rate limit')) {
      return 'ratelimit';
    }
    if (errorString.includes('500') || errorString.includes('502') || errorString.includes('503')) {
      return 'server';
    }
    
    return 'unknown';
  }

  getErrorMessage(errorType) {
    const messages = {
      network: {
        title: 'Network Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        icon: '🔌'
      },
      auth: {
        title: 'Authentication Error',
        description: 'Your session may have expired. Please try logging in again.',
        icon: '🔐'
      },
      permission: {
        title: 'Access Denied',
        description: 'You don\'t have permission to access this resource.',
        icon: '🚫'
      },
      notfound: {
        title: 'Resource Not Found',
        description: 'The requested resource could not be found.',
        icon: '🔍'
      },
      ratelimit: {
        title: 'Too Many Requests',
        description: 'You\'ve made too many requests. Please wait a moment and try again.',
        icon: '⏱️'
      },
      server: {
        title: 'Server Error',
        description: 'The server encountered an error. Our team has been notified.',
        icon: '⚠️'
      },
      unknown: {
        title: 'Unexpected Error',
        description: 'Something went wrong. Please try again.',
        icon: '❌'
      }
    };

    return messages[errorType] || messages.unknown;
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount, isRetrying } = this.state;
      const errorType = this.getErrorType(error);
      const errorMessage = this.getErrorMessage(errorType);

      // For auth errors, redirect to login
      if (errorType === 'auth' && this.props.onAuthError) {
        setTimeout(() => this.props.onAuthError(), 2000);
      }

      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          margin: '20px'
        }}>
          {/* Error Icon */}
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            {errorMessage.icon}
          </div>

          {/* Error Title */}
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {errorMessage.title}
          </h2>

          {/* Error Description */}
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px'
          }}>
            {errorMessage.description}
          </p>

          {/* Retry Info */}
          {retryCount > 0 && (
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginBottom: '16px'
            }}>
              Retry attempt: {retryCount}
            </p>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleRetry}
              disabled={isRetrying}
              style={{
                backgroundColor: isRetrying ? '#9ca3af' : '#3b82f6',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                opacity: isRetrying ? 0.6 : 1
              }}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>

            {errorType === 'auth' && (
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Go to Login
              </button>
            )}
          </div>

          {/* Development Error Details */}
          {process.env.NODE_ENV === 'development' && error && (
            <details style={{
              marginTop: '24px',
              textAlign: 'left',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                Error Details (Dev)
              </summary>
              <pre style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#dc2626',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ApiErrorBoundary;

