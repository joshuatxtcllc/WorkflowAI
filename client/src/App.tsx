import { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from './components/ui/sidebar';
import { Toaster } from './components/ui/toaster';
import { queryClient } from './lib/queryClient';
import { AppSidebar } from './components/AppSidebar';
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Schedule from './pages/Schedule';
import Invoices from './pages/Invoices';
import SystemTest from './pages/SystemTest';
import Diagnostics from './pages/Diagnostics';
import Progress from './pages/Progress';
import AdminPortal from './pages/AdminPortal';
import CustomerPortal from './components/CustomerPortal';
import NotFound from './pages/not-found';
import './index.css';

function App() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const loading = isLoading;
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Check for customer portal route
  const isCustomerPortal = location.startsWith('/track');
  const isPublicRoute = ['/', '/login', '/customer'].includes(location) || isCustomerPortal;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-jade-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Jay's Frames...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-950">
          <Switch>
            {/* Public Routes */}
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/track/:trackingId?" component={CustomerPortal} />
            
            {/* Protected Routes */}
            <Route path="/app/:path*">
              {isAuthenticated ? (
                <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <div className="flex min-h-screen">
                    <AppSidebar />
                    <main className="flex-1 bg-gray-50 dark:bg-gray-950">
                      <Switch>
                        <Route path="/app" component={Dashboard} />
                        <Route path="/app/dashboard" component={Dashboard} />
                        <Route path="/app/orders" component={Orders} />
                        <Route path="/app/customers" component={Customers} />
                        <Route path="/app/analytics" component={Analytics} />
                        <Route path="/app/reports" component={Reports} />
                        <Route path="/app/schedule" component={Schedule} />
                        <Route path="/app/invoices" component={Invoices} />
                        <Route path="/app/system" component={SystemTest} />
                        <Route path="/app/diagnostics" component={Diagnostics} />
                        <Route path="/app/progress" component={Progress} />
                        <Route path="/app/admin" component={AdminPortal} />
                        <Route component={NotFound} />
                      </Switch>
                    </main>
                  </div>
                </SidebarProvider>
              ) : (
                <Login />
              )}
            </Route>
            
            {/* Fallback */}
            <Route component={NotFound} />
          </Switch>
        </div>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;