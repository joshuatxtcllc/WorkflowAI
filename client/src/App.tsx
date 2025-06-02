import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "react-error-boundary";
import Login from "@/pages/Login";

// Simple dashboard placeholder to test
function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold">Dashboard Loaded Successfully!</h1>
      <p className="mt-4">The authentication and routing are working.</p>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route path="*" component={() => <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>} />
      ) : !isAuthenticated ? (
        <Route path="*" component={Login} />
      ) : (
        <Route path="*" component={SimpleDashboard} />
      )}
    </Switch>
  );
}

function ErrorFallback({error}: {error: Error}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">🚨 CRITICAL APPLICATION ERROR</h1>
        <p className="text-gray-300 mb-4">Enterprise system failure detected</p>
        <details className="text-left bg-gray-800 p-4 rounded">
          <summary className="cursor-pointer text-yellow-400">Error Details</summary>
          <pre className="text-red-400 text-sm mt-2">{error.message}</pre>
        </details>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-950 text-white">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;