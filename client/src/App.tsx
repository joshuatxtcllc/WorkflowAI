import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ErrorBoundary } from "react-error-boundary";
import {
  SidebarProvider,
} from "./components/ui/sidebar";
import { useIsMobile, useViewportHeight } from "./hooks/use-mobile";

// Import pages
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import Invoices from "./pages/Invoices";
import Schedule from "./pages/Schedule";
import TimeTracking from "./pages/TimeTracking";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import POSIntegration from "./pages/POSIntegration";
import NotFound from "./pages/not-found";

// Import components
import { AppSidebar } from "./components/AppSidebar";
import Header from "./components/Header";
import { MobileBottomNav } from "./components/MobileBottomNav";

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
        <p className="text-gray-400 text-sm">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-jade-500 text-black rounded hover:bg-jade-400"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const isMobile = useIsMobile();
  const viewportHeight = useViewportHeight();

  const AppLayout = ({ children }: { children: React.ReactNode }) => {
    if (isMobile) {
      return (
        <div 
          className="mobile-app-container overflow-hidden"
          style={{ height: viewportHeight }}
        >
          <Header />
          <main 
            className="mobile-content overflow-y-auto"
            style={{ 
              height: `${viewportHeight - 140}px`,
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            <div className="mobile-container">
              {children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      );
    }

    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  };

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/customers" component={Customers} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/time-tracking" component={TimeTracking} />
        <Route path="/reports" component={Reports} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/pos-integration" component={POSIntegration} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}