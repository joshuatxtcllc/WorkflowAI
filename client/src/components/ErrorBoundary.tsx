import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId: this.state.errorId,
          componentName: this.props.componentName,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (logError) {
      console.error('Failed to log error to service:', logError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal error UI for isolated components
      if (this.props.isolate) {
        return (
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Component Error</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {this.props.componentName || 'This component'} encountered an error
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetry}
              className="mt-2 h-7"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        );
      }

      // Full error page for major components
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>An unexpected error occurred in the application.</p>
                {this.props.componentName && (
                  <p className="mt-1">Component: {this.props.componentName}</p>
                )}
                <p className="mt-1">Error ID: {this.state.errorId}</p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-destructive font-medium">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex space-x-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  Reload Page
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                If this problem persists, please contact support with the Error ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specific error boundaries for different sections
export const FrameCatalogErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    componentName="Frame Catalog"
    isolate={true}
    fallback={
      <div className="p-6 text-center border border-dashed border-border rounded-lg">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="font-medium text-muted-foreground">Frame Catalog Unavailable</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Unable to load frame catalog. Please refresh to try again.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const PricingEngineErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    componentName="Pricing Engine"
    isolate={true}
    fallback={
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Pricing temporarily unavailable</span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
          Manual pricing may be required for this order.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const InventoryErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    componentName="Inventory Management"
    isolate={true}
    fallback={
      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
        <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Inventory system error</span>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
          Stock levels may not be current. Please verify manually.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;