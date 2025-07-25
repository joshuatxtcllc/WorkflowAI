import { Route, Router } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { useAuth } from './hooks/useAuth';

// Pages

import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import SystemTest from './pages/SystemTest';
import EmergencyPayments from './pages/EmergencyPayments';
import CustomerPortal from './components/CustomerPortal';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-jade-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Always show the main app - remove authentication requirement temporarily
  // Skip loading and auth checks for immediate access
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-950 w-full overflow-auto">
            <Route path="/" component={() => { window.location.href = "/dashboard"; return null; }} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/orders" component={Orders} />
            <Route path="/customers" component={Customers} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/reports" component={Reports} />
            <Route path="/system-test" component={SystemTest} />
            <Route path="/emergency-payments" component={EmergencyPayments} />
            <Route path="/track/:trackingId?" component={CustomerPortal} />
            <Route path="/login" component={() => { window.location.href = "/dashboard"; return null; }} />
            <Route path="*" component={() => <div className="text-white p-8">Page not found</div>} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}