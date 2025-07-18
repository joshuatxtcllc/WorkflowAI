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
import { useEffect, useState } from "react";
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
  const [forceLoaded, setForceLoaded] = useState(false);
  
  // Force loading to complete after 10 seconds as a safety mechanism
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('AuthenticatedApp: Force completing loading after timeout');
      setForceLoaded(true);
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Force desktop view for wider screens to ensure sidebar shows
  const isActuallyMobile = isMobile && window.innerWidth < 768;

  // Redirect to login if not authenticated - use useEffect before any early returns
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  // Redirect root to dashboard
  useEffect(() => {
    if (location === '/') {
      console.log('AuthenticatedApp: Redirecting from root to dashboard');
      setLocation('/dashboard');
    }
  }, [location, setLocation]);

  // Show loading while checking auth
  if (isLoading && !forceLoaded) {
    console.log('AuthenticatedApp: Still loading authentication...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <div className="text-sm text-gray-600">Loading Jay's Frames...</div>
          <div className="text-xs text-gray-500">If this takes too long, try refreshing the page</div>
        </div>
      </div>
    );
  }

  console.log('AuthenticatedApp: Authentication completed, user:', user?.email, 'location:', location);

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  const getPageTitle = () => {
    switch (location) {
      case '/dashboard': return 'Dashboard';
      case '/orders': return 'Orders';
      case '/customers': return 'Customers';
      case '/analytics': return 'Analytics';
      case '/notifications': return 'Notifications';
      default: return 'Jay\'s Frames';
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-1 flex-col">
        {isActuallyMobile && (
          <header className="mobile-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-jade-400 to-jade-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JF</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{getPageTitle()}</h1>
                  <p className="text-xs text-gray-400">Jay's Frames</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-300">{user?.firstName?.[0] || 'U'}</span>
                </div>
              </div>
            </div>
          </header>
        )}
        
        <div className="flex flex-1">
          {!isActuallyMobile && <AppSidebar />}
          <main className={`flex-1 flex flex-col ${isActuallyMobile ? 'mobile-content' : ''}`}>
            <div className={`flex-1 ${isActuallyMobile ? 'mobile-container' : 'p-4'}`}>
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
        </div>
        
        {isActuallyMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}

export default App;