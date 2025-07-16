import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import { ErrorBoundary } from "react-error-boundary";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { useIsMobile } from "./hooks/use-mobile";

import Dashboard from "./pages/Dashboard";
import QuickWins from "./pages/QuickWins";
import VendorOrders from "./pages/VendorOrders";
import Login from "./pages/Login";
import CustomerPortal from "./components/CustomerPortal";
import HubConnection from "./pages/HubConnection";
import POSIntegration from "./pages/POSIntegration";
import Progress from "./pages/Progress";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import ComprehensiveAnalytics from "./pages/ComprehensiveAnalytics";
import Schedule from "./pages/Schedule";
import TimeTracking from "./pages/TimeTracking";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import AdminPortal from './pages/AdminPortal';
import Diagnostics from './pages/Diagnostics';
import Invoices from "./pages/Invoices";
import NotFound from "./pages/not-found";
import { useEffect } from "react";
import RelaunchPlan from "./pages/RelaunchPlan";
import FramersAssistantIntegration from "./pages/FramersAssistantIntegration";
import LoadingScreen from "./components/LoadingScreen";
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppSidebar } from "./components/AppSidebar";

function App() {
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        fallbackRender={({ error }: { error: Error }) => (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-gray-600">{error.message}</p>
            </div>
          </div>
        )}
      >
        <TooltipProvider>
          <div className="flex flex-col min-h-screen bg-background">
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/customer-portal" component={CustomerPortal} />
              <Route>
                <AuthenticatedApp isMobile={isMobile.isMobile} />
              </Route>
            </Switch>
          </div>
          <Toaster />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function AuthenticatedApp({ isMobile }: { isMobile: boolean }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect to login if not authenticated - use useEffect before any early returns
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  // Redirect root to dashboard
  useEffect(() => {
    if (location === '/') {
      setLocation('/dashboard');
    }
  }, [location, setLocation]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-1">
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/orders" component={Orders} />
              <Route path="/customers" component={Customers} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/comprehensive-analytics" component={ComprehensiveAnalytics} />
              <Route path="/quick-wins" component={QuickWins} />
              <Route path="/relaunch" component={RelaunchPlan} />
              <Route path="/pos" component={POSIntegration} />
              <Route path="/framers-assistant" component={FramersAssistantIntegration} />
              <Route path="/hub" component={HubConnection} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/vendor-orders" component={VendorOrders} />
              <Route path="/diagnostics" component={Diagnostics} />
              <Route path="/schedule" component={Schedule} />
              <Route path="/time" component={TimeTracking} />
              <Route path="/progress" component={Progress} />
              <Route path="/reports" component={Reports} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/admin" component={AdminPortal} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}

export default App;